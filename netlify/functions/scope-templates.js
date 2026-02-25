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

// Deliverable schema
const DeliverableSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Deliverable title is required'),
  description: z.string().optional().default(''),
  quantity: z.number().min(0).default(1),
  unit: z.string().default('unit'),
  rate: z.number().min(0).default(0),
  estimatedHours: z.number().min(0).default(0),
});

// Scope template schema validation
const ScopeTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().default(''),
  deliverables: z.array(DeliverableSchema).optional().default([]),
  terms: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

// Update schema - all fields optional
const ScopeTemplateUpdateSchema = ScopeTemplateSchema.partial();

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  logger.debug(`Processing ${event.httpMethod} request for scope-templates`);

  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:scope-templates']
        : ['write:scope-templates']
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

  // Extract scope template ID from path if available
  const pathParts = event.path.split('/');
  const scopeTemplatesIndex = pathParts.indexOf('scope-templates');
  let specificTemplateId = null;
  if (scopeTemplatesIndex !== -1 && pathParts.length > scopeTemplatesIndex + 1) {
    const potentialId = pathParts[scopeTemplatesIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificTemplateId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const scopeTemplatesCollection = db.collection('scopeTemplates');

    // GET: Fetch scope templates (either all for a team or a specific template)
    if (event.httpMethod === 'GET') {
      // If requesting a specific template
      if (specificTemplateId) {
        logger.debug(`Fetching specific scope template: ${specificTemplateId}`);
        try {
          const template = await scopeTemplatesCollection.findOne({
            _id: new ObjectId(specificTemplateId),
            teamId: teamId,
            ...notDeleted
          });

          if (!template) {
            logger.error(`Scope template ${specificTemplateId} not found`);
            return createErrorResponse(404, 'Scope template not found');
          }

          // Return the template with id instead of _id
          template.id = template._id.toString();
          delete template._id;

          return createResponse(200, template);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid scope template ID format');
          }
          throw error; // Let the main catch block handle it
        }
      }
      // Otherwise, fetch all scope templates for the authenticated team
      else {
        const qp = event.queryStringParameters || {};
        const query = { teamId, ...notDeleted };
        const formatResource = r => { r.id = r._id.toString(); delete r._id; return r; };

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [templates, total] = await Promise.all([
            scopeTemplatesCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            scopeTemplatesCollection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(templates.map(formatResource), total, page, limit));
        }

        const templates = await scopeTemplatesCollection.find(query).sort({ createdAt: -1 }).toArray();
        return createResponse(200, templates.map(formatResource));
      }
    }

    // POST: Create a new scope template
    else if (event.httpMethod === 'POST') {
      logger.debug('Creating a new scope template');

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = ScopeTemplateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Generate IDs for deliverables that don't have them
      if (validatedData.deliverables && validatedData.deliverables.length > 0) {
        validatedData.deliverables = validatedData.deliverables.map(d => ({
          ...d,
          id: d.id || new ObjectId().toString(),
        }));
      }

      // Add metadata and ensure teamId
      const newTemplate = {
        ...validatedData,
        teamId: teamId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.debug('Creating scope template:', newTemplate);
      const result = await scopeTemplatesCollection.insertOne(newTemplate);

      // Get the newly created template
      const createdTemplate = await scopeTemplatesCollection.findOne({ _id: result.insertedId, teamId });
      createdTemplate.id = createdTemplate._id.toString();
      delete createdTemplate._id;

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'scopeTemplate', resourceId: result.insertedId.toString() });

      return createResponse(201, createdTemplate);
    }

    // PUT: Update an existing scope template
    else if (event.httpMethod === 'PUT' && specificTemplateId) {
      logger.debug(`Updating scope template: ${specificTemplateId}`);

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = ScopeTemplateUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Find the template to check if it exists and belongs to the user's team
      const templateExists = await scopeTemplatesCollection.findOne({
        _id: new ObjectId(specificTemplateId),
        teamId: teamId,
        ...notDeleted
      });

      if (!templateExists) {
        logger.error(`Scope template ${specificTemplateId} not found`);
        return createErrorResponse(404, 'Scope template not found');
      }

      // Generate IDs for any new deliverables that don't have them
      if (validatedData.deliverables && validatedData.deliverables.length > 0) {
        validatedData.deliverables = validatedData.deliverables.map(d => ({
          ...d,
          id: d.id || new ObjectId().toString(),
        }));
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

      // Update the template
      const result = await scopeTemplatesCollection.updateOne(
        { _id: new ObjectId(specificTemplateId), teamId: teamId },
        { $set: updateData }
      );

      // Get the updated template
      const updatedTemplate = await scopeTemplatesCollection.findOne({ _id: new ObjectId(specificTemplateId), teamId: teamId });
      updatedTemplate.id = updatedTemplate._id.toString();
      delete updatedTemplate._id;

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'scopeTemplate', resourceId: specificTemplateId });

      return createResponse(200, updatedTemplate);
    }

    // DELETE: Delete an existing scope template
    else if (event.httpMethod === 'DELETE' && specificTemplateId) {
      logger.debug(`Deleting scope template: ${specificTemplateId}`);

      // Check if the template exists and belongs to the user's team
      const templateExists = await scopeTemplatesCollection.findOne({
        _id: new ObjectId(specificTemplateId),
        teamId: teamId,
        ...notDeleted
      });

      if (!templateExists) {
        logger.error(`Scope template ${specificTemplateId} not found`);
        return createErrorResponse(404, 'Scope template not found');
      }

      // Soft delete the template
      const result = await softDelete(scopeTemplatesCollection, {
        _id: new ObjectId(specificTemplateId),
        teamId: teamId,
        ...notDeleted
      }, userId);

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'scopeTemplate', resourceId: specificTemplateId });

      return createResponse(200, { message: 'Scope template deleted successfully' });
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
