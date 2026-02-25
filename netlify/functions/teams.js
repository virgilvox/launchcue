const { MongoClient, ObjectId } = require('mongodb');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { authenticate, requireRole } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { createAuditLog } = require('./utils/auditLog');
const logger = require('./utils/logger');
const { notDeleted, softDelete } = require('./utils/softDelete');

const TeamCreateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

const TeamInviteSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const RoleUpdateSchema = z.object({
  memberId: z.string().min(1, 'memberId is required'),
  newRole: z.enum(['owner', 'admin', 'member', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role. Must be one of: owner, admin, member, viewer' }),
  }),
});

const TeamUpdateSchema = z.object({
  name: z.string().min(1, 'Team name is required for update').max(100),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Add debug logging
  logger.debug("Teams handler received request:", {
    method: event.httpMethod,
    path: event.path,
    queryParams: event.queryStringParameters,
    bodySize: event.body ? event.body.length : 0,
    headers: Object.keys(event.headers)
  });

  let authContext;
  try {
    // Use the new unified authentication method with scope checking
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:teams'] 
        : ['write:teams']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  
  // Use userId and teamId from the authentication context
  const { userId, teamId } = authContext;

  // Check for action parameter
  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action;
  const targetTeamId = queryParams.id || null;

  // Extract target team ID from path if provided (e.g., /teams/{teamId})
  let pathTeamId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2 && ObjectId.isValid(pathParts[pathParts.length - 1])) {
      pathTeamId = pathParts[pathParts.length - 1];
  }

  // Use targetTeamId from query param if provided, otherwise try path
  const effectiveTeamId = targetTeamId || pathTeamId;

  try {
    const { db } = await connectToDb();
    const teamsCollection = db.collection('teams');
    const usersCollection = db.collection('users');

    // Handle action=invite - Invite a user to the team
    if (event.httpMethod === 'POST' && action === 'invite' && effectiveTeamId) {
        const data = JSON.parse(event.body);
        const inviteValidation = TeamInviteSchema.safeParse(data);
        if (!inviteValidation.success) {
            return createErrorResponse(400, 'Validation failed', inviteValidation.error.format());
        }
        
        // Only owner or admin can invite members
        requireRole(authContext, ['owner', 'admin']);

        const team = await teamsCollection.findOne({
            _id: new ObjectId(effectiveTeamId),
            'members.userId': userId
        });

        if (!team) {
            return createErrorResponse(404, 'Team not found or user is not a member');
        }
        
        // Check if email is already a member
        const isMember = team.members.some(m => m.email && m.email.toLowerCase() === data.email.toLowerCase());
        if (isMember) {
            return createErrorResponse(400, 'This user is already a member of the team');
        }
        
        // Find user by email
        const userToAdd = await usersCollection.findOne({ email: data.email.toLowerCase() });
        
        if (!userToAdd) {
            return createErrorResponse(404, 'User with this email not found. Please ensure they have an account first.');
        }
        
        // Directly add user to team (instead of creating an invite)
        const now = new Date();
        const newMember = {
            userId: userToAdd._id.toString(),
            email: userToAdd.email,
            name: userToAdd.name || userToAdd.email.split('@')[0],
            role: 'member',
            joinedAt: now
        };
        
        // Add member to team
        await teamsCollection.updateOne(
            { _id: new ObjectId(effectiveTeamId) },
            { $push: { members: newMember } }
        );
        
        await createAuditLog(db, {
            userId, teamId: effectiveTeamId, action: 'create',
            resourceType: 'teamMember', resourceId: userToAdd._id.toString(),
            changes: { email: { to: data.email }, role: { to: 'member' } }
        });

        return createResponse(200, {
            message: 'User added to team successfully',
            member: newMember
        });
    }

    // PUT: Update a member's role (action=updateRole)
    else if (event.httpMethod === 'PUT' && action === 'updateRole' && effectiveTeamId) {
        const data = JSON.parse(event.body);
        const roleValidation = RoleUpdateSchema.safeParse(data);
        if (!roleValidation.success) {
            return createErrorResponse(400, 'Validation failed', roleValidation.error.format());
        }
        const { memberId, newRole } = roleValidation.data;

        // Only owner or admin can change roles
        requireRole(authContext, ['owner', 'admin']);

        // Cannot change your own role
        if (memberId === userId) {
            return createErrorResponse(400, 'You cannot change your own role');
        }

        const team = await teamsCollection.findOne({
            _id: new ObjectId(effectiveTeamId),
            'members.userId': userId
        });

        if (!team) {
            return createErrorResponse(404, 'Team not found or user is not a member');
        }

        const currentUserMember = team.members.find(m => m.userId === userId);
        const targetMember = team.members.find(m => m.userId === memberId);

        if (!targetMember) {
            return createErrorResponse(404, 'Target member not found in this team');
        }

        // Only owner can promote someone to admin or owner
        if ((newRole === 'admin' || newRole === 'owner') && currentUserMember.role !== 'owner') {
            return createErrorResponse(403, 'Only team owners can promote members to admin or owner');
        }

        // Cannot demote the last owner
        if (targetMember.role === 'owner' && newRole !== 'owner') {
            const ownerCount = team.members.filter(m => m.role === 'owner').length;
            if (ownerCount <= 1) {
                return createErrorResponse(400, 'Cannot demote the last owner. Promote another member to owner first.');
            }
        }

        // Admins cannot change the role of other admins or owners
        if (currentUserMember.role === 'admin' && (targetMember.role === 'admin' || targetMember.role === 'owner')) {
            return createErrorResponse(403, 'Admins cannot change the role of other admins or owners');
        }

        await teamsCollection.updateOne(
            { _id: new ObjectId(effectiveTeamId), 'members.userId': memberId },
            { $set: { 'members.$.role': newRole, updatedAt: new Date() } }
        );

        await createAuditLog(db, {
            userId, teamId: effectiveTeamId, action: 'update',
            resourceType: 'teamMember', resourceId: memberId,
            changes: { role: { from: targetMember.role, to: newRole } }
        });

        return createResponse(200, {
            message: `Member role updated to ${newRole}`,
            memberId,
            newRole
        });
    }

    // GET: List teams the user is a member of OR Get specific team details
    else if (event.httpMethod === 'GET') {
        if (effectiveTeamId) {
            // Get specific team details if user is a member
            const team = await teamsCollection.findOne({
                _id: new ObjectId(effectiveTeamId),
                'members.userId': userId // Ensure the requesting user is a member
            });

            if (!team) {
                return createErrorResponse(404, 'Team not found or user is not a member');
            }

            // Populate member details (optional, adjust based on needs)
            const memberIds = team.members.map(m => new ObjectId(m.userId));
            const memberDetails = await usersCollection.find({ _id: { $in: memberIds } }, { projection: { password: 0 } }).toArray(); // Exclude passwords
            const memberMap = memberDetails.reduce((map, user) => {
                map[user._id.toString()] = { id: user._id.toString(), name: user.name, email: user.email };
                return map;
            }, {});

            team.members = team.members.map(m => ({ ...m, ...memberMap[m.userId] }));

            // *** FIX: Check if the action is specifically to get members ***
            if (action === 'members') {
              return createResponse(200, team.members || []); // Return ONLY the members array
            } else {
              // Otherwise, return the full team object
              team.id = team._id.toString();
              delete team._id;
              return createResponse(200, team);
            }
        } else {
            // List all teams the user is a member of
            const teams = await teamsCollection.find({ 'members.userId': userId }).toArray();
            const formattedTeams = teams.map(t => ({ ...t, id: t._id.toString(), _id: undefined }));
            return createResponse(200, formattedTeams);
        }
    }

    // POST: Create a new team
    else if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const createValidation = TeamCreateSchema.safeParse(data);
      if (!createValidation.success) {
        return createErrorResponse(400, 'Validation failed', createValidation.error.format());
      }

      // Get current user details to add as owner
      const ownerUser = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
      if (!ownerUser) {
          return createErrorResponse(404, 'Authenticated user not found'); // Should not happen if auth succeeded
      }

      const now = new Date();
      const newTeam = {
        name: data.name,
        createdAt: now,
        owner: userId,
        members: [
          {
            userId: userId,
            email: ownerUser.email, // Get email from user doc
            name: ownerUser.name,   // Get name from user doc
            role: 'owner',
            joinedAt: now
          }
        ]
      };

      const result = await teamsCollection.insertOne(newTeam);
      const createdTeam = { ...newTeam, id: result.insertedId.toString() };
      delete createdTeam._id;

      await createAuditLog(db, {
          userId, teamId: result.insertedId.toString(), action: 'create',
          resourceType: 'team', resourceId: result.insertedId.toString(),
      });

      return createResponse(201, createdTeam);
    }
    
    // PUT: Update team details (e.g., name) - Requires team ID in path
    else if (event.httpMethod === 'PUT' && effectiveTeamId) {
        const data = JSON.parse(event.body);
        const updateValidation = TeamUpdateSchema.safeParse(data);
        if (!updateValidation.success) {
            return createErrorResponse(400, 'Validation failed', updateValidation.error.format());
        }
        
        // Ensure user is owner to update team name
        const updateResult = await teamsCollection.updateOne(
            { _id: new ObjectId(effectiveTeamId), owner: userId }, // Only owner can update name
            { $set: { name: data.name, updatedAt: new Date() } }
        );
        
        if (updateResult.matchedCount === 0) {
            return createErrorResponse(404, 'Team not found or user is not the owner');
        }
        
        const updatedTeam = await teamsCollection.findOne({ _id: new ObjectId(effectiveTeamId) });
        updatedTeam.id = updatedTeam._id.toString();
        delete updatedTeam._id;

        await createAuditLog(db, {
            userId, teamId: effectiveTeamId, action: 'update',
            resourceType: 'team', resourceId: effectiveTeamId,
            changes: { name: { to: data.name } }
        });

        return createResponse(200, updatedTeam);
    }
    
    // DELETE: Soft delete a team and cascade to child resources - Requires team ID in path
    else if (event.httpMethod === 'DELETE' && effectiveTeamId) {
        // Ensure user is owner to delete team
        const team = await teamsCollection.findOne({
            _id: new ObjectId(effectiveTeamId),
            owner: userId,
            ...notDeleted,
        });

        if (!team) {
            return createErrorResponse(404, 'Team not found or user is not the owner');
        }

        // Soft delete the team itself
        await softDelete(teamsCollection, {
            _id: new ObjectId(effectiveTeamId),
            ...notDeleted,
        }, userId);

        // Cascade soft delete all child resources belonging to this team
        const now = new Date();
        const cascadeUpdate = { $set: { deletedAt: now, deletedBy: userId } };
        const cascadeFilter = { teamId: effectiveTeamId, deletedAt: null };

        await Promise.all([
            db.collection('projects').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('tasks').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('clients').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('calendarEvents').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('notes').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('campaigns').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('invoices').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('scopes').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('resources').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('apiKeys').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('webhooks').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('comments').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('scopeTemplates').updateMany(cascadeFilter, cascadeUpdate),
            db.collection('onboarding').updateMany(cascadeFilter, cascadeUpdate),
        ]);

        await createAuditLog(db, {
            userId, teamId: effectiveTeamId, action: 'delete',
            resourceType: 'team', resourceId: effectiveTeamId,
        });

        return createResponse(200, { message: 'Team and all associated resources deleted successfully' });
    }

    // GET /teams/{teamId}/invites - List pending invites for a team
    else if (event.httpMethod === 'GET' && effectiveTeamId && event.path.includes('/invites')) {
        // Check if user has permission to view invites (must be a team member)
        const hasAccess = await teamsCollection.countDocuments({
            _id: new ObjectId(effectiveTeamId),
            'members.userId': userId
        });
        
        if (hasAccess === 0) {
            return createErrorResponse(404, 'Team not found or user is not a member');
        }
        
        const invitesCollection = db.collection('teamInvites');
        const invites = await invitesCollection.find({
            teamId: effectiveTeamId,
            status: 'pending'
        }).toArray();
        
        const formattedInvites = invites.map(invite => ({
            ...invite,
            id: invite._id.toString(),
            _id: undefined
        }));
        
        return createResponse(200, formattedInvites);
    }

    // POST /teams/{teamId}/leave - Leave a team
    else if (event.httpMethod === 'POST' && effectiveTeamId && event.path.includes('/leave')) {
        // First make sure the team exists
        const team = await teamsCollection.findOne({
            _id: new ObjectId(effectiveTeamId)
        });
        
        if (!team) {
            return createErrorResponse(404, 'Team not found');
        }
        
        // Check if user is the owner - owners cannot leave their own team
        if (team.owner === userId) {
            return createErrorResponse(400, 'Team owners cannot leave their own team. Please delete the team or transfer ownership first.');
        }
        
        // Check if user is a member
        const isMember = team.members.some(m => m.userId === userId);
        if (!isMember) {
            return createErrorResponse(400, 'You are not a member of this team');
        }
        
        // Remove user from team
        await teamsCollection.updateOne(
            { _id: new ObjectId(effectiveTeamId) },
            { $pull: { members: { userId: userId } } }
        );

        await createAuditLog(db, {
            userId, teamId: effectiveTeamId, action: 'delete',
            resourceType: 'teamMember', resourceId: userId,
        });

        return createResponse(200, {
            message: 'You have successfully left the team'
        });
    }

    // --- Team Member Operations (Example: POST /teams/{teamId}/members) --- 
    // Requires more complex path parsing or separate functions
    // else if (event.httpMethod === 'POST' && effectiveTeamId && event.path.endsWith('/members')) { ... }
    
    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed for the requested path or operation');
    }
  } catch (error) {
    logger.error('Error handling teams request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
}; 