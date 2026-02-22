const { createErrorResponse, handleOptionsRequest } = require('./response');
const logger = require('./logger');

/**
 * Wraps a Netlify function handler with standardized error handling and CORS preflight.
 *
 * @param {Function} handler - async (event, context) => response
 * @param {object} [options]
 * @param {string[]} [options.allowedMethods] - Allowed HTTP methods (e.g. ['GET', 'POST'])
 * @returns {Function} Wrapped Netlify function handler
 */
function withErrorHandling(handler, options = {}) {
  return async function(event, context) {
    // Handle CORS preflight
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    // Method check
    if (options.allowedMethods && !options.allowedMethods.includes(event.httpMethod)) {
      return createErrorResponse(405, 'Method Not Allowed');
    }

    try {
      return await handler(event, context);
    } catch (error) {
      // If it's already a formatted error response (from authenticate, etc.), return it
      if (error && error.statusCode && error.body) {
        return error;
      }

      // MongoDB duplicate key
      if (error.code === 11000) {
        return createErrorResponse(409, 'Duplicate entry', error.message);
      }

      // Zod validation
      if (error.name === 'ZodError') {
        return createErrorResponse(400, 'Validation failed', error.format());
      }

      // JSON parse errors
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return createErrorResponse(400, 'Invalid JSON in request body');
      }

      // MongoDB BSON errors
      if (error.name === 'BSONTypeError' || error.name === 'BSONError') {
        return createErrorResponse(400, 'Invalid ID format');
      }

      // Generic server error
      logger.error('Unhandled error:', error.message || error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  };
}

module.exports = { withErrorHandling };
