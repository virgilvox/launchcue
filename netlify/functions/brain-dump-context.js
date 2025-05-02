const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

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

  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  // Extract query parameters
  const { clientId, projectId, options } = event.queryStringParameters || {};
  let contextOptions = {};
  try {
    // Options might be stringified JSON if passed complexly
    const optionsParam = event.queryStringParameters?.options;
    contextOptions = optionsParam ? JSON.parse(optionsParam) : {};
    console.log("Received context options:", contextOptions);
  } catch (e) {
    console.error("Error parsing context options:", e);
    return createErrorResponse(400, 'Invalid format for options parameter');
  }

  // No longer require clientId or projectId, fetch based on options selected
  // if (!clientId && !projectId) {
  //     return createErrorResponse(400, 'Either clientId or projectId must be provided');
  // }

  try {
    const { db } = await connectToDb();
    const contextData = {};
    const queryBase = { teamId }; // Base query for team context
    let clientQuery = { ...queryBase };
    let projectQuery = { ...queryBase };

    let clientId = event.queryStringParameters?.clientId || null;

    if (clientId && ObjectId.isValid(clientId)) {
      clientQuery._id = new ObjectId(clientId);
      projectQuery.clientId = clientId; // Filter projects by client
    }
    if (projectId && ObjectId.isValid(projectId)) {
      projectQuery._id = new ObjectId(projectId);
      // If project ID is given, try to infer client ID if not provided
      if (!clientId) {
        const projectForClient = await db.collection('projects').findOne(projectQuery, { projection: { clientId: 1 } });
        if (projectForClient?.clientId) {
          clientQuery._id = new ObjectId(projectForClient.clientId);
          clientId = projectForClient.clientId; // Update clientId for other queries
        }
      }
    }

    // Fetch Client Info
    if (contextOptions.clientInfo && clientId) {
      console.log("Fetching client info...");
      contextData.clientInfo = await db.collection('clients').findOne(clientQuery, 
        { projection: { name: 1, industry: 1, contactPerson: 1, email: 1, engagementStart: 1, priority: 1 } }
      );
    }

    // Fetch Project Info
    if (contextOptions.projectInfo && projectId) {
      console.log("Fetching project info...");
      contextData.projectInfo = await db.collection('projects').findOne(projectQuery,
        { projection: { title: 1, description: 1, status: 1, startDate: 1, endDate: 1, budget: 1, goals: 1 } }
      );
    }

    // Fetch All Notes for Team/Client/Project
    if (contextOptions.allNotes) {
      console.log("Fetching all notes...");
      const notesQuery = { ...queryBase }; // Start with teamId
      if (projectId) notesQuery.projectId = projectId; // Prioritize project ID
      else if (clientId) notesQuery.clientId = clientId;
      contextData.allNotes = await db.collection('notes').find(notesQuery)
        .sort({ createdAt: -1 }).limit(20) // Limit notes fetched
        .project({ title: 1, createdAt: 1 })
        .toArray();
    }

    // Fetch Past Summaries (Notes tagged 'braindump-summary')
    if (contextOptions.pastSummaries) {
      console.log("Fetching past summaries...");
      const summaryQuery = { ...queryBase, tags: 'braindump-summary' }; // Add tag filter
      if (projectId) summaryQuery.projectId = projectId; // Prioritize project ID
      else if (clientId) summaryQuery.clientId = clientId;
      contextData.pastSummaries = await db.collection('notes').find(summaryQuery)
        .sort({ createdAt: -1 }).limit(10) // Limit summaries
        .project({ title: 1, createdAt: 1 })
        .toArray();
    }

    // Fetch Tasks for Team/Client/Project
    if (contextOptions.tasks) {
      console.log("Fetching tasks...");
      const tasksQuery = { ...queryBase };
      if (projectId) tasksQuery.projectId = projectId; // Prioritize project ID
      else if (clientId) {
        // If only clientId, need to find projects for that client first
        const clientProjects = await db.collection('projects').find({ clientId: clientId, teamId }, { projection: { _id: 1 } }).toArray();
        const projectIds = clientProjects.map(p => p._id.toString());
        if (projectIds.length > 0) {
          tasksQuery.projectId = { $in: projectIds }; // Tasks belonging to any of the client's projects
        } else {
          tasksQuery.projectId = null; // No projects for this client
        }
      }
      contextData.tasks = await db.collection('tasks').find(tasksQuery)
        .sort({ dueDate: 1 }).limit(25) // Limit tasks
        .project({ title: 1, status: 1, dueDate: 1 })
        .toArray();
    }
    
    // Fetch Campaigns for Team/Client/Project
    if (contextOptions.campaigns) {
      console.log("Fetching campaigns...");
      const campaignsQuery = { ...queryBase };
      if (projectId) campaignsQuery.projectId = projectId;
      else if (clientId) campaignsQuery.clientId = clientId;
      contextData.campaigns = await db.collection('campaigns').find(campaignsQuery)
        .sort({ endDate: -1 }).limit(10)
        .project({ title: 1, status: 1, endDate: 1 })
        .toArray();
    }
    
    // Fetch Calendar Events for Team/Client/Project
    if (contextOptions.calendarEvents) {
      console.log("Fetching calendar events...");
      const eventsQuery = { ...queryBase };
      if (projectId) eventsQuery.projectId = projectId;
      else if (clientId) eventsQuery.clientId = clientId;
      // Add date range filter - e.g., next 30 days
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 30);
      eventsQuery.start = { $gte: startDate, $lte: endDate }; // Assuming 'start' field exists
      
      contextData.calendarEvents = await db.collection('calendarEvents').find(eventsQuery)
        .sort({ start: 1 }).limit(15)
        .project({ title: 1, start: 1, date: 1 })
        .toArray();
    }

    console.log("Context Data Fetched:", Object.keys(contextData));
    return createResponse(200, contextData);

  } catch (error) {
    console.error('Error fetching context data:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 