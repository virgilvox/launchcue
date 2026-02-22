const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { connectToDb } = require('./utils/db');
const { authenticate, revokeToken, generateJti, TOKEN_EXPIRY } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event);
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId } = authResult;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('Missing JWT_SECRET environment variable');
    return createErrorResponse(500, 'Internal Server Error', 'JWT secret configuration missing.');
  }

  try {
    const { teamId: targetTeamId } = JSON.parse(event.body);

    if (!targetTeamId || !ObjectId.isValid(targetTeamId)) {
      return createErrorResponse(400, 'Valid targetTeamId is required');
    }

    const { db } = await connectToDb();

    const team = await db.collection('teams').findOne({
      _id: new ObjectId(targetTeamId),
      'members.userId': userId
    });

    if (!team) {
      return createErrorResponse(403, 'Forbidden', 'User is not a member of the target team');
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Revoke the old token if it had a jti
    if (authResult.jti) {
      await revokeToken(authResult.jti);
    }

    const payload = {
      userId: userId,
      teamId: targetTeamId,
      email: user.email,
      name: user.name,
      jti: generateJti(),
    };

    const newToken = jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });

    return createResponse(200, {
      token: newToken,
      currentTeam: {
        id: team._id.toString(),
        name: team.name,
      }
    });

  } catch (error) {
    logger.error('Switch team error:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
