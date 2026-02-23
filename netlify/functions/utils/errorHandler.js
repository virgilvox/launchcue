const { createErrorResponse, handleOptionsRequest } = require('./response');
const logger = require('./logger');
const { rateLimitCheck } = require('./rateLimit');

const isProduction = process.env.NODE_ENV === 'production';

/** Return error details only in non-production environments */
function safeErrorDetails(error) {
  return isProduction ? undefined : (error.message || String(error));
}

/**
 * Wraps a Netlify function handler with standardized error handling and CORS preflight.
 *
 * @param {Function} handler - async (event, context) => response
 * @param {object} [options]
 * @param {string[]} [options.allowedMethods] - Allowed HTTP methods (e.g. ['GET', 'POST'])
 * @param {string} [options.rateLimit] - Rate limit category ('auth', 'general', 'ai')
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

    // Rate limiting
    if (options.rateLimit) {
      const rateLimited = await rateLimitCheck(event, options.rateLimit);
      if (rateLimited) return rateLimited;
    }

    try {
      return await handler(event, context);
    } catch (error) {
      // If it's already a formatted error response (from authenticate, etc.), return it
      if (error && error.statusCode && error.body) {
        return error;
      }

      // MongoDB duplicate key — don't leak raw error.message
      if (error.code === 11000) {
        return createErrorResponse(409, 'Duplicate entry', safeErrorDetails(error));
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

      // Generic server error — sanitise details in production
      logger.error('Unhandled error:', error.message || error);
      return createErrorResponse(500, 'Internal Server Error', safeErrorDetails(error));
    }
  };
}

module.exports = { withErrorHandling, safeErrorDetails };

module.exports = { withErrorHandling };
