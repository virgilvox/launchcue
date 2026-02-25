const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { createAuditLog } = require('./utils/auditLog');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { rateLimitCheck } = require('./utils/rateLimit');

const API_KEY_PREFIX = 'lc_sk_';
const KEY_BYTE_LENGTH = 32;
const PREFIX_VISIBLE_LENGTH = 8;

const AVAILABLE_SCOPES = [
  'read:projects', 'write:projects',
  'read:tasks', 'write:tasks',
  'read:clients', 'write:clients',
  'read:campaigns', 'write:campaigns',
  'read:notes', 'write:notes',
  'read:teams', 'write:teams',
  'read:resources', 'write:resources',
  'read:calendar-events', 'write:calendar-events',
  'read:braindumps', 'write:braindumps',
  'read:api-keys', 'write:api-keys'
];

const CreateKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100),
  scopes: z.array(z.string()).refine(
    (scopes) => scopes.every(scope => AVAILABLE_SCOPES.includes(scope)),
    { message: 'Invalid scope provided' }
  ).optional().default(['read:projects', 'read:tasks', 'read:clients']),
  expiresAt: z.string().datetime().nullable().optional(),
});

function generateApiKey() {
  const randomBytes = crypto.randomBytes(KEY_BYTE_LENGTH);
  const key = API_KEY_PREFIX + randomBytes.toString('base64url');
  const prefix = key.substring(0, API_KEY_PREFIX.length + PREFIX_VISIBLE_LENGTH);
  return { fullKey: key, prefix: prefix };
}

async function hashApiKey(apiKey) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(apiKey, salt);
}

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:api-keys']
        : ['write:api-keys']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authResult;

  // Use stricter 'auth' rate limiting for API key creation (POST), general for others
  const rateCategory = event.httpMethod === 'POST' ? 'auth' : 'general';
  const rateLimited = await rateLimitCheck(event, rateCategory, userId);
  if (rateLimited) return rateLimited;

  let keyPrefixToDelete = null;
  const pathParts = event.path.split('/');
  const keysIndex = pathParts.indexOf('api-keys');
  if (keysIndex !== -1 && pathParts.length > keysIndex + 1) {
    keyPrefixToDelete = pathParts[keysIndex + 1];
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('apiKeys');

    if (event.httpMethod === 'GET') {
      const keys = await collection.find(
        { userId, teamId, ...notDeleted },
        { projection: { hashedKey: 0 } }
      ).toArray();

      const formattedKeys = keys.map(k => ({
        id: k._id.toString(),
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes || [],
        expiresAt: k.expiresAt || null,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        _id: undefined
      }));
      return createResponse(200, formattedKeys);
    }

    else if (event.httpMethod === 'POST') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = CreateKeySchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const { name, scopes, expiresAt } = validationResult.data;

      const { fullKey, prefix } = generateApiKey();
      const hashedKey = await hashApiKey(fullKey);

      const now = new Date();
      const newApiKeyDocument = {
        userId,
        teamId,
        name,
        prefix,
        hashedKey,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: now,
        lastUsedAt: null
      };

      const insertResult = await collection.insertOne(newApiKeyDocument);

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'apiKey', resourceId: insertResult.insertedId.toString() });

      return createResponse(201, {
        message: 'API Key generated successfully. Store it securely - it will not be shown again.',
        name: newApiKeyDocument.name,
        prefix: newApiKeyDocument.prefix,
        scopes: newApiKeyDocument.scopes,
        expiresAt: newApiKeyDocument.expiresAt,
        createdAt: newApiKeyDocument.createdAt,
        apiKey: fullKey
      });
    }

    else if (event.httpMethod === 'DELETE' && keyPrefixToDelete) {
      const result = await softDelete(collection, {
        prefix: keyPrefixToDelete,
        userId,
        teamId,
        ...notDeleted
      }, userId);

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'API Key not found or user unauthorized');
      }
      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'apiKey', resourceId: keyPrefixToDelete });
      return createResponse(200, { message: 'API Key deleted successfully' });
    }

    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }

  } catch (error) {
    logger.error('Error handling API keys request:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
