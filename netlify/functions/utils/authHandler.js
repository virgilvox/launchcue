const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createErrorResponse } = require('./response');
const { connectToDb } = require('./db');
const logger = require('./logger');

const API_KEY_PREFIX = 'lc_sk_';
const TOKEN_EXPIRY = '24h';

let blocklistIndexEnsured = false;

/**
 * Universal authentication handler supporting both JWT and API Key auth.
 */
async function authenticate(event, options = {}) {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  const isApiKey = token && token.startsWith(API_KEY_PREFIX);

  if (isApiKey) {
    return await authenticateWithApiKey(event, token, options);
  } else {
    return await authenticateWithJwt(event, token);
  }
}

async function authenticateWithJwt(event, token) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('Missing JWT_SECRET environment variable');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.userId || !decoded.teamId) {
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload');
    }

    // Check token blocklist if jti exists
    if (decoded.jti) {
      const isRevoked = await isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw createErrorResponse(401, 'Unauthorized', 'Token has been revoked');
      }
    }

    return {
      userId: decoded.userId,
      teamId: decoded.teamId,
      jti: decoded.jti || null,
      authType: 'jwt'
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
  }
}

/**
 * Check if a token has been revoked.
 */
async function isTokenRevoked(jti) {
  try {
    const { db } = await connectToDb();
    const blocked = await db.collection('tokenBlocklist').findOne({ jti });
    return !!blocked;
  } catch (error) {
    logger.error('Token blocklist check failed:', error.message);
    // Fail open to avoid blocking all requests if DB is down
    return false;
  }
}

/**
 * Revoke a JWT token by adding its jti to the blocklist.
 * @param {string} jti - The JWT ID
 * @param {Date} expiresAt - When the token expires (for TTL cleanup)
 */
async function revokeToken(jti, expiresAt) {
  if (!jti) return;
  try {
    const { db } = await connectToDb();
    const collection = db.collection('tokenBlocklist');

    // Ensure TTL index for auto-cleanup
    if (!blocklistIndexEnsured) {
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
      blocklistIndexEnsured = true;
    }

    await collection.insertOne({
      jti,
      revokedAt: new Date(),
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    logger.error('Failed to revoke token:', error.message);
  }
}

/**
 * Generate a unique token ID for JWT jti claim.
 */
function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

async function authenticateWithApiKey(event, apiKey, options = {}) {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key format');
  }

  const lookupPrefix = apiKey.substring(0, API_KEY_PREFIX.length + 8);

  try {
    const { db } = await connectToDb();
    const apiKeyDocument = await db.collection('apiKeys').findOne({ prefix: lookupPrefix });

    if (!apiKeyDocument) {
      throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key');
    }

    const isMatch = await bcrypt.compare(apiKey, apiKeyDocument.hashedKey);
    if (!isMatch) {
      throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key');
    }

    const method = event.httpMethod;
    const resourceType = getResourceTypeFromPath(event.path);

    if (!options.skipScopeCheck && options.requiredScopes && options.requiredScopes.length > 0) {
      checkScopes(apiKeyDocument.scopes || [], options.requiredScopes);
    } else if (!options.skipScopeCheck && resourceType) {
      const requiredScopes = deriveRequiredScopes(resourceType, method);
      checkScopes(apiKeyDocument.scopes || [], requiredScopes);
    }

    // Fire-and-forget last used update
    db.collection('apiKeys').updateOne(
      { _id: apiKeyDocument._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(err => logger.error('Failed to update API key lastUsedAt:', err));

    return {
      userId: apiKeyDocument.userId,
      teamId: apiKeyDocument.teamId,
      scopes: apiKeyDocument.scopes || [],
      keyPrefix: apiKeyDocument.prefix,
      authType: 'apiKey'
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createErrorResponse(500, 'Internal Server Error during API Key auth', error.message);
  }
}

function checkScopes(providedScopes, requiredScopes) {
  const hasSufficientScope = requiredScopes.every(scope =>
    providedScopes.includes(scope) ||
    providedScopes.includes('admin') ||
    providedScopes.includes('*')
  );

  if (!hasSufficientScope) {
    throw createErrorResponse(403, 'Forbidden',
      `API key does not have sufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
    );
  }

  return true;
}

function getResourceTypeFromPath(path) {
  const cleanPath = path.replace(/^\/\.netlify\/functions\//, '').replace(/^\//, '');
  const firstPathPart = cleanPath.split('/')[0];

  if (firstPathPart === 'project-detail') return 'projects';
  if (firstPathPart === 'brain-dump-context' || firstPathPart === 'brain-dump-create-items') return 'braindumps';

  return firstPathPart;
}

function deriveRequiredScopes(resourceType, method) {
  if (method === 'GET') {
    return [`read:${resourceType}`];
  } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return [`write:${resourceType}`];
  }
  return [];
}

module.exports = {
  authenticate,
  authenticateWithJwt,
  authenticateWithApiKey,
  revokeToken,
  generateJti,
  API_KEY_PREFIX,
  TOKEN_EXPIRY,
};
