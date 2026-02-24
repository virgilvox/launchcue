const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');
const { notDeleted, softDelete } = require('./utils/softDelete');

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
  
  logger.debug(`Processing ${event.httpMethod} request for resources`);
  
  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:resources'] 
        : ['write:resources']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  
  // Use userId and teamId from the authentication context
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

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
        logger.debug(`Fetching specific resource: ${specificResourceId}`);
        try {
          const resource = await resourcesCollection.findOne({
            _id: new ObjectId(specificResourceId),
            teamId: teamId,
            ...notDeleted
          });
          
          if (!resource) {
            logger.error(`Resource ${specificResourceId} not found`);
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
        const qp = event.queryStringParameters || {};
        const query = { teamId, ...notDeleted };
        const formatResource = r => { r.id = r._id.toString(); delete r._id; return r; };

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [resources, total] = await Promise.all([
            resourcesCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            resourcesCollection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(resources.map(formatResource), total, page, limit));
        }

        const resources = await resourcesCollection.find(query).sort({ createdAt: -1 }).toArray();
        return createResponse(200, resources.map(formatResource));
      }
    }
    
    // POST: Create a new resource
    else if (event.httpMethod === 'POST') {
      logger.debug('Creating a new resource');
      
      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }
      
      // Validate data
      const validationResult = ResourceSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
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
      
      logger.debug('Creating resource:', newResource);
      const result = await resourcesCollection.insertOne(newResource);
      
      // Get the newly created resource
      const createdResource = await resourcesCollection.findOne({ _id: result.insertedId });
      createdResource.id = createdResource._id.toString();
      delete createdResource._id;

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'resource', resourceId: result.insertedId.toString() });

      return createResponse(201, createdResource);
    }
    
    // PUT: Update an existing resource
    else if (event.httpMethod === 'PUT' && specificResourceId) {
      logger.debug(`Updating resource: ${specificResourceId}`);
      
      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }
      
      // Validate data
      const validationResult = ResourceUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      
      // Find the resource to check if it exists and belongs to the user's team
      const resourceExists = await resourcesCollection.findOne({
        _id: new ObjectId(specificResourceId),
        teamId: teamId,
        ...notDeleted
      });
      
      if (!resourceExists) {
        logger.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Prepare update data (don't allow changing teamId or createdBy)
      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: userId
      };
      
      // Remove fields that should not be updated
      delete updateData._id;
      delete updateData.id;
      delete updateData.teamId;
      delete updateData.createdBy;
      delete updateData.createdAt;
      delete updateData.deletedAt;
      delete updateData.deletedBy;
      
      // Update the resource
      const result = await resourcesCollection.updateOne(
        { _id: new ObjectId(specificResourceId), teamId: teamId },
        { $set: updateData }
      );
      
      // Get the updated resource
      const updatedResource = await resourcesCollection.findOne({ _id: new ObjectId(specificResourceId), teamId: teamId });
      updatedResource.id = updatedResource._id.toString();
      delete updatedResource._id;

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'resource', resourceId: specificResourceId });

      return createResponse(200, updatedResource);
    }
    
    // DELETE: Delete an existing resource
    else if (event.httpMethod === 'DELETE' && specificResourceId) {
      logger.debug(`Deleting resource: ${specificResourceId}`);
      
      // Check if the resource exists and belongs to the user's team
      const resourceExists = await resourcesCollection.findOne({
        _id: new ObjectId(specificResourceId),
        teamId: teamId,
        ...notDeleted
      });
      
      if (!resourceExists) {
        logger.error(`Resource ${specificResourceId} not found`);
        return createErrorResponse(404, 'Resource not found');
      }
      
      // Soft delete the resource
      const result = await softDelete(resourcesCollection, {
        _id: new ObjectId(specificResourceId),
        teamId: teamId,
        ...notDeleted
      }, userId);

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'resource', resourceId: specificResourceId });

      return createResponse(200, { message: 'Resource deleted successfully' });
    }
    
    // Unsupported method
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error processing request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
}; 