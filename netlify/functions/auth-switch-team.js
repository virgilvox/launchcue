const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authResult;
    try {
        // Authenticate the existing token to get the userId
        authResult = authenticateRequest(event);
    } catch (errorResponse) {
        return errorResponse;
    }
    const { userId } = authResult;

    if (event.httpMethod !== 'POST') {
        return createErrorResponse(405, 'Method Not Allowed');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('Missing JWT_SECRET environment variable.');
        return createErrorResponse(500, 'Internal Server Error', 'JWT secret configuration missing.');
    }

    try {
        const { teamId: targetTeamId } = JSON.parse(event.body);

        if (!targetTeamId || !ObjectId.isValid(targetTeamId)) {
            return createErrorResponse(400, 'Valid targetTeamId is required');
        }

        const { db } = await connectToDb();
        
        // 1. Verify the user is actually a member of the target team
        const team = await db.collection('teams').findOne({
            _id: new ObjectId(targetTeamId),
            'members.userId': userId // Use the authenticated userId
        });

        if (!team) {
            return createErrorResponse(403, 'Forbidden', 'User is not a member of the target team');
        }

        // 2. Fetch user details (needed for payload)
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
             return createErrorResponse(404, 'User not found'); // Should not happen if auth succeeded
        }

        // 3. Create a *new* JWT Payload with the switched teamId
        const payload = {
            userId: userId,
            teamId: targetTeamId, // Use the target team ID
            email: user.email,
            name: user.name
            // Add other relevant claims if needed
        };

        // 4. Sign the new token
        const newToken = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

        // 5. Return the new token and the selected team info
        return createResponse(200, {
            token: newToken,
            currentTeam: { // Send back the team info for frontend state
              id: team._id.toString(),
              name: team.name,
              // Add other relevant team fields if needed
            }
            // Optionally return updated user info if needed
        });

    } catch (error) {
        console.error('Switch team error:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 