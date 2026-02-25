const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { notDeleted } = require('./utils/softDelete');

// Collection configs: collection name, search fields, and how to map results
const SEARCHABLE_COLLECTIONS = {
  tasks: {
    collection: 'tasks',
    fields: ['title', 'description'],
    mapResult: (doc, matchField) => ({
      type: 'task',
      id: doc._id.toString(),
      title: doc.title || '',
      description: doc.description || '',
      status: doc.status || null,
      matchField,
    }),
  },
  projects: {
    collection: 'projects',
    fields: ['title', 'description'],
    mapResult: (doc, matchField) => ({
      type: 'project',
      id: doc._id.toString(),
      title: doc.title || '',
      description: doc.description || '',
      status: doc.status || null,
      matchField,
    }),
  },
  clients: {
    collection: 'clients',
    fields: ['name', 'description', 'industry'],
    mapResult: (doc, matchField) => ({
      type: 'client',
      id: doc._id.toString(),
      title: doc.name || '',
      description: doc.description || doc.industry || '',
      matchField,
    }),
  },
  notes: {
    collection: 'notes',
    fields: ['title', 'content'],
    mapResult: (doc, matchField) => ({
      type: 'note',
      id: doc._id.toString(),
      title: doc.title || '',
      description: doc.content || '',
      matchField,
    }),
  },
  campaigns: {
    collection: 'campaigns',
    fields: ['title', 'description'],
    mapResult: (doc, matchField) => ({
      type: 'campaign',
      id: doc._id.toString(),
      title: doc.title || '',
      description: doc.description || '',
      matchField,
    }),
  },
};

const MAX_RESULTS_PER_COLLECTION = 5;
const MAX_TOTAL_RESULTS = 20;
const VALID_TYPES = Object.keys(SEARCHABLE_COLLECTIONS);

exports.handler = async function (event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  let authContext;
  try {
    authContext = await authenticate(event, {
      // Search is read-only but spans multiple resource types.
      // Require at least read:clients scope to ensure API keys have read access.
      requiredScopes: ['read:clients'],
    });
  } catch (errorResponse) {
    logger.error('Search authentication failed:', errorResponse.body || errorResponse);
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }

  const { teamId } = authContext;
  const params = event.queryStringParameters || {};
  const query = (params.q || '').trim();

  if (!query) {
    return createErrorResponse(400, 'Search query parameter "q" is required');
  }

  if (query.length < 2) {
    return createErrorResponse(400, 'Search query must be at least 2 characters');
  }

  if (query.length > 100) {
    return createErrorResponse(400, 'Search query too long (max 100 characters)');
  }

  // Determine which collections to search
  let typesToSearch = VALID_TYPES;
  if (params.types) {
    const requested = params.types.split(',').map((t) => t.trim().toLowerCase());
    typesToSearch = requested.filter((t) => VALID_TYPES.includes(t));
    if (typesToSearch.length === 0) {
      return createErrorResponse(
        400,
        `Invalid types. Valid types: ${VALID_TYPES.join(', ')}`
      );
    }
  }

  try {
    const { db } = await connectToDb();

    // Escape special regex characters in the search query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // Search all requested collections in parallel
    const searchPromises = typesToSearch.map(async (type) => {
      const config = SEARCHABLE_COLLECTIONS[type];
      const collection = db.collection(config.collection);

      // Build $or query across all searchable fields
      const orConditions = config.fields.map((field) => ({
        [field]: { $regex: regex },
      }));

      const docs = await collection
        .find({
          teamId,
          ...notDeleted,
          $or: orConditions,
        })
        .limit(MAX_RESULTS_PER_COLLECTION)
        .toArray();

      // Map results and determine which field matched
      return docs.map((doc) => {
        const matchField = config.fields.find((field) => {
          const value = doc[field];
          return value && regex.test(value);
        }) || config.fields[0];

        return config.mapResult(doc, matchField);
      });
    });

    const resultArrays = await Promise.all(searchPromises);

    // Flatten and limit total results
    const results = resultArrays.flat().slice(0, MAX_TOTAL_RESULTS);

    return createResponse(200, { results });
  } catch (error) {
    logger.error('Search error:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
