const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // New unified authentication
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { z } = require('zod');
const logger = require('./utils/logger');

const ProjectUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  teamMembers: z.array(z.any()).optional(),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    // Use the new unified authentication method (works for both JWT and API key)
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:projects'] 
        : ['write:projects']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  // Extract project ID from path
  const pathParts = event.path.split('/');
  const projectId = pathParts[pathParts.length - 1]; // Get the last path segment

  if (!projectId || !ObjectId.isValid(projectId)) {
    return createErrorResponse(400, 'Invalid or missing Project ID');
  }

  try {
    const { db } = await connectToDb();
    const projectsCollection = db.collection('projects');
    const tasksCollection = db.collection('tasks'); // For deleting related tasks

    // Find the project, ensuring it belongs to the user's team
    const query = { _id: new ObjectId(projectId), teamId, ...notDeleted };

    // GET: Fetch a single project
    if (event.httpMethod === 'GET') {
      const project = await projectsCollection.findOne(query);

      if (!project) {
        return createErrorResponse(404, 'Project not found');
      }

      // Optionally fetch associated client info
      let clientInfo = null;
      if (project.clientId && ObjectId.isValid(project.clientId)) {
        const client = await db.collection('clients').findOne({ _id: new ObjectId(project.clientId), teamId });
        if (client) {
          clientInfo = { id: client._id.toString(), name: client.name };
        }
      }

      const formattedProject = {
        ...project,
        id: project._id.toString(),
        client: clientInfo,
        _id: undefined
      };

      return createResponse(200, formattedProject);
    }

    // PUT: Update a project
    else if (event.httpMethod === 'PUT') {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = ProjectUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const updateData = { ...validationResult.data };
      delete updateData.id; // Don't update the id field
      delete updateData._id; // Don't update the _id field
      delete updateData.teamId; // Prevent changing teamId
      delete updateData.createdBy; // Prevent changing createdBy
      delete updateData.createdAt; // Prevent changing createdAt
      delete updateData.deletedAt;
      delete updateData.deletedBy;

      if (updateData.clientId && !ObjectId.isValid(updateData.clientId)) {
          return createErrorResponse(400, 'Invalid Client ID format provided for update');
      }
      
      // Ensure client exists if clientId is being updated
      if (updateData.clientId) {
          const clientExists = await db.collection('clients').findOne({
              _id: new ObjectId(updateData.clientId),
              teamId: teamId
          });
          if (!clientExists) {
              return createErrorResponse(404, 'Client specified for update not found or not associated with this team');
          }
      }

      updateData.updatedAt = new Date();

      const result = await projectsCollection.updateOne(query, { $set: updateData });

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'Project not found or you do not have permission to update it');
      }

      const updatedProject = await projectsCollection.findOne(query);
      const formattedUpdatedProject = { ...updatedProject, id: updatedProject._id.toString(), _id: undefined };

      return createResponse(200, formattedUpdatedProject);
    }

    // DELETE: Delete a project
    else if (event.httpMethod === 'DELETE') {
      // First, ensure the project exists and belongs to the team
      const projectToDelete = await projectsCollection.findOne(query);
      if (!projectToDelete) {
          return createErrorResponse(404, 'Project not found or you do not have permission to delete it');
      }
      
      // Soft delete the project
      const deleteProjectResult = await softDelete(projectsCollection, query, userId);

      if (deleteProjectResult.matchedCount === 0) {
        // This case should ideally not be reached if findOne succeeded, but good for safety
        return createErrorResponse(404, 'Project not found or could not be deleted');
      }

      // Cascade soft-delete associated tasks
      await tasksCollection.updateMany(
        { projectId: projectId, teamId: teamId, ...notDeleted },
        { $set: { deletedAt: new Date(), deletedBy: userId } }
      );

      return createResponse(200, { message: 'Project and associated tasks deleted successfully' });
    }

    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error(`Error handling project/${projectId} request:`, error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
}; 