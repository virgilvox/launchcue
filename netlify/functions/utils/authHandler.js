const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createErrorResponse } = require('./response');
const { connectToDb } = require('./db');

const API_KEY_PREFIX = 'lc_sk_';

/**
 * Universal authentication handler that tries both JWT and API Key authentication
 * and includes proper scope checking for API keys.
 * 
 * @param {object} event - The Netlify Function event object
 * @param {object} options - Options for authentication
 * @param {string[]} options.requiredScopes - Required scopes for the current operation, e.g. ['read:tasks']
 * @param {boolean} options.skipScopeCheck - Skip scope checking even if using API key (default: false)
 * @returns {Promise<object>} Authentication context with userId, teamId, and for API keys, scopes
 */
async function authenticate(event, options = {}) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  
  // Determine auth type based on token format
  const isApiKey = token && token.startsWith(API_KEY_PREFIX);
  
  if (isApiKey) {
    console.log(`Authenticating with API key for ${event.path}...`);
    return await authenticateWithApiKey(event, token, options);
  } else {
    console.log(`Authenticating with JWT for ${event.path}...`);
    return await authenticateWithJwt(event, token);
  }
}

/**
 * Authenticates a request using a JWT token
 */
async function authenticateWithJwt(event, token) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('Missing JWT_SECRET environment variable.');
    throw createErrorResponse(500, 'Internal Server Error', 'Missing JWT secret configuration.');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    if (!decoded.userId || !decoded.teamId) {
      console.error('Token missing userId or teamId:', decoded);
      throw createErrorResponse(401, 'Unauthorized', 'Invalid token payload.');
    }
    
    return {
      userId: decoded.userId,
      teamId: decoded.teamId,
      authType: 'jwt'
    };
    
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    throw createErrorResponse(401, 'Unauthorized', `Invalid token: ${error.message}`);
  }
}

/**
 * Authenticates a request using an API key
 */
async function authenticateWithApiKey(event, apiKey, options = {}) {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key format.');
  }

  // Extract the prefix part that is stored in the DB for lookup
  const lookupPrefix = apiKey.substring(0, API_KEY_PREFIX.length + 8);

  try {
    const { db } = await connectToDb();
    const apiKeyDocument = await db.collection('apiKeys').findOne({ prefix: lookupPrefix });

    if (!apiKeyDocument) {
      console.log(`API Key not found for prefix: ${lookupPrefix}`);
      throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key.');
    }

    // Verify the hash
    const isMatch = await bcrypt.compare(apiKey, apiKeyDocument.hashedKey);
    if (!isMatch) {
      console.log(`API Key hash mismatch for prefix: ${lookupPrefix}`);
      throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key.');
    }
    
    // Get the HTTP method to determine required scope
    const method = event.httpMethod;
    const resourceType = getResourceTypeFromPath(event.path);
    
    // Check scopes if not explicitly skipped
    if (!options.skipScopeCheck && options.requiredScopes && options.requiredScopes.length > 0) {
      // Explicitly provided scopes take precedence
      checkScopes(apiKeyDocument.scopes || [], options.requiredScopes);
    } else if (!options.skipScopeCheck && resourceType) {
      // If no explicit scopes provided, derive them from the resource type and HTTP method
      const requiredScopes = deriveRequiredScopes(resourceType, method);
      checkScopes(apiKeyDocument.scopes || [], requiredScopes);
    }
    
    // Update last used timestamp
    await db.collection('apiKeys').updateOne(
      { _id: apiKeyDocument._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(err => console.error("Failed to update API key lastUsedAt:", err));

    return {
      userId: apiKeyDocument.userId,
      teamId: apiKeyDocument.teamId,
      scopes: apiKeyDocument.scopes || [],
      keyPrefix: apiKeyDocument.prefix,
      authType: 'apiKey'
    };

  } catch (error) {
    console.error('Error during API Key authentication:', error);
    if (error.statusCode) {
      throw error;
    }
    throw createErrorResponse(500, 'Internal Server Error during API Key auth', error.message);
  }
}

/**
 * Check if the API key has all required scopes
 */
function checkScopes(providedScopes, requiredScopes) {
  const hasSufficientScope = requiredScopes.every(scope => 
    providedScopes.includes(scope) || 
    providedScopes.includes('admin') || // Admin scope has access to everything
    providedScopes.includes('*')  // Full access scope
  );
  
  if (!hasSufficientScope) {
    console.error(`Scope check failed. Required: ${requiredScopes.join(', ')}. Provided: ${providedScopes.join(', ')}`);
    throw createErrorResponse(403, 'Forbidden', 
      `API key does not have sufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
    );
  }
  
  return true;
}

/**
 * Get resource type from path, e.g. /tasks -> tasks, /projects/123 -> projects
 */
function getResourceTypeFromPath(path) {
  // Remove leading slash and get first part of path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const firstPathPart = cleanPath.split('/')[0];
  
  // Handle special cases like project-detail -> projects
  if (firstPathPart === 'project-detail') return 'projects';
  if (firstPathPart === 'brain-dump') return 'braindumps';
  if (firstPathPart === 'client-contacts') return 'clients';
  
  return firstPathPart;
}

/**
 * Derive required scopes based on resource type and HTTP method
 */
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
  API_KEY_PREFIX
}; 