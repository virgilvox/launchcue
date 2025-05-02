const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = authenticateRequest(event);
  } catch (errorResponse) {
    return errorResponse;
  }
  const { userId, teamId } = authResult;

  // Extract target team ID from path if provided (e.g., /teams/{teamId})
  let targetTeamId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2 && ObjectId.isValid(pathParts[pathParts.length - 1])) {
      targetTeamId = pathParts[pathParts.length - 1];
  }

  try {
    const { db } = await connectToDb();
    const teamsCollection = db.collection('teams');
    const usersCollection = db.collection('users');

    // GET: List teams the user is a member of OR Get specific team details
    if (event.httpMethod === 'GET') {
        if (targetTeamId) {
            // Get specific team details if user is a member
            const team = await teamsCollection.findOne({
                _id: new ObjectId(targetTeamId),
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
            team.id = team._id.toString();
            delete team._id;

            return createResponse(200, team);
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
      if (!data.name) {
        return createErrorResponse(400, 'Team name is required');
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

      return createResponse(201, createdTeam);
    }
    
    // PUT: Update team details (e.g., name) - Requires team ID in path
    else if (event.httpMethod === 'PUT' && targetTeamId) {
        const data = JSON.parse(event.body);
        if (!data.name) {
            return createErrorResponse(400, 'Team name is required for update');
        }
        
        // Ensure user is owner to update team name
        const updateResult = await teamsCollection.updateOne(
            { _id: new ObjectId(targetTeamId), owner: userId }, // Only owner can update name
            { $set: { name: data.name, updatedAt: new Date() } }
        );
        
        if (updateResult.matchedCount === 0) {
            return createErrorResponse(404, 'Team not found or user is not the owner');
        }
        
        const updatedTeam = await teamsCollection.findOne({ _id: new ObjectId(targetTeamId) });
        updatedTeam.id = updatedTeam._id.toString();
        delete updatedTeam._id;
        
        return createResponse(200, updatedTeam);
    }
    
    // DELETE: Delete a team - Requires team ID in path
    else if (event.httpMethod === 'DELETE' && targetTeamId) {
        // Ensure user is owner to delete team
        const deleteResult = await teamsCollection.deleteOne(
            { _id: new ObjectId(targetTeamId), owner: userId } // Only owner can delete
        );
        
        if (deleteResult.deletedCount === 0) {
            return createErrorResponse(404, 'Team not found or user is not the owner');
        }
        
        // Optional: Consider deleting associated data (projects, tasks, clients) or marking them as orphaned.
        // await db.collection('projects').deleteMany({ teamId: targetTeamId });
        // await db.collection('tasks').deleteMany({ teamId: targetTeamId });
        // ... etc.
        
        return createResponse(200, { message: 'Team deleted successfully' });
    }

    // POST /teams/{teamId}/invites - Invite a user to the team
    else if (event.httpMethod === 'POST' && targetTeamId && event.path.includes('/invites')) {
        const data = JSON.parse(event.body);
        if (!data.email) {
            return createErrorResponse(400, 'Email is required for team invitation');
        }
        
        // Check if user has permission to send invites (must be a team member)
        const team = await teamsCollection.findOne({
            _id: new ObjectId(targetTeamId),
            'members.userId': userId
        });
        
        if (!team) {
            return createErrorResponse(404, 'Team not found or user is not a member');
        }
        
        // Check if email is already a member
        const isMember = team.members.some(m => m.email.toLowerCase() === data.email.toLowerCase());
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
            { _id: new ObjectId(targetTeamId) },
            { $push: { members: newMember } }
        );
        
        // TODO: Send notification email to the user (optional)
        
        return createResponse(200, { 
            message: 'User added to team successfully',
            member: newMember
        });
    }

    // GET /teams/{teamId}/invites - List pending invites for a team
    else if (event.httpMethod === 'GET' && targetTeamId && event.path.includes('/invites')) {
        // Check if user has permission to view invites (must be a team member)
        const hasAccess = await teamsCollection.countDocuments({
            _id: new ObjectId(targetTeamId),
            'members.userId': userId
        });
        
        if (hasAccess === 0) {
            return createErrorResponse(404, 'Team not found or user is not a member');
        }
        
        const invitesCollection = db.collection('teamInvites');
        const invites = await invitesCollection.find({
            teamId: targetTeamId,
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
    else if (event.httpMethod === 'POST' && targetTeamId && event.path.includes('/leave')) {
        // First make sure the team exists
        const team = await teamsCollection.findOne({
            _id: new ObjectId(targetTeamId)
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
            { _id: new ObjectId(targetTeamId) },
            { $pull: { members: { userId: userId } } }
        );
        
        return createResponse(200, { 
            message: 'You have successfully left the team'
        });
    }

    // --- Team Member Operations (Example: POST /teams/{teamId}/members) --- 
    // Requires more complex path parsing or separate functions
    // else if (event.httpMethod === 'POST' && targetTeamId && event.path.endsWith('/members')) { ... }
    
    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed for the requested path or operation');
    }
  } catch (error) {
    console.error('Error handling teams request:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 