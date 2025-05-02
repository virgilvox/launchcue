const { connectToDb } = require('./db');
const bcrypt = require('bcryptjs');
const { createErrorResponse } = require('./response');

const API_KEY_PREFIX = 'lc_sk_';

/**
 * Authenticates a request using an API key.
 * Looks for 'Authorization: Bearer lc_sk_...' header.
 * Verifies the key against hashed keys in the database.
 * 
 * @param {object} event - The Netlify Function event object.
 * @returns {Promise<object>} - Resolves with { userId, teamId, keyPrefix, scopes } if valid.
 * @throws {object} - Throws a structured error response object if invalid/not found.
 */
async function authenticateApiKeyRequest(event) {
    console.log("Attempting API Key Authentication...");
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || !authHeader.includes(API_KEY_PREFIX)) {
        throw createErrorResponse(401, 'Unauthorized', 'Missing or invalid API Key Authorization header.');
    }

    const providedKey = authHeader.split(' ')[1];
    
    if (!providedKey || !providedKey.startsWith(API_KEY_PREFIX)) {
         throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key format.');
    }

    // Extract the prefix part that is stored in the DB for lookup
    // Example: lc_sk_AbCdEfGh... -> Lookup prefix = lc_sk_AbCdEfGh
    const lookupPrefix = providedKey.substring(0, API_KEY_PREFIX.length + 8); // Assuming 8 visible chars after prefix

    let dbClient;
    try {
        const { db, client } = await connectToDb();
        dbClient = client; // Assign to outer scope variable
        const apiKeyDocument = await db.collection('apiKeys').findOne({ prefix: lookupPrefix });

        if (!apiKeyDocument) {
            console.log(`API Key not found for prefix: ${lookupPrefix}`);
            throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key.');
        }

        // Hash the *provided* full key and compare with the stored hash
        const isMatch = await bcrypt.compare(providedKey, apiKeyDocument.hashedKey);

        if (!isMatch) {
            console.log(`API Key hash mismatch for prefix: ${lookupPrefix}`);
            throw createErrorResponse(401, 'Unauthorized', 'Invalid API Key.');
        }
        
        // Key is valid, update last used timestamp (fire-and-forget)
        // Use await here just to ensure it attempts before returning, but don't block on it
        await db.collection('apiKeys').updateOne(
            { _id: apiKeyDocument._id }, 
            { $set: { lastUsedAt: new Date() } }
        ).catch(err => console.error("Failed to update API key lastUsedAt:", err));

        console.log(`API Key Authentication Successful for prefix: ${lookupPrefix}`);
        // Return context including scopes
        return {
            userId: apiKeyDocument.userId,
            teamId: apiKeyDocument.teamId,
            keyPrefix: apiKeyDocument.prefix,
            scopes: apiKeyDocument.scopes || [] // Return scopes array
        };

    } catch (error) {
        console.error('Error during API Key authentication:', error);
        if (error.statusCode) {
            throw error;
        }
        throw createErrorResponse(500, 'Internal Server Error during API Key auth', error.message);
    }
}

module.exports = { authenticateApiKeyRequest }; 