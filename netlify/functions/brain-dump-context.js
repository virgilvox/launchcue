const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: ['read:braindumps']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authResult;

  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const { clientId, projectId } = event.queryStringParameters || {};
  let contextOptions = {};
  try {
    const optionsParam = event.queryStringParameters?.options;
    contextOptions = optionsParam ? JSON.parse(optionsParam) : {};
  } catch (e) {
    return createErrorResponse(400, 'Invalid format for options parameter');
  }

  try {
    const { db } = await connectToDb();
    const contextData = {};
    const queryBase = { teamId };
    let clientQuery = { ...queryBase };
    let projectQuery = { ...queryBase };

    let resolvedClientId = event.queryStringParameters?.clientId || null;

    if (resolvedClientId && ObjectId.isValid(resolvedClientId)) {
      clientQuery._id = new ObjectId(resolvedClientId);
      projectQuery.clientId = resolvedClientId;
    }
    if (projectId && ObjectId.isValid(projectId)) {
      projectQuery._id = new ObjectId(projectId);
      if (!resolvedClientId) {
        const projectForClient = await db.collection('projects').findOne(projectQuery, { projection: { clientId: 1 } });
        if (projectForClient?.clientId) {
          clientQuery._id = new ObjectId(projectForClient.clientId);
          resolvedClientId = projectForClient.clientId;
        }
      }
    }

    if (contextOptions.clientInfo && resolvedClientId) {
      contextData.clientInfo = await db.collection('clients').findOne(clientQuery,
        { projection: { name: 1, industry: 1, contactPerson: 1, email: 1, engagementStart: 1, priority: 1 } }
      );
    }

    if (contextOptions.projectInfo && projectId) {
      contextData.projectInfo = await db.collection('projects').findOne(projectQuery,
        { projection: { title: 1, description: 1, status: 1, startDate: 1, endDate: 1, budget: 1, goals: 1 } }
      );
    }

    if (contextOptions.allNotes) {
      const notesQuery = { ...queryBase };
      if (projectId) notesQuery.projectId = projectId;
      else if (resolvedClientId) notesQuery.clientId = resolvedClientId;
      contextData.allNotes = await db.collection('notes').find(notesQuery)
        .sort({ createdAt: -1 }).limit(20)
        .project({ title: 1, createdAt: 1 })
        .toArray();
    }

    if (contextOptions.pastSummaries) {
      const summaryQuery = { ...queryBase, tags: 'braindump-summary' };
      if (projectId) summaryQuery.projectId = projectId;
      else if (resolvedClientId) summaryQuery.clientId = resolvedClientId;
      contextData.pastSummaries = await db.collection('notes').find(summaryQuery)
        .sort({ createdAt: -1 }).limit(10)
        .project({ title: 1, createdAt: 1 })
        .toArray();
    }

    if (contextOptions.tasks) {
      const tasksQuery = { ...queryBase };
      if (projectId) tasksQuery.projectId = projectId;
      else if (resolvedClientId) {
        const clientProjects = await db.collection('projects').find({ clientId: resolvedClientId, teamId }, { projection: { _id: 1 } }).toArray();
        const projectIds = clientProjects.map(p => p._id.toString());
        if (projectIds.length > 0) {
          tasksQuery.projectId = { $in: projectIds };
        } else {
          tasksQuery.projectId = null;
        }
      }
      contextData.tasks = await db.collection('tasks').find(tasksQuery)
        .sort({ dueDate: 1 }).limit(25)
        .project({ title: 1, status: 1, dueDate: 1 })
        .toArray();
    }

    if (contextOptions.campaigns) {
      const campaignsQuery = { ...queryBase };
      if (projectId) campaignsQuery.projectId = projectId;
      else if (resolvedClientId) campaignsQuery.clientId = resolvedClientId;
      contextData.campaigns = await db.collection('campaigns').find(campaignsQuery)
        .sort({ endDate: -1 }).limit(10)
        .project({ title: 1, status: 1, endDate: 1 })
        .toArray();
    }

    if (contextOptions.calendarEvents) {
      const eventsQuery = { ...queryBase };
      if (projectId) eventsQuery.projectId = projectId;
      else if (resolvedClientId) eventsQuery.clientId = resolvedClientId;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 30);
      eventsQuery.start = { $gte: startDate, $lte: endDate };

      contextData.calendarEvents = await db.collection('calendarEvents').find(eventsQuery)
        .sort({ start: 1 }).limit(15)
        .project({ title: 1, start: 1, date: 1 })
        .toArray();
    }

    return createResponse(200, contextData);

  } catch (error) {
    logger.error('Error fetching context data:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
