const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Deliverable instance schema validation
const DeliverableInstanceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Deliverable title is required'),
  description: z.string().optional().default(''),
  quantity: z.number().min(0).default(1),
  unit: z.string().default('unit'),
  rate: z.number().min(0).default(0),
  estimatedHours: z.number().min(0).default(0),
  status: z.enum(['pending', 'in-progress', 'completed', 'approved']).default('pending'),
  completedAt: z.string().nullable().optional().default(null),
  approvedBy: z.string().nullable().optional().default(null),
});

// Scope schema validation
const ScopeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().default(''),
  projectId: z.string().nullable().optional().default(null),
  clientId: z.string().nullable().optional().default(null),
  templateId: z.string().nullable().optional().default(null),
  deliverables: z.array(DeliverableInstanceSchema).optional().default([]),
  terms: z.string().optional().default(''),
  status: z.enum(['draft', 'sent', 'approved', 'revised']).default('draft'),
});

// Update schema - all fields optional
const ScopeUpdateSchema = ScopeSchema.partial();

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  logger.debug(`Processing ${event.httpMethod} request for scopes`);

  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:scopes']
        : ['write:scopes']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }

  // Use userId and teamId from the authentication context
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  // Extract scope ID from path if available
  const pathParts = event.path.split('/');
  const scopesIndex = pathParts.indexOf('scopes');
  let specificScopeId = null;
  if (scopesIndex !== -1 && pathParts.length > scopesIndex + 1) {
    const potentialId = pathParts[scopesIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificScopeId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const scopesCollection = db.collection('scopes');

    // GET: Fetch scopes (either all for a team or a specific scope)
    if (event.httpMethod === 'GET') {
      // If requesting a specific scope
      if (specificScopeId) {
        logger.debug(`Fetching specific scope: ${specificScopeId}`);
        try {
          const scope = await scopesCollection.findOne({
            _id: new ObjectId(specificScopeId),
            teamId: teamId,
            deletedAt: null
          });

          if (!scope) {
            logger.error(`Scope ${specificScopeId} not found`);
            return createErrorResponse(404, 'Scope not found');
          }

          // Return the scope with id instead of _id
          scope.id = scope._id.toString();
          delete scope._id;

          return createResponse(200, scope);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid scope ID format');
          }
          throw error; // Let the main catch block handle it
        }
      }
      // Otherwise, fetch all scopes for the authenticated team
      else {
        const qp = event.queryStringParameters || {};
        const query = { teamId, deletedAt: null };
        const formatResource = r => { r.id = r._id.toString(); delete r._id; return r; };

        // Apply optional filters
        if (qp.projectId) query.projectId = qp.projectId;
        if (qp.clientId) query.clientId = qp.clientId;
        if (qp.status) query.status = qp.status;

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [scopes, total] = await Promise.all([
            scopesCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            scopesCollection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(scopes.map(formatResource), total, page, limit));
        }

        const scopes = await scopesCollection.find(query).sort({ createdAt: -1 }).toArray();
        return createResponse(200, scopes.map(formatResource));
      }
    }

    // POST: Create a new scope
    else if (event.httpMethod === 'POST') {
      logger.debug('Creating a new scope');

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // If templateId is provided, copy from scope template
      if (data.templateId) {
        logger.debug(`Creating scope from template: ${data.templateId}`);
        const templatesCollection = db.collection('scopeTemplates');
        try {
          const template = await templatesCollection.findOne({
            _id: new ObjectId(data.templateId),
            teamId: teamId
          });

          if (template) {
            // Copy template fields as defaults, allow overrides from data
            if (!data.title) data.title = template.title || '';
            if (!data.description) data.description = template.description || '';
            if (!data.terms) data.terms = template.terms || '';
            if (!data.deliverables || data.deliverables.length === 0) {
              data.deliverables = (template.deliverables || []).map(d => ({
                ...d,
                status: 'pending',
                completedAt: null,
                approvedBy: null,
              }));
            }
          } else {
            logger.error(`Template ${data.templateId} not found`);
            return createErrorResponse(404, 'Scope template not found');
          }
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid template ID format');
          }
          throw error;
        }
      }

      // Validate data
      const validationResult = ScopeSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Generate IDs for deliverables that don't have them
      validatedData.deliverables = validatedData.deliverables.map(d => ({
        ...d,
        id: d.id || new ObjectId().toString(),
      }));

      // Compute totalAmount from deliverables
      const totalAmount = validatedData.deliverables.reduce((sum, d) => sum + (d.quantity * d.rate), 0);

      // Add metadata and ensure teamId
      const newScope = {
        ...validatedData,
        totalAmount,
        teamId: teamId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      logger.debug('Creating scope:', newScope);
      const result = await scopesCollection.insertOne(newScope);

      // Get the newly created scope
      const createdScope = await scopesCollection.findOne({ _id: result.insertedId });
      createdScope.id = createdScope._id.toString();
      delete createdScope._id;

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'scope', resourceId: result.insertedId.toString() });

      return createResponse(201, createdScope);
    }

    // PUT: Update an existing scope
    else if (event.httpMethod === 'PUT' && specificScopeId) {
      logger.debug(`Updating scope: ${specificScopeId}`);

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = ScopeUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Find the scope to check if it exists and belongs to the user's team
      const scopeExists = await scopesCollection.findOne({
        _id: new ObjectId(specificScopeId),
        teamId: teamId,
        deletedAt: null
      });

      if (!scopeExists) {
        logger.error(`Scope ${specificScopeId} not found`);
        return createErrorResponse(404, 'Scope not found');
      }

      // Generate IDs for deliverables that don't have them
      if (validatedData.deliverables) {
        validatedData.deliverables = validatedData.deliverables.map(d => ({
          ...d,
          id: d.id || new ObjectId().toString(),
        }));
      }

      // Compute totalAmount if deliverables are provided
      const deliverables = validatedData.deliverables || scopeExists.deliverables || [];
      const totalAmount = deliverables.reduce((sum, d) => sum + (d.quantity * d.rate), 0);

      // Prepare update data (don't allow changing teamId or createdBy)
      const updateData = {
        ...validatedData,
        totalAmount,
        updatedAt: new Date(),
        updatedBy: userId
      };

      // Handle status transitions
      if (validatedData.status && validatedData.status !== scopeExists.status) {
        if (validatedData.status === 'sent') {
          updateData.sentAt = new Date().toISOString();
        }
        if (validatedData.status === 'approved') {
          updateData.approvedAt = new Date().toISOString();
        }
      }

      // Remove fields that should not be updated
      delete updateData._id;
      delete updateData.id;
      delete updateData.teamId;
      delete updateData.createdBy;
      delete updateData.createdAt;
      delete updateData.deletedAt;
      delete updateData.deletedBy;

      // Update the scope
      const result = await scopesCollection.updateOne(
        { _id: new ObjectId(specificScopeId), teamId: teamId },
        { $set: updateData }
      );

      // Get the updated scope
      const updatedScope = await scopesCollection.findOne({ _id: new ObjectId(specificScopeId), teamId: teamId });
      updatedScope.id = updatedScope._id.toString();
      delete updatedScope._id;

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'scope', resourceId: specificScopeId });

      return createResponse(200, updatedScope);
    }

    // DELETE: Soft delete an existing scope
    else if (event.httpMethod === 'DELETE' && specificScopeId) {
      logger.debug(`Soft deleting scope: ${specificScopeId}`);

      // Check if the scope exists and belongs to the user's team
      const scopeExists = await scopesCollection.findOne({
        _id: new ObjectId(specificScopeId),
        teamId: teamId,
        deletedAt: null
      });

      if (!scopeExists) {
        logger.error(`Scope ${specificScopeId} not found`);
        return createErrorResponse(404, 'Scope not found');
      }

      // Soft delete the scope
      await scopesCollection.updateOne(
        { _id: new ObjectId(specificScopeId), teamId: teamId },
        { $set: { deletedAt: new Date().toISOString(), deletedBy: userId } }
      );

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'scope', resourceId: specificScopeId });

      return createResponse(200, { message: 'Scope deleted successfully' });
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
