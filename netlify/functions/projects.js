const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest, authenticateApiKeyRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Project Creation
const ProjectCreateSchema = z.object({
    title: z.string().min(1, "Project title is required").max(200),
    name: z.string().min(1, "Project name is required").max(200).optional(), // Allow 'name' field as well
    description: z.string().max(5000).optional(),
    status: z.string().optional().default('Planning'),
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }), // Client required
    startDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
    dueDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
    tags: z.array(z.string()).optional(),
    // Add other fields like budget, tags if needed
}).refine(data => data.title || data.name, {
    message: "Either title or name must be provided",
    path: ["title"]
});

// For updates, all fields are optional
const ProjectUpdateSchema = z.object({
    title: z.string().min(1, "Project title is required").max(200).optional(),
    name: z.string().min(1, "Project name is required").max(200).optional(),
    description: z.string().max(5000).optional(),
    status: z.string().optional(),
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }).optional(),
    startDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
    dueDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
    tags: z.array(z.string()).optional(),
    // Add other fields like budget, tags if needed
});

// Helper function to sync project with calendar
async function syncProjectWithCalendar(db, project, operation) {
  try {
    // Only sync projects with due dates
    if (!project.dueDate) return;
    
    const calendarCollection = db.collection('calendarEvents');
    
    if (operation === 'create' || operation === 'update') {
      // Check if calendar event already exists for this project
      const existingEvent = await calendarCollection.findOne({ projectId: project.id, taskId: null });
      
      const eventData = {
        title: `Project Due: ${project.title}`,
        start: project.dueDate, // Use due date as event start
        end: project.dueDate,   // Same day for now
        allDay: true,           // Project due dates are typically all-day events
        description: project.description || '',
        color: project.status === 'Done' ? 'green' : 'orange',
        projectId: project.id,  // Reference to the original project
        clientId: project.clientId,
        taskId: null,           // Not associated with a specific task
        teamId: project.teamId,
        userId: project.createdBy,
        updatedAt: new Date(),
      };
      
      if (existingEvent) {
        // Update existing event
        await calendarCollection.updateOne(
          { _id: existingEvent._id },
          { $set: eventData }
        );
      } else {
        // Create new event
        eventData.createdAt = new Date();
        await calendarCollection.insertOne(eventData);
      }
    } else if (operation === 'delete') {
      // Delete the calendar event when the project is deleted
      await calendarCollection.deleteOne({ projectId: project.id, taskId: null });
    }
  } catch (error) {
    console.error('Error syncing project with calendar:', error);
    // Don't throw error - this is a background operation that shouldn't affect the main project action
  }
}

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.includes('lc_sk_')) { 
        authContext = await authenticateRequest(event); 
    } else if (authHeader && authHeader.includes('lc_sk_')) {
        authContext = await authenticateApiKeyRequest(event);
        // Scope Check
        if (event.httpMethod === 'GET' && !authContext.scopes?.includes('read:projects')) {
            return createErrorResponse(403, 'Forbidden', 'API key does not have permission to read projects');
        }
        if (['POST', 'PUT', 'DELETE'].includes(event.httpMethod) && !authContext.scopes?.includes('write:projects')) {
            return createErrorResponse(403, 'Forbidden', 'API key does not have permission to write projects');
        }
    } else {
        return createErrorResponse(401, 'Unauthorized', 'Authorization header missing or invalid.');
    }
  } catch (errorResponse) {
    console.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  // Extract project ID from path if present
  let projectId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2) {
    const potentialId = pathParts[pathParts.length - 1];
    if (ObjectId.isValid(potentialId)) {
      projectId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const projectsCollection = db.collection('projects');

    // GET: List projects for the team or get a specific project
    if (event.httpMethod === 'GET') {
      if (projectId) {
        // Get a specific project
        const project = await projectsCollection.findOne({
          _id: new ObjectId(projectId),
          teamId: teamId
        });
        
        if (!project) {
          return createErrorResponse(404, 'Project not found');
        }
        
        project.id = project._id.toString();
        delete project._id;
        project.tags = Array.isArray(project.tags) ? project.tags : [];
        
        return createResponse(200, project);
      } else {
        // List all projects for the team with filters
        const query = { teamId };
        const { clientId, status } = event.queryStringParameters || {};
        if (clientId && ObjectId.isValid(clientId)) query.clientId = clientId;
        if (status) query.status = status;

        const projects = await projectsCollection.find(query).toArray(); 
        const formattedProjects = projects.map(p => {
          // Ensure projects always have tags property as an array
          return { 
            ...p, 
            id: p._id.toString(), 
            _id: undefined,
            tags: Array.isArray(p.tags) ? p.tags : [] 
          };
        });
        return createResponse(200, formattedProjects);
      }
    }

    // POST: Create a new project
    else if (event.httpMethod === 'POST') {
        let data;
        try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
        
        const validationResult = ProjectCreateSchema.safeParse(data);
        if (!validationResult.success) {
            return createErrorResponse(400, 'Validation failed', validationResult.error.format());
        }
        const validatedData = validationResult.data;
        
        // Check if client exists
        const client = await db.collection('clients').findOne({
            _id: new ObjectId(validatedData.clientId),
            teamId: teamId
        });
        if (!client) {
            return createErrorResponse(400, `Client with ID ${validatedData.clientId} not found or not associated with this team`);
        }

        const now = new Date();
        const newProject = {
            title: validatedData.title,
            name: validatedData.name,
            description: validatedData.description || '',
            status: validatedData.status || 'Planning',
            clientId: validatedData.clientId,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            tags: Array.isArray(validatedData.tags) ? validatedData.tags : [],
            teamId: teamId,
            createdAt: now,
            updatedAt: now,
            createdBy: userId
        };

        const result = await projectsCollection.insertOne(newProject);
        const createdProject = { ...newProject, id: result.insertedId.toString() };
        delete createdProject._id;

        // Sync project with calendar
        await syncProjectWithCalendar(db, createdProject, 'create');

        return createResponse(201, createdProject);
    }
    
    // PUT: Update an existing project
    else if (event.httpMethod === 'PUT' && projectId) {
      console.log(`Processing PUT request for project ${projectId}`);
      
      let data;
      try { 
        data = JSON.parse(event.body); 
        console.log('Request body:', data);
      } catch (e) { 
        console.error('Invalid JSON in project update:', e);
        return createErrorResponse(400, 'Invalid JSON'); 
      }
      
      const validationResult = ProjectUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Validation failed for project update:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      console.log('Validated data:', validatedData);
      
      // Check if the project exists and belongs to the team
      const projectExists = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        teamId: teamId
      });
      
      if (!projectExists) {
        console.error(`Project ${projectId} not found for team ${teamId}`);
        return createErrorResponse(404, 'Project not found or not associated with this team');
      }
      
      console.log('Found existing project:', projectExists);
      
      // Check if client exists if it's being updated
      if (validatedData.clientId && validatedData.clientId !== projectExists.clientId) {
        const clientExists = await db.collection('clients').findOne({
          _id: new ObjectId(validatedData.clientId),
          teamId: teamId
        });
        
        if (!clientExists) {
          console.error(`Client ${validatedData.clientId} not found for team ${teamId}`);
          return createErrorResponse(400, `Client with ID ${validatedData.clientId} not found or not associated with this team`);
        }
      }
      
      // If clientId is not provided, use the existing one to avoid losing it
      if (!validatedData.clientId && projectExists.clientId) {
        validatedData.clientId = projectExists.clientId;
      }
      
      // Prepare update data
      const updateData = { ...validatedData, updatedAt: new Date() };
      
      // Handle title/name field consistency
      if (validatedData.name && !validatedData.title) {
        updateData.title = validatedData.name;
      } else if (validatedData.title && !validatedData.name) {
        updateData.name = validatedData.title;
      }
      
      // Convert date if provided
      if (updateData.dueDate) {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      
      // Convert start date if provided
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      
      // Ensure tags are always an array
      if (updateData.tags) {
        updateData.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
      }
      
      // Don't allow updating these fields
      delete updateData.teamId;
      delete updateData.createdAt;
      delete updateData.createdBy;
      
      console.log('Final update data:', updateData);
      
      // Update the project
      const updateResult = await projectsCollection.updateOne(
        { _id: new ObjectId(projectId), teamId: teamId },
        { $set: updateData }
      );
      
      console.log('Update result:', updateResult);
      
      // Fetch the updated project
      const updatedProject = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
      updatedProject.id = updatedProject._id.toString();
      delete updatedProject._id;
      
      // Sync project with calendar
      await syncProjectWithCalendar(db, updatedProject, 'update');

      return createResponse(200, updatedProject);
    }
    
    // DELETE: Delete a project
    else if (event.httpMethod === 'DELETE' && projectId) {
      // Check if the project exists and belongs to the team
      const projectExists = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        teamId: teamId
      });
      
      if (!projectExists) {
        return createErrorResponse(404, 'Project not found or not associated with this team');
      }
      
      // Format project for calendar sync
      const formattedProject = {
        ...projectExists,
        id: projectExists._id.toString(),
      };
      
      // Delete project
      await projectsCollection.deleteOne({ _id: new ObjectId(projectId), teamId: teamId });
      
      // TODO: Consider deleting related tasks and other dependencies
      // This requires additional database operations
      
      // Sync project with calendar
      await syncProjectWithCalendar(db, formattedProject, 'delete');
      
      return createResponse(200, { message: 'Project deleted successfully' });
    }

    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    console.error('Error in projects handler:', error);
    if (error.statusCode) { return error; }
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 