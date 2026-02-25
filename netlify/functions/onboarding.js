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

// Schema definitions
const FormFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'select', 'checkbox', 'file']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional().default([]),
});

const StepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Step title is required'),
  description: z.string().optional().default(''),
  type: z.enum(['info', 'form', 'upload', 'approval']),
  required: z.boolean().default(true),
  formFields: z.array(FormFieldSchema).optional().default([]),
  completedAt: z.string().nullable().optional().default(null),
  completedBy: z.string().nullable().optional().default(null),
  response: z.record(z.unknown()).optional(),
});

const OnboardingSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  projectId: z.string().nullable().optional().default(null),
  title: z.string().min(1, 'Title is required').max(200),
  steps: z.array(StepSchema).optional().default([]),
});

// Update schema - all fields optional
const OnboardingUpdateSchema = OnboardingSchema.partial();

/**
 * Ensure every step and its formFields have an id.
 * Mutates the steps array in place for convenience.
 */
function ensureStepIds(steps) {
  if (!steps) return;
  for (const step of steps) {
    if (!step.id) {
      step.id = new ObjectId().toString();
    }
    if (step.formFields) {
      for (const field of step.formFields) {
        if (!field.id) {
          field.id = new ObjectId().toString();
        }
      }
    }
  }
}

/**
 * Compute checklist status from its steps.
 * Returns 'completed' | 'in-progress' | 'not-started'
 */
