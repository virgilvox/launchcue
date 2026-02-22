// DEPRECATED: Use authHandler.js instead. This file is kept temporarily for backward compatibility.
// All functions should migrate to: const { authenticate } = require('./utils/authHandler');
const jwt = require('jsonwebtoken');
const { createErrorResponse } = require('./response');
const logger = require('./logger');

function authenticateRequest(event) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('Missing JWT_SECRET environment variable');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration.');
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.userId || !decoded.teamId) {
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload.');
    }

    return {
      userId: decoded.userId,
      teamId: decoded.teamId
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
  }
}

function getAuthUser(event) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('Missing JWT_SECRET environment variable');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration.');
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.userId || !decoded.teamId) {
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload.');
    }

    const teams = decoded.teams || [{ id: decoded.teamId, name: 'Default Team' }];
    return {
      userId: decoded.userId,
      teamId: decoded.teamId,
      user: { sub: decoded.userId },
      teams: teams
    };
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.name === 'TokenExpiredError') {
      throw createErrorResponse(401, 'Unauthorized', 'Authentication token has expired. Please login again.');
    }
    throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
  }
}

module.exports = {
  getAuthUser,
  authenticateRequest
};
