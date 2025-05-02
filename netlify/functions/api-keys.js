const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

const API_KEY_PREFIX = 'lc_sk_'; // LaunchCue Secret Key
const KEY_BYTE_LENGTH = 32; // Length of the random part of the key
const PREFIX_VISIBLE_LENGTH = 8; // How much of the prefix (after lc_sk_) is stored/shown

// Define available scopes
const AVAILABLE_SCOPES = [
    'read:projects', 'write:projects',
    'read:tasks', 'write:tasks',
    'read:clients', 'write:clients',
    'read:campaigns', 'write:campaigns',
    'read:notes', 'write:notes'
    // Add more granular scopes as needed
];

// Zod Schema for creating a key with scopes
const CreateKeySchema = z.object({
    name: z.string().min(1, "Key name is required").max(100),
    scopes: z.array(z.string()).refine(
        (scopes) => scopes.every(scope => AVAILABLE_SCOPES.includes(scope)),
        { message: "Invalid scope provided" }
    ).optional().default(['read:projects', 'read:tasks', 'read:clients']), // Default to read-only
});

// Generate a secure API key and its components
function generateApiKey() {
    const randomBytes = crypto.randomBytes(KEY_BYTE_LENGTH);
    const key = API_KEY_PREFIX + randomBytes.toString('base64url'); // Use base64url for URL safety
    const prefix = key.substring(0, API_KEY_PREFIX.length + PREFIX_VISIBLE_LENGTH);
    return { fullKey: key, prefix: prefix };
}

// Hash the API key securely
async function hashApiKey(apiKey) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(apiKey, salt);
}

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authResult;
    try {
        authResult = authenticateRequest(event);
    } catch (errorResponse) {
        return errorResponse;
    }
    const { userId, teamId } = authResult;

    // Extract key prefix from path for DELETE requests
    let keyPrefixToDelete = null;
    const pathParts = event.path.split('/');
    const keysIndex = pathParts.indexOf('api-keys');
    if (keysIndex !== -1 && pathParts.length > keysIndex + 1) {
        keyPrefixToDelete = pathParts[keysIndex + 1]; // Assumes prefix is the identifier
    }

    try {
        const { db } = await connectToDb();
        const collection = db.collection('apiKeys');

        // GET: List API Keys (excluding the hash, including scopes)
        if (event.httpMethod === 'GET') {
            const keys = await collection.find(
                { userId, teamId }, 
                { projection: { hashedKey: 0 } } 
            ).toArray();
            
            const formattedKeys = keys.map(k => ({ 
                id: k._id.toString(),
                name: k.name,
                prefix: k.prefix,
                scopes: k.scopes || [], // Include scopes
                createdAt: k.createdAt,
                lastUsedAt: k.lastUsedAt,
                _id: undefined 
            }));
            return createResponse(200, formattedKeys);
        }

        // POST: Create a new API Key with scopes
        else if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = CreateKeySchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const { name, scopes } = validationResult.data;

            const { fullKey, prefix } = generateApiKey();
            const hashedKey = await hashApiKey(fullKey);

            const now = new Date();
            const newApiKeyDocument = {
                userId,
                teamId,
                name,
                prefix, 
                hashedKey,
                scopes, // Store selected scopes
                createdAt: now,
                lastUsedAt: null
            };

            const result = await collection.insertOne(newApiKeyDocument);

            // Return details including scopes, but only the full key this time
            return createResponse(201, {
                message: "API Key generated successfully. Store it securely - it will not be shown again.",
                name: newApiKeyDocument.name,
                prefix: newApiKeyDocument.prefix,
                scopes: newApiKeyDocument.scopes,
                createdAt: newApiKeyDocument.createdAt,
                apiKey: fullKey // Full key only on creation
            });
        }

        // DELETE: Delete an API Key by its prefix
        else if (event.httpMethod === 'DELETE' && keyPrefixToDelete) {
            const result = await collection.deleteOne({
                prefix: keyPrefixToDelete,
                userId, 
                teamId 
            });

            if (result.deletedCount === 0) {
                return createErrorResponse(404, 'API Key not found or user unauthorized');
            }
            return createResponse(200, { message: 'API Key deleted successfully' });
        }

        // Method Not Allowed
        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        console.error('Error handling API keys request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 