const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');

/**
 * Create a notification document in the database.
 * Exported so other functions (e.g. tasks, teams) can generate notifications.
 *
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.type - Notification type (task_assigned, deadline_approaching, team_invite, mention, comment)
 * @param {string} params.title - Short title
 * @param {string} params.message - Notification body
 * @param {string} [params.resourceType] - Related resource type (task, project, etc.)
 * @param {string} [params.resourceId] - Related resource ID
 * @returns {Promise<object>} The inserted notification document
 */
async function createNotification(db, { userId, type, title, message, resourceType, resourceId }) {
  const collection = db.collection('notifications');
  const now = new Date();

  const notification = {
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: now,
  };

  if (resourceType) notification.resourceType = resourceType;
  if (resourceId) notification.resourceId = resourceId;

  const result = await collection.insertOne(notification);
  notification.id = result.insertedId.toString();
  delete notification._id;

  return notification;
}

exports.createNotification = createNotification;

exports.handler = async function (event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Authenticate
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:teams']
        : ['write:teams'],
    });
  } catch (errorResponse) {
    logger.error('Authentication failed:', errorResponse.body || errorResponse);
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }

  const { userId } = authContext;

  // Parse notification ID from path
  let notificationId = null;
  const pathParts = event.path.split('/');
  const idx = pathParts.indexOf('notifications');
  if (idx !== -1 && pathParts.length > idx + 1) {
    const potentialId = pathParts[idx + 1];
    if (ObjectId.isValid(potentialId)) {
      notificationId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const collection = db.collection('notifications');

    // ------------------------------------------------------------------ GET
    if (event.httpMethod === 'GET') {
      const qp = event.queryStringParameters || {};
      const query = { userId };

      if (qp.unreadOnly === 'true') {
        query.read = false;
      }

      const formatNotification = (n) => ({ ...n, id: n._id.toString(), _id: undefined });

      if (qp.page) {
        const { page, limit, skip } = getPaginationParams(qp);
        const [notifications, total] = await Promise.all([
          collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
          collection.countDocuments(query),
        ]);
        return createResponse(200, createPaginatedResponse(notifications.map(formatNotification), total, page, limit));
      }

      // Default: return up to 20 most recent notifications
      const limit = parseInt(qp.limit, 10) || 20;
      const notifications = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return createResponse(200, notifications.map(formatNotification));
    }

    // ------------------------------------------------------------------ PUT
    if (event.httpMethod === 'PUT') {
      const qp = event.queryStringParameters || {};

      // Mark all as read
      if (qp.action === 'markAllRead') {
        const result = await collection.updateMany(
          { userId, read: false },
          { $set: { read: true } }
        );
        return createResponse(200, { message: 'All notifications marked as read', modified: result.modifiedCount });
      }

      // Mark single notification as read
      if (!notificationId) {
        return createErrorResponse(400, 'Notification ID is required');
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(notificationId), userId },
        { $set: { read: true } }
      );

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'Notification not found or user unauthorized');
      }

      const updated = await collection.findOne({ _id: new ObjectId(notificationId) });
      updated.id = updated._id.toString();
      delete updated._id;
      return createResponse(200, updated);
    }

    // ------------------------------------------------------------------ DELETE
    if (event.httpMethod === 'DELETE' && notificationId) {
      // Hard delete intentional: notifications are ephemeral, user-facing records
      // with no audit trail value. Soft delete would bloat the collection unnecessarily.
      const result = await collection.deleteOne({ _id: new ObjectId(notificationId), userId });

      if (result.deletedCount === 0) {
        return createErrorResponse(404, 'Notification not found or user unauthorized');
      }

      return createResponse(200, { message: 'Notification deleted successfully' });
    }

    // Method Not Allowed
    return createErrorResponse(405, 'Method Not Allowed');
  } catch (error) {
    logger.error('Error handling notifications request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
