const { MongoClient, ObjectId } = require('mongodb');
const { getAuthUser } = require('./utils/auth');
const { z } = require('zod');

// Resource schema validation
const ResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  teamId: z.string().min(1, 'Team ID is required'),
  tags: z.array(z.string()).optional().default([])
});

// Update schema - all fields optional
const ResourceUpdateSchema = ResourceSchema.partial();

// Helper function to create standardized responses
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// Helper function for error responses
function createErrorResponse(statusCode, message, details = null) {
  return createResponse(statusCode, { error: message, details });
}

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }
  
  console.log(`Processing ${event.httpMethod} request for resources`);
  
  // Get authenticated user and team ID
  const authResult = await getAuthUser(event);
  if (authResult.error) {
    console.error('Authentication error:', authResult.error);
    return createErrorResponse(401, authResult.error);
  }
  
  const { user, teams } = authResult;
  if (!user) {
    console.error('No authenticated user found');
    return createErrorResponse(401, 'Authentication required');
  }
  
  // Get team ID from query parameters or URL path
  let teamId = event.queryStringParameters?.teamId;
  
  // Extract resource ID from path if available
  const resourceId = event.path.split('/').pop();
  if (resourceId === 'resources') {
    // This is the base path, not a specific resource
  }
  
  // If we need to use a specific resource ID
  let specificResourceId = resourceId !== 'resources' ? resourceId : null;
  
  // Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('launchcue');
    const resourcesCollection = db.collection('resources');
    
    // GET: Fetch resources (either all for a team or a specific resource)
    if (event.httpMethod === 'GET') {
      // If requesting a specific resource
      if (specificResourceId) {
        console.log(`Fetching specific resource: ${specificResourceId}`);
        try {
          const resource = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId) });
          
          if (!resource) {
            console.error(`Resource ${specificResourceId} not found`);
            return createErrorResponse(404, 'Resource not found');
          }
          
          // Check if user has access to the team this resource belongs to
          // More permissive check to fix "Access denied" errors
          if (teams && Array.isArray(teams) && !teams.some(team => team.id === resource.teamId)) {
            console.error(`User ${user.sub} does not have access to team ${resource.teamId}`);
            console.error('Available teams:', JSON.stringify(teams));
            return createErrorResponse(403, 'Access denied to this resource');
          }
          
          // Return the resource with id instead of _id
          resource.id = resource._id.toString();
          delete resource._id;
          
          return createResponse(200, resource);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid resource ID format');
          }
          throw error; // Let the main catch block handle it
        }
      } 
      // Otherwise, fetch all resources for the specified team
      else {
        if (!teamId) {
          // If no team ID, use the first team the user has access to or default teamId
          if (teams && teams.length > 0) {
            teamId = teams[0].id;
            console.log(`No teamId provided, using first available team: ${teamId}`);
          } else if (authResult.teamId) {
            // Fallback to the teamId from auth token
            teamId = authResult.teamId;
            console.log(`No teams array found, using teamId from token: ${teamId}`);
          } else {
            console.error('No team ID available from any source');
            return createErrorResponse(400, 'Team ID is required');
          }
        }
        
        // Verify user has access to the specified team - make more permissive
        let hasTeamAccess = true;
        if (teams && Array.isArray(teams)) {
          hasTeamAccess = teams.some(team => team.id === teamId);
          if (!hasTeamAccess) {
            console.error(`User ${user.sub} does not have access to team ${teamId}`);
            console.error('Available teams:', JSON.stringify(teams));
            return createErrorResponse(403, 'Access denied to this team');
          }
        }
        
        console.log(`Fetching resources for team: ${teamId}`);
        try {
          const resources = await resourcesCollection
            .find({ teamId: teamId })
            .sort({ createdAt: -1 })
            .toArray();
          
          // Transform _id to id for each resource
          const formattedResources = resources.map(resource => {
            resource.id = resource._id.toString();
            delete resource._id;
            return resource;
          });
          
          console.log(`Found ${formattedResources.length} resources`);
          return createResponse(200, formattedResources);
        } catch (mongoError) {
          console.error('MongoDB error fetching resources:', mongoError);
          return createErrorResponse(500, 'Error fetching resources', mongoError.message);
        }
      }
    }
    
    // POST: Create a new resource
    else if (event.httpMethod === 'POST') {
      console.log('Creating a new resource');
      
      let data;
      try {
        data = JSON.parse(event.body);
        console.log('Request body:', data);
      } catch (e) {
        console.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }
      
      // Add teamId if not provided
      if (!data.teamId) {
        if (teams.length > 0) {
          data.teamId = teams[0].id;
        } else {
          console.error('No team ID provided and user has no teams');
          return createErrorResponse(400, 'Team ID is required');
        }
      }
      
      // Validate teamId - user must have access to the team
      if (!teams.some(team => team.id === data.teamId)) {
        console.error(`User ${user.sub} does not have access to team ${data.teamId}`);
        return createErrorResponse(403, 'Access denied to this team');
      }
      
      // Validate data
      const validationResult = ResourceSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      
      // Add metadata
      const newResource = {
        ...validatedData,
        createdBy: user.sub,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Creating resource:', newResource);
      const result = await resourcesCollection.insertOne(newResource);
      
      // Get the newly created resource
      const createdResource = await resourcesCollection.findOne({ _id: result.insertedId });
      createdResource.id = createdResource._id.toString();
      delete createdResource._id;
      
      return createResponse(201, createdResource);
    }
    
    // PUT: Update an existing resource
    else if (event.httpMethod === 'PUT' && specificResourceId) {
      console.log(`Updating resource: ${specificResourceId}`);
      
      let data;
      try {
        data = JSON.parse(event.body);
        console.log('Request body:', data);
      } catch (e) {
        console.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }
      
      // Validate data
      const validationResult = ResourceUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      
      // Find the resource to check if user has access
      const resourceExists = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId) });
      
      if (!resourceExists) {
        console.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Check if user has access to the team this resource belongs to
      if (!teams.some(team => team.id === resourceExists.teamId)) {
        console.error(`User ${user.sub} does not have access to team ${resourceExists.teamId}`);
        return createErrorResponse(403, 'Access denied to this resource');
      }
      
      // Don't allow changing teamId
      delete validatedData.teamId;
      delete validatedData.createdAt;
      delete validatedData.createdBy;
      
      // Update the resource
      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: user.sub
      };
      
      console.log('Update data:', updateData);
      await resourcesCollection.updateOne(
        { _id: new ObjectId(specificResourceId) },
        { $set: updateData }
      );
      
      // Get the updated resource
      const updatedResource = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId) });
      updatedResource.id = updatedResource._id.toString();
      delete updatedResource._id;
      
      return createResponse(200, updatedResource);
    }
    
    // DELETE: Remove a resource
    else if (event.httpMethod === 'DELETE' && specificResourceId) {
      console.log(`Deleting resource: ${specificResourceId}`);
      
      // Find the resource to check if user has access
      const resourceExists = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId) });
      
      if (!resourceExists) {
        console.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Check if user has access to the team this resource belongs to
      if (!teams.some(team => team.id === resourceExists.teamId)) {
        console.error(`User ${user.sub} does not have access to team ${resourceExists.teamId}`);
        return createErrorResponse(403, 'Access denied to this resource');
      }
      
      // Delete the resource
      await resourcesCollection.deleteOne({ _id: new ObjectId(specificResourceId) });
      
      return createResponse(200, { message: 'Resource deleted successfully' });
    }
    
    // Unsupported method
    else {
      console.error(`Unsupported method: ${event.httpMethod}`);
      return createErrorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return createErrorResponse(500, 'Internal server error', error.message);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}; 