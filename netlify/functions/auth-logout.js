const jwt = require('jsonwebtoken');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { revokeToken } = require('./utils/authHandler');
const logger = require('./utils/logger');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  // Try to revoke the token server-side
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.jti) {
          const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : undefined;
          await revokeToken(decoded.jti, expiresAt);
        }
      }
    } catch (error) {
      logger.debug('Token revocation during logout failed:', error.message);
    }
  }

  return createResponse(200, { message: 'Logout successful' });
};
