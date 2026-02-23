const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : isProduction
    ? [] // In production without ALLOWED_ORIGINS, deny all CORS
    : ['http://localhost:5173', 'http://localhost:8888'];

// Module-level event ref; safe because Lambda processes one request at a time per instance.
let _requestEvent = null;

function setRequestEvent(event) {
  _requestEvent = event;
}

function getCorsHeaders(event) {
  const e = event || _requestEvent;
  const origin = e?.headers?.origin || e?.headers?.Origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: getCorsHeaders(),
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
  setRequestEvent(event);
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: ''
    };
  }
  return null;
}

module.exports = {
  createResponse,
  createErrorResponse,
  handleOptionsRequest,
  setRequestEvent,
  getCorsHeaders
};
