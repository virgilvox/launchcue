const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Resource schema validation
const ResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

// Update schema - all fields optional
const ResourceUpdateSchema = ResourceSchema.partial();

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;
  
  console.log(`Processing ${event.httpMethod} request for resources`);
  
  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:resources'] 
        : ['write:resources']
    });
  } catch (errorResponse) {
    console.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  
  // Use userId and teamId from the authentication context
  const { userId, teamId } = authContext;
  
  // Extract resource ID from path if available
  const pathParts = event.path.split('/');
  const resourcesIndex = pathParts.indexOf('resources');
  let specificResourceId = null;
  if (resourcesIndex !== -1 && pathParts.length > resourcesIndex + 1) {
    const potentialId = pathParts[resourcesIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificResourceId = potentialId;
    }
  }
  
  try {
    const { db } = await connectToDb();
    const resourcesCollection = db.collection('resources');
    
    // GET: Fetch resources (either all for a team or a specific resource)
    if (event.httpMethod === 'GET') {
      // If requesting a specific resource
      if (specificResourceId) {
        console.log(`Fetching specific resource: ${specificResourceId}`);
        try {
          const resource = await resourcesCollection.findOne({ 
            _id: new ObjectId(specificResourceId),
            teamId: teamId
          });
          
          if (!resource) {
            console.error(`Resource ${specificResourceId} not found`);
            return createErrorResponse(404, 'Resource not found');
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
      // Otherwise, fetch all resources for the authenticated team
      else {
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
      
      // Validate data
      const validationResult = ResourceSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      
      // Add metadata and ensure teamId
      const newResource = {
        ...validatedData,
        teamId: teamId,
        createdBy: userId,
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
      
      // Find the resource to check if it exists and belongs to the user's team
      const resourceExists = await resourcesCollection.findOne({ 
        _id: new ObjectId(specificResourceId),
        teamId: teamId
      });
      
      if (!resourceExists) {
        console.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Prepare update data (don't allow changing teamId or createdBy)
      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: userId
      };
      
      // Remove fields that should not be updated
      delete updateData.teamId;
      delete updateData.createdBy;
      delete updateData.createdAt;
      
      // Update the resource
      const result = await resourcesCollection.updateOne(
        { _id: new ObjectId(specificResourceId), teamId: teamId },
        { $set: updateData }
      );
      
      // Get the updated resource
      const updatedResource = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId) });
      updatedResource.id = updatedResource._id.toString();
      delete updatedResource._id;
      
      return createResponse(200, updatedResource);
    }
    
    // DELETE: Delete an existing resource
    else if (event.httpMethod === 'DELETE' && specificResourceId) {
      console.log(`Deleting resource: ${specificResourceId}`);
      
      // Check if the resource exists and belongs to the user's team
      const resourceExists = await resourcesCollection.findOne({ 
        _id: new ObjectId(specificResourceId),
        teamId: teamId
      });
      
      if (!resourceExists) {
        console.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Delete the resource
      const result = await resourcesCollection.deleteOne({ 
        _id: new ObjectId(specificResourceId),
        teamId: teamId
      });
      
      return createResponse(200, { message: 'Resource deleted successfully' });
    }
    
    // Unsupported method
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 