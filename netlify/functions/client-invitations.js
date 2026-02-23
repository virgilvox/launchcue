const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate, requireRole, generateJti, TOKEN_EXPIRY } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Invitation schema validation
const InvitationSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  projectIds: z.array(z.string()).min(1, 'At least one project is required'),
  email: z.string().email('Valid email required'),
  name: z.string().min(1, 'Name is required').max(100),
});

// Update schema - partial for PUT
const InvitationUpdateSchema = z.object({
  projectIds: z.array(z.string()).min(1, 'At least one project is required').optional(),
  name: z.string().min(1).max(100).optional(),
  resend: z.boolean().optional(),
});

// Password schema matching registration rules
const PasswordSchema = z.string()
  .min(10, 'Password must be at least 10 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Accept invitation schema
const AcceptSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: PasswordSchema,
});

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  logger.debug(`Processing ${event.httpMethod} request for client-invitations`);

  const qp = event.queryStringParameters || {};

  // --- Accept invitation (unauthenticated) ---
  if (event.httpMethod === 'POST' && qp.action === 'accept') {
    const rateLimited = await rateLimitCheck(event, 'auth');
    if (rateLimited) return rateLimited;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('Missing JWT_SECRET environment variable');
      return createErrorResponse(500, 'Internal Server Error', 'JWT secret configuration missing.');
    }

    try {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      const validationResult = AcceptSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const { token, password } = validationResult.data;
      const tokenPrefix = token.substring(0, 8);

      const { db } = await connectToDb();
      const invitationsCollection = db.collection('clientInvitations');
      const usersCollection = db.collection('users');
      const teamsCollection = db.collection('teams');

      // Find invitation by token prefix
      const invitation = await invitationsCollection.findOne({
        tokenPrefix,
        status: 'pending',
      });

      if (!invitation) {
        return createErrorResponse(404, 'Invitation not found or already used');
      }

      // Check expiration
      if (new Date() > new Date(invitation.expiresAt)) {
        return createErrorResponse(410, 'Invitation has expired');
      }

      // Verify token with bcrypt
      const isValidToken = await bcrypt.compare(token, invitation.tokenHash);
      if (!isValidToken) {
        return createErrorResponse(401, 'Invalid invitation token');
      }

      // Check if user already exists
      let user = await usersCollection.findOne({ email: invitation.email.toLowerCase() });
      let userId;

      if (user) {
        userId = user._id.toString();

        // Add client role to existing user's team membership if not already present
        const team = await teamsCollection.findOne({ _id: new ObjectId(invitation.teamId) });
        if (team) {
          const existingMember = team.members.find(m => m.userId === userId);
          if (!existingMember) {
            await teamsCollection.updateOne(
              { _id: new ObjectId(invitation.teamId) },
              {
                $push: {
                  members: {
                    userId,
                    email: user.email,
                    name: user.name,
                    role: 'client',
                    projectIds: invitation.projectIds,
                    joinedAt: new Date(),
                  },
                },
              }
            );
          }
        }
      } else {
        // Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const now = new Date();
        const newUser = {
          name: invitation.name,
          email: invitation.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        };

        const userResult = await usersCollection.insertOne(newUser);
        userId = userResult.insertedId.toString();

        // Add user to team as client
        await teamsCollection.updateOne(
          { _id: new ObjectId(invitation.teamId) },
          {
            $push: {
              members: {
                userId,
                email: newUser.email,
                name: newUser.name,
                role: 'client',
                projectIds: invitation.projectIds,
                joinedAt: now,
              },
            },
          }
        );
      }

      // Update invitation status
      await invitationsCollection.updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedByUserId: userId,
            updatedAt: new Date(),
          },
        }
      );

      // Generate JWT
      const payload = {
        userId,
        teamId: invitation.teamId,
        role: 'client',
        projectIds: invitation.projectIds,
        email: invitation.email.toLowerCase(),
        name: invitation.name,
        jti: generateJti(),
      };

      const authToken = jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });

      await createAuditLog(db, {
        userId,
        teamId: invitation.teamId,
        action: 'create',
        resourceType: 'clientInvitationAccept',
        resourceId: invitation._id.toString(),
      });

      return createResponse(200, {
        token: authToken,
        user: {
          id: userId,
          email: invitation.email.toLowerCase(),
          name: invitation.name,
          role: 'client',
        },
        currentTeamId: invitation.teamId,
        projectIds: invitation.projectIds,
      });
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
      return createErrorResponse(500, 'Internal Server Error', safeDetails);
    }
  }

  // --- Authenticated endpoints ---
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:clients']
        : ['write:clients']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }

  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  // Only team members (owner, admin, member) can manage invitations — not viewers
  try {
    requireRole(authContext, ['owner', 'admin', 'member']);
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(403, 'Insufficient permissions');
  }

  // Extract invitation ID from path
  const pathParts = event.path.split('/');
  const invitationsIndex = pathParts.indexOf('client-invitations');
  let specificInvitationId = null;
  if (invitationsIndex !== -1 && pathParts.length > invitationsIndex + 1) {
    const potentialId = pathParts[invitationsIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificInvitationId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const invitationsCollection = db.collection('clientInvitations');

    // GET: Fetch invitations
    if (event.httpMethod === 'GET') {
      // If requesting a specific invitation
      if (specificInvitationId) {
        logger.debug(`Fetching specific invitation: ${specificInvitationId}`);
        try {
          const invitation = await invitationsCollection.findOne({
            _id: new ObjectId(specificInvitationId),
            teamId: teamId,
          });

          if (!invitation) {
            logger.error(`Invitation ${specificInvitationId} not found`);
            return createErrorResponse(404, 'Invitation not found');
          }

          invitation.id = invitation._id.toString();
          delete invitation._id;
          // Never expose tokenHash or tokenPrefix in GET responses
          delete invitation.tokenHash;
          delete invitation.tokenPrefix;

          return createResponse(200, invitation);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid invitation ID format');
          }
          throw error;
        }
      }
      // Otherwise, fetch all invitations for the team
      else {
        const query = { teamId };

        // Optionally filter by clientId
        if (qp.clientId) {
          query.clientId = qp.clientId;
        }

        const invitations = await invitationsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        const formatted = invitations.map(inv => {
          inv.id = inv._id.toString();
          delete inv._id;
          delete inv.tokenHash;
          delete inv.tokenPrefix;
          return inv;
        });

        return createResponse(200, formatted);
      }
    }

    // POST: Create a new invitation
    else if (event.httpMethod === 'POST') {
      logger.debug('Creating a new client invitation');

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = InvitationSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Verify the client exists and belongs to this team
      const client = await db.collection('clients').findOne({
        _id: new ObjectId(validatedData.clientId),
        teamId: teamId,
      });

      if (!client) {
        return createErrorResponse(404, 'Client not found or does not belong to this team');
      }

      // Check for existing pending invitation for this email + clientId
      const existingInvitation = await invitationsCollection.findOne({
        email: validatedData.email.toLowerCase(),
        clientId: validatedData.clientId,
        status: 'pending',
      });

      if (existingInvitation) {
        return createErrorResponse(409, 'A pending invitation already exists for this email and client');
      }

      // Generate invite token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(rawToken, 10);

      const newInvitation = {
        teamId,
        clientId: validatedData.clientId,
        projectIds: validatedData.projectIds,
        email: validatedData.email.toLowerCase(),
        name: validatedData.name,
        role: 'client',
        invitedBy: userId,
        tokenHash: hashedToken,
        tokenPrefix: rawToken.substring(0, 8),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.debug('Creating invitation:', { ...newInvitation, tokenHash: '[REDACTED]' });
      const result = await invitationsCollection.insertOne(newInvitation);

      // Get the created invitation for response
      const createdInvitation = await invitationsCollection.findOne({ _id: result.insertedId });
      createdInvitation.id = createdInvitation._id.toString();
      delete createdInvitation._id;
      delete createdInvitation.tokenHash;
      delete createdInvitation.tokenPrefix;

      await createAuditLog(db, {
        userId,
        teamId,
        action: 'create',
        resourceType: 'clientInvitation',
        resourceId: result.insertedId.toString(),
      });

      // Return the invitation with the raw token (only time it's visible)
      return createResponse(201, { ...createdInvitation, token: rawToken });
    }

    // PUT: Update/resend an invitation
    else if (event.httpMethod === 'PUT' && specificInvitationId) {
      logger.debug(`Updating invitation: ${specificInvitationId}`);

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = InvitationUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Check invitation exists and belongs to this team
      const existingInvitation = await invitationsCollection.findOne({
        _id: new ObjectId(specificInvitationId),
        teamId: teamId,
      });

      if (!existingInvitation) {
        logger.error(`Invitation ${specificInvitationId} not found`);
        return createErrorResponse(404, 'Invitation not found');
      }

      if (existingInvitation.status !== 'pending') {
        return createErrorResponse(400, 'Only pending invitations can be updated');
      }

      const updateData = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Update projectIds if provided
      if (validatedData.projectIds) {
        updateData.projectIds = validatedData.projectIds;
      }

      // Update name if provided
      if (validatedData.name) {
        updateData.name = validatedData.name;
      }

      // Resend: regenerate token and extend expiry
      let newRawToken = null;
      if (validatedData.resend) {
        newRawToken = crypto.randomBytes(32).toString('hex');
        const newHashedToken = await bcrypt.hash(newRawToken, 10);
        updateData.tokenHash = newHashedToken;
        updateData.tokenPrefix = newRawToken.substring(0, 8);
        updateData.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      await invitationsCollection.updateOne(
        { _id: new ObjectId(specificInvitationId), teamId: teamId },
        { $set: updateData }
      );

      // Get the updated invitation
      const updatedInvitation = await invitationsCollection.findOne({
        _id: new ObjectId(specificInvitationId),
      });
      updatedInvitation.id = updatedInvitation._id.toString();
      delete updatedInvitation._id;
      delete updatedInvitation.tokenHash;
      delete updatedInvitation.tokenPrefix;

      await createAuditLog(db, {
        userId,
        teamId,
        action: 'update',
        resourceType: 'clientInvitation',
        resourceId: specificInvitationId,
      });

      // If resending, include the new raw token (only time it's visible)
      const responseBody = newRawToken
        ? { ...updatedInvitation, token: newRawToken }
        : updatedInvitation;

      return createResponse(200, responseBody);
    }

    // DELETE: Hard delete an invitation
    else if (event.httpMethod === 'DELETE' && specificInvitationId) {
      logger.debug(`Deleting invitation: ${specificInvitationId}`);

      // Check invitation exists and belongs to this team
      const existingInvitation = await invitationsCollection.findOne({
        _id: new ObjectId(specificInvitationId),
        teamId: teamId,
      });

      if (!existingInvitation) {
        logger.error(`Invitation ${specificInvitationId} not found`);
        return createErrorResponse(404, 'Invitation not found');
      }

      await invitationsCollection.deleteOne({
        _id: new ObjectId(specificInvitationId),
        teamId: teamId,
      });

      await createAuditLog(db, {
        userId,
        teamId,
        action: 'delete',
        resourceType: 'clientInvitation',
        resourceId: specificInvitationId,
      });

      return createResponse(200, { message: 'Invitation deleted successfully' });
    }

    // Unsupported method
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error processing request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
