const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');

const itemTypeMapping = {
  task: {
    collection: 'tasks',
    defaults: { status: 'To Do', priority: 'Medium' }
  },
  event: {
    collection: 'calendarEvents',
    defaults: { duration: '1 hour' }
  },
  project: {
    collection: 'projects',
    defaults: { status: 'Planning' }
  }
};

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: ['write:braindumps']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authResult;

  const rateLimited = await rateLimitCheck(event, 'ai', authResult.userId);
  if (rateLimited) return rateLimited;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  try {
    const requestBody = JSON.parse(event.body);

    const tasks = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'task')
                                              : requestBody.tasks || [];
    const events = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'event')
                                               : requestBody.events || [];
    const projects = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'project')
                                                 : requestBody.projects || [];

    const itemsToCreate = [...tasks, ...events, ...projects];

    if (itemsToCreate.length === 0) {
      return createErrorResponse(400, 'No items provided to create');
    }

    const { db } = await connectToDb();
    const results = { created: [], errors: [] };
    const now = new Date();

    for (const item of itemsToCreate) {
      const itemType = item.type?.toLowerCase();
      const mapping = itemTypeMapping[itemType];

      if (!mapping) {
        results.errors.push({ itemTitle: item.title, error: `Unsupported item type: ${itemType}` });
        continue;
      }

      if (!item.title) {
        results.errors.push({ item, error: 'Item title is required' });
        continue;
      }

      const collection = db.collection(mapping.collection);
      const newItem = {
        ...mapping.defaults,
        ...item,
        teamId: teamId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        source: 'braindump-ai'
      };

      delete newItem.type;

      if (newItem.eventDateTime && mapping.collection === 'calendarEvents') {
        newItem.start = new Date(newItem.eventDateTime);
        newItem.end = new Date(new Date(newItem.eventDateTime).getTime() + 60 * 60 * 1000);
        delete newItem.eventDateTime;
      }

      if (newItem.dueDate && typeof newItem.dueDate === 'string') {
        try {
          newItem.dueDate = new Date(newItem.dueDate);
        } catch (err) {
          logger.warn(`Invalid dueDate format: ${newItem.dueDate}`);
        }
      }

      try {
        const insertResult = await collection.insertOne(newItem);
        results.created.push({
          id: insertResult.insertedId.toString(),
          type: itemType,
          title: newItem.title
        });
      } catch (dbError) {
        logger.error(`Error creating ${itemType} "${item.title}":`, dbError.message);
        results.errors.push({ itemTitle: item.title, type: itemType, error: dbError.message });
      }
    }

    return createResponse(200, {
      message: `Processed ${itemsToCreate.length} items. Created: ${results.created.length}, Errors: ${results.errors.length}`,
      results
    });

  } catch (error) {
    logger.error('Error creating items from AI data:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