function computeStatus(steps) {
  if (!steps || steps.length === 0) return 'not-started';
  const completedCount = steps.filter(s => s.completedAt != null).length;
  if (completedCount === steps.length) return 'completed';
  if (completedCount > 0) return 'in-progress';
  return 'not-started';
}

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  logger.debug(`Processing ${event.httpMethod} request for onboarding`);

  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:clients']
        : ['write:clients']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }

  // Use userId and teamId from the authentication context
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  // Extract onboarding checklist ID from path if available
  const pathParts = event.path.split('/');
  const onboardingIndex = pathParts.indexOf('onboarding');
  let specificId = null;
  if (onboardingIndex !== -1 && pathParts.length > onboardingIndex + 1) {
    const potentialId = pathParts[onboardingIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('onboardingChecklists');

    // GET: Fetch onboarding checklists (list or single)
    if (event.httpMethod === 'GET') {
      // If requesting a specific checklist
      if (specificId) {
        logger.debug(`Fetching specific onboarding checklist: ${specificId}`);
        try {
          const checklist = await collection.findOne({
            _id: new ObjectId(specificId),
            teamId: teamId,
            ...notDeleted
          });

          if (!checklist) {
            logger.error(`Onboarding checklist ${specificId} not found`);
            return createErrorResponse(404, 'Onboarding checklist not found');
          }

          // Return with id instead of _id
          checklist.id = checklist._id.toString();
          delete checklist._id;

          return createResponse(200, checklist);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid onboarding checklist ID format');
          }
          throw error; // Let the main catch block handle it
        }
      }
      // Otherwise, fetch all for the authenticated team
      else {
        const qp = event.queryStringParameters || {};
        const query = { teamId, ...notDeleted };
        const formatChecklist = c => { c.id = c._id.toString(); delete c._id; return c; };

        // Optional filters
        if (qp.clientId) {
          query.clientId = qp.clientId;
        }
        if (qp.projectId) {
          query.projectId = qp.projectId;
        }

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [checklists, total] = await Promise.all([
            collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(checklists.map(formatChecklist), total, page, limit));
        }

        const checklists = await collection.find(query).sort({ createdAt: -1 }).toArray();
        return createResponse(200, checklists.map(formatChecklist));
      }
    }

    // POST: Create a new onboarding checklist
    else if (event.httpMethod === 'POST') {
      // RBAC: Only owner/admin can create onboarding checklists
      if (!authContext.role || !['owner', 'admin'].includes(authContext.role)) {
        return createErrorResponse(403, 'Forbidden: insufficient permissions');
      }
      logger.debug('Creating a new onboarding checklist');

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = OnboardingSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Generate IDs for steps and formFields that don't have them
      ensureStepIds(validatedData.steps);

      // Add metadata and ensure teamId
      const newChecklist = {
        ...validatedData,
        status: 'not-started',
        teamId: teamId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.debug('Creating onboarding checklist:', newChecklist);
      const result = await collection.insertOne(newChecklist);

      // Get the newly created checklist
      const createdChecklist = await collection.findOne({ _id: result.insertedId, teamId });
      createdChecklist.id = createdChecklist._id.toString();
      delete createdChecklist._id;

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'onboarding', resourceId: result.insertedId.toString() });

      return createResponse(201, createdChecklist);
    }

    // PUT: Update an existing onboarding checklist
    else if (event.httpMethod === 'PUT' && specificId) {
      // RBAC: Only owner/admin can update onboarding checklists
      if (!authContext.role || !['owner', 'admin'].includes(authContext.role)) {
        return createErrorResponse(403, 'Forbidden: insufficient permissions');
      }
      const qp = event.queryStringParameters || {};

      // Special action: complete a step
      if (qp.action === 'complete-step') {
        logger.debug(`Completing step on onboarding checklist: ${specificId}`);

        let data;
        try {
          data = JSON.parse(event.body);
          logger.debug('Request body:', data);
        } catch (e) {
          logger.error('Invalid JSON:', e);
          return createErrorResponse(400, 'Invalid JSON');
        }

        if (!data.stepId) {
          return createErrorResponse(400, 'stepId is required');
        }

        // Find the checklist
        const checklist = await collection.findOne({
          _id: new ObjectId(specificId),
          teamId: teamId,
          ...notDeleted
        });

        if (!checklist) {
          logger.error(`Onboarding checklist ${specificId} not found`);
          return createErrorResponse(404, 'Onboarding checklist not found');
        }

        // Find the step by ID
        const stepIndex = (checklist.steps || []).findIndex(s => s.id === data.stepId);
        if (stepIndex === -1) {
          return createErrorResponse(404, 'Step not found');
        }

        // Mark the step as completed
        checklist.steps[stepIndex].completedAt = new Date().toISOString();
        checklist.steps[stepIndex].completedBy = userId;

        // If response provided, set it
        if (data.response) {
          checklist.steps[stepIndex].response = data.response;
        }

        // Recompute checklist status
        const newStatus = computeStatus(checklist.steps);

        // Update the document
        await collection.updateOne(
          { _id: new ObjectId(specificId), teamId: teamId },
          {
            $set: {
              steps: checklist.steps,
              status: newStatus,
              updatedAt: new Date()
            }
          }
        );

        // Get the updated checklist
        const updatedChecklist = await collection.findOne({ _id: new ObjectId(specificId), teamId: teamId });
        updatedChecklist.id = updatedChecklist._id.toString();
        delete updatedChecklist._id;

        await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'onboarding', resourceId: specificId });

        return createResponse(200, updatedChecklist);
      }

      // Standard update
      logger.debug(`Updating onboarding checklist: ${specificId}`);

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = OnboardingUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Find the checklist to check if it exists and belongs to the user's team
      const checklistExists = await collection.findOne({
        _id: new ObjectId(specificId),
        teamId: teamId,
        ...notDeleted
      });

      if (!checklistExists) {
        logger.error(`Onboarding checklist ${specificId} not found`);
        return createErrorResponse(404, 'Onboarding checklist not found');
      }

      // Generate IDs for new steps/formFields
      if (validatedData.steps) {
        ensureStepIds(validatedData.steps);
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

      // Compute status based on steps
      // Use the new steps if provided, otherwise keep existing
      const stepsForStatus = updateData.steps || checklistExists.steps || [];
      updateData.status = computeStatus(stepsForStatus);

      // Update the checklist
      await collection.updateOne(
        { _id: new ObjectId(specificId), teamId: teamId },
        { $set: updateData }
      );

      // Get the updated checklist
      const updatedChecklist = await collection.findOne({ _id: new ObjectId(specificId), teamId: teamId });
      updatedChecklist.id = updatedChecklist._id.toString();
      delete updatedChecklist._id;

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'onboarding', resourceId: specificId });

      return createResponse(200, updatedChecklist);
    }

    // DELETE: Delete an existing onboarding checklist
    else if (event.httpMethod === 'DELETE' && specificId) {
      // RBAC: Only owner/admin can delete onboarding checklists
      if (!authContext.role || !['owner', 'admin'].includes(authContext.role)) {
        return createErrorResponse(403, 'Forbidden: insufficient permissions');
      }
      logger.debug(`Deleting onboarding checklist: ${specificId}`);

      // Check if the checklist exists and belongs to the user's team
      const checklistExists = await collection.findOne({
        _id: new ObjectId(specificId),
        teamId: teamId,
        ...notDeleted
      });

      if (!checklistExists) {
        logger.error(`Onboarding checklist ${specificId} not found`);
        return createErrorResponse(404, 'Onboarding checklist not found');
      }

      // Soft delete the checklist
      await softDelete(collection, {
        _id: new ObjectId(specificId),
        teamId: teamId,
        ...notDeleted
      }, userId);

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'onboarding', resourceId: specificId });

      return createResponse(200, { message: 'Onboarding checklist deleted successfully' });
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
