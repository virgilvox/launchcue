const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Zod Schema for Comment
const CommentSchema = z.object({
  resourceType: z.enum(['task', 'project', 'client', 'note']),
  resourceId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid resource ID" }),
  content: z.string().min(1).max(5000),
});

const CommentUpdateSchema = z.object({
  content: z.string().min(1).max(5000),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:notes']
        : ['write:notes']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  // Extract comment ID from path
  let commentId = null;
  const pathParts = event.path.split('/');
  const commentsIndex = pathParts.indexOf('comments');
  if (commentsIndex !== -1 && pathParts.length > commentsIndex + 1) {
    const potentialId = pathParts[commentsIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      commentId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('comments');

    // GET: List comments
    if (event.httpMethod === 'GET') {
      const qp = event.queryStringParameters || {};
      const query = { teamId, ...notDeleted };

      // Filter by resource if provided
      if (qp.resourceType) query.resourceType = qp.resourceType;
      if (qp.resourceId && ObjectId.isValid(qp.resourceId)) query.resourceId = qp.resourceId;

      // Determine sort and limit based on whether this is a feed request
      const isFeedRequest = !qp.resourceType && !qp.resourceId;
      const sortOrder = isFeedRequest ? { createdAt: -1 } : { createdAt: 1 };
      const limit = isFeedRequest ? 20 : 0;

      let cursor = collection.find(query).sort(sortOrder);
      if (limit > 0) cursor = cursor.limit(limit);
      const comments = await cursor.toArray();

      // Fetch user names for all unique user IDs
      const userIds = [...new Set(comments.map(c => c.userId))];
      const users = userIds.length > 0
        ? await db.collection('users').find(
            { _id: { $in: userIds.map(id => new ObjectId(id)) } },
            { projection: { password: 0, emailVerificationToken: 0 } }
          ).toArray()
        : [];
      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u.name || 'Unknown'; });

      const formatted = comments.map(c => ({
        id: c._id.toString(),
        resourceType: c.resourceType,
        resourceId: c.resourceId,
        userId: c.userId,
        userName: userMap[c.userId] || 'Unknown',
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return createResponse(200, formatted);
    }

    // POST: Create comment
    else if (event.httpMethod === 'POST') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = CommentSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      const now = new Date();
      const newComment = {
        ...validatedData,
        teamId,
        userId,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(newComment);

      // Fetch user name for the response
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1 } }
      );

      const response = {
        id: result.insertedId.toString(),
        resourceType: newComment.resourceType,
        resourceId: newComment.resourceId,
        userId: newComment.userId,
        userName: user ? user.name : 'Unknown',
        content: newComment.content,
        createdAt: newComment.createdAt,
        updatedAt: newComment.updatedAt,
      };

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'comment', resourceId: result.insertedId.toString() });

      return createResponse(201, response);
    }

    // PUT: Update own comment
    else if (event.httpMethod === 'PUT' && commentId) {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = CommentUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      // Only allow updating own comments
      const existing = await collection.findOne({
        _id: new ObjectId(commentId),
        teamId,
        ...notDeleted
      });

      if (!existing) {
        return createErrorResponse(404, 'Comment not found');
      }

      if (existing.userId !== userId) {
        return createErrorResponse(403, 'You can only edit your own comments');
      }

      const updateFields = {
        content: validatedData.content,
        updatedAt: new Date(),
      };

      await collection.updateOne(
        { _id: new ObjectId(commentId) },
        { $set: updateFields }
      );

      const updatedComment = await collection.findOne({ _id: new ObjectId(commentId) });
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { name: 1 } }
      );

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'comment', resourceId: commentId });

      return createResponse(200, {
        id: updatedComment._id.toString(),
        resourceType: updatedComment.resourceType,
        resourceId: updatedComment.resourceId,
        userId: updatedComment.userId,
        userName: user ? user.name : 'Unknown',
        content: updatedComment.content,
        createdAt: updatedComment.createdAt,
        updatedAt: updatedComment.updatedAt,
      });
    }

    // DELETE: Soft delete own comment
    else if (event.httpMethod === 'DELETE' && commentId) {
      // Check ownership before deleting
      const existing = await collection.findOne({
        _id: new ObjectId(commentId),
        teamId,
        ...notDeleted
      });

      if (!existing) {
        return createErrorResponse(404, 'Comment not found');
      }

      if (existing.userId !== userId) {
        return createErrorResponse(403, 'You can only delete your own comments');
      }

      const result = await softDelete(
        collection,
        { _id: new ObjectId(commentId), teamId, ...notDeleted },
        userId
      );

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'Comment not found');
      }

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'comment', resourceId: commentId });

      return createResponse(200, { message: 'Comment deleted successfully' });
    }

    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }

  } catch (error) {
    logger.error('Error handling comments request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
