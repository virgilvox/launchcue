const defaultHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust in production for security
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(statusCode, message, details = null) {
  const errorBody = { error: message };
  if (details) {
    errorBody.details = details;
  }
  return createResponse(statusCode, errorBody);
}

function handleOptionsRequest(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // Use 204 No Content for OPTIONS
      headers: defaultHeaders,
      body: ''
    };
  }
  return null; // Not an OPTIONS request
}

module.exports = { 
  createResponse, 
  createErrorResponse, 
  handleOptionsRequest, 
  defaultHeaders 
}; 