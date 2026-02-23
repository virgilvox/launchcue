const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

const AVAILABLE_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'project.created', 'project.updated', 'project.deleted',
  'client.created', 'client.updated', 'client.deleted',
  'campaign.created', 'campaign.updated',
];

const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1).refine(
    (events) => events.every(e => AVAILABLE_EVENTS.includes(e)),
    { message: `Invalid event. Available events: ${AVAILABLE_EVENTS.join(', ')}` }
  ),
  secret: z.string().min(16).optional(),
  active: z.boolean().default(true),
});

const WebhookUpdateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string().min(1)).min(1).refine(
    (events) => events.every(e => AVAILABLE_EVENTS.includes(e)),
    { message: `Invalid event. Available events: ${AVAILABLE_EVENTS.join(', ')}` }
  ).optional(),
  active: z.boolean().optional(),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:api-keys']
        : ['write:api-keys']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authResult;

  const rateLimited = await rateLimitCheck(event, 'general', authResult.userId);
  if (rateLimited) return rateLimited;

  // Extract webhook ID from path
  let webhookId = null;
  const pathParts = event.path.split('/');
  const webhooksIndex = pathParts.indexOf('webhooks');
  if (webhooksIndex !== -1 && pathParts.length > webhooksIndex + 1) {
    const potentialId = pathParts[webhooksIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      webhookId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('webhooks');

    // GET: List webhooks for team
    if (event.httpMethod === 'GET') {
      const webhooks = await collection.find({ teamId }).sort({ createdAt: -1 }).toArray();

      const formattedWebhooks = webhooks.map(w => ({
        id: w._id.toString(),
        url: w.url,
        events: w.events,
        active: w.active,
        secretMask: w.secret ? w.secret.substring(0, 8) + '...' : null,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        _id: undefined,
      }));

      return createResponse(200, formattedWebhooks);
    }

    // POST: Create webhook
    else if (event.httpMethod === 'POST') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = WebhookSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      // Auto-generate secret if not provided
      const secret = validatedData.secret || crypto.randomBytes(32).toString('hex');

      const now = new Date();
      const newWebhook = {
        url: validatedData.url,
        events: validatedData.events,
        secret,
        active: validatedData.active,
        teamId,
        userId,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(newWebhook);

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'webhook', resourceId: result.insertedId.toString() });

      return createResponse(201, {
        id: result.insertedId.toString(),
        url: newWebhook.url,
        events: newWebhook.events,
        active: newWebhook.active,
        secret: secret, // Show secret once on creation
        createdAt: newWebhook.createdAt,
        updatedAt: newWebhook.updatedAt,
      });
    }

    // PUT: Update webhook
    else if (event.httpMethod === 'PUT' && webhookId) {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = WebhookUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      if (Object.keys(validatedData).length === 0) {
        return createErrorResponse(400, 'No valid fields provided for update');
      }

      const updateFields = { ...validatedData, updatedAt: new Date() };
      // Don't allow changing secret, teamId, userId via update
      delete updateFields.secret;
      delete updateFields.teamId;
      delete updateFields.userId;

      const result = await collection.updateOne(
        { _id: new ObjectId(webhookId), teamId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'Webhook not found or user unauthorized');
      }

      const updatedWebhook = await collection.findOne({ _id: new ObjectId(webhookId), teamId });
      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'webhook', resourceId: webhookId });
      return createResponse(200, {
        id: updatedWebhook._id.toString(),
        url: updatedWebhook.url,
        events: updatedWebhook.events,
        active: updatedWebhook.active,
        secretMask: updatedWebhook.secret ? updatedWebhook.secret.substring(0, 8) + '...' : null,
        createdAt: updatedWebhook.createdAt,
        updatedAt: updatedWebhook.updatedAt,
      });
    }

    // DELETE: Hard delete webhook
    else if (event.httpMethod === 'DELETE' && webhookId) {
      const result = await collection.deleteOne({
        _id: new ObjectId(webhookId),
        teamId,
      });

      if (result.deletedCount === 0) {
        return createErrorResponse(404, 'Webhook not found or user unauthorized');
      }

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'webhook', resourceId: webhookId });

      return createResponse(200, { message: 'Webhook deleted successfully' });
    }

    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }

  } catch (error) {
    logger.error('Error handling webhooks request:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
