const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Audit logs are read-only - only GET is allowed
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: ['read:teams']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { teamId } = authResult;

  // RBAC: Only owner/admin can view audit logs
  if (!authResult.role || !['owner', 'admin'].includes(authResult.role)) {
    return createErrorResponse(403, 'Forbidden: insufficient permissions');
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('auditLogs');

    const qp = event.queryStringParameters || {};
    const query = { teamId };

    // Optional filters
    if (qp.resourceType) {
      query.resourceType = qp.resourceType;
    }
    if (qp.resourceId) {
      query.resourceId = qp.resourceId;
    }
    if (qp.userId) {
      query.userId = qp.userId;
    }
    if (qp.action) {
      query.action = qp.action;
    }

    const formatLog = (log) => ({
      ...log,
      id: log._id.toString(),
      _id: undefined,
    });

    const { page, limit, skip } = getPaginationParams(qp);
    const [logs, total] = await Promise.all([
      collection.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    return createResponse(200, createPaginatedResponse(logs.map(formatLog), total, page, limit));

  } catch (error) {
    logger.error('Error handling audit logs request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
