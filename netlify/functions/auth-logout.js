const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

// Note: Logout is primarily handled client-side by removing the token.
// This function could be used for server-side session invalidation if needed (e.g., token blocklist).
exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Typically, logout might involve POST, but GET is also plausible for simple invalidation
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') { 
    return createErrorResponse(405, 'Method Not Allowed');
  }

  // No server-side action needed for basic JWT logout (client clears token)
  // If implementing a token blocklist, logic would go here.
  console.log('Logout endpoint called (typically handled client-side).');

  return createResponse(200, { message: 'Logout successful (client should clear token)' });
}; 