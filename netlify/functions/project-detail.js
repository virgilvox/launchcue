const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // New unified authentication
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

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
    console.error("Authentication failed:", errorResponse.body || errorResponse);
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
    const query = { _id: new ObjectId(projectId), teamId };

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
      const data = JSON.parse(event.body);
      const updateData = { ...data }; // Copy data to avoid modifying original
      delete updateData.id; // Don't update the id field
      delete updateData._id; // Don't update the _id field
      delete updateData.teamId; // Prevent changing teamId
      delete updateData.createdBy; // Prevent changing createdBy
      delete updateData.createdAt; // Prevent changing createdAt

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
      
      // Delete the project
      const deleteProjectResult = await projectsCollection.deleteOne(query);

      if (deleteProjectResult.deletedCount === 0) {
        // This case should ideally not be reached if findOne succeeded, but good for safety
        return createErrorResponse(404, 'Project not found or could not be deleted');
      }

      // Optional: Delete associated tasks (consider cascading implications)
      const deleteTaskResult = await tasksCollection.deleteMany({ projectId: projectId, teamId: teamId });
      console.log(`Deleted ${deleteTaskResult.deletedCount} tasks associated with project ${projectId}`);

      return createResponse(200, { message: 'Project and associated tasks deleted successfully' });
    }

    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    console.error(`Error handling project/${projectId} request:`, error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 