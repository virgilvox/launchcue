const jwt = require('jsonwebtoken');
const { createErrorResponse } = require('./response');

function authenticateRequest(event) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('Missing JWT_SECRET environment variable.');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration.');
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`Missing or invalid auth header for path: ${event.path}`);
    throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header.');
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    if (!decoded.userId || !decoded.teamId) {
      console.error('Token missing userId or teamId:', decoded);
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload.');
    }
    
    // Return simple format that other functions expect
    return { 
      userId: decoded.userId, 
      teamId: decoded.teamId
    };
    
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
  }
}

// Resources.js uses getAuthUser
function getAuthUser(event) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('Missing JWT_SECRET environment variable.');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration.');
  }

  // Special case for AI endpoints that may require different authentication
  const isAIEndpoint = event.path.includes('/ai-process');
  // Also check for resources endpoint which may have authentication issues
  const isResourcesEndpoint = event.path.includes('/resources');
  
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isAIEndpoint) {
      console.warn('AI endpoint called without Authorization header - this may be intentional');
      // For AI endpoints, we'll allow authentication to be optional
      return { userId: 'anonymous', teamId: 'anonymous' };
    } else {
      console.error(`Missing or invalid auth header for path: ${event.path}`);
      throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header.');
    }
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    // For resources endpoint, provide more detailed logging
    if (isResourcesEndpoint) {
      console.log('Decoded token for resources endpoint:', {
        userId: decoded.userId,
        teamId: decoded.teamId,
        exp: decoded.exp
      });
    }
    
    if (!decoded.userId || !decoded.teamId) {
      console.error('Token missing userId or teamId:', decoded);
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload.');
    }
    
    // For the response, include the teams array if it exists in the token
    const teams = decoded.teams || [{ id: decoded.teamId, name: 'Default Team' }];
    return { 
      userId: decoded.userId, 
      teamId: decoded.teamId,
      user: { sub: decoded.userId },  // Some endpoints expect user.sub
      teams: teams
    };
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error('Token expired at:', new Date(error.expiredAt));
      throw createErrorResponse(401, 'Unauthorized', 'Authentication token has expired. Please login again.');
    } else {
      console.error('JWT verification failed:', error.message);
      throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
    }
  }
}

// Export both functions for compatibility
module.exports = { 
  getAuthUser,
  authenticateRequest
}; 