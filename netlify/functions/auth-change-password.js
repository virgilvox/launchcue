const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(10, 'New password must be at least 10 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event);
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId } = authResult;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  try {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON');
    }

    const validationResult = PasswordChangeSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    const { currentPassword, newPassword } = validationResult.data;

    const { db } = await connectToDb();
    const usersCollection = db.collection('users');
    const userQuery = { _id: new ObjectId(userId) };

    const user = await usersCollection.findOne(userQuery);
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return createErrorResponse(400, 'Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    const result = await usersCollection.updateOne(userQuery, {
      $set: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    if (result.matchedCount === 0) {
      return createErrorResponse(404, 'User not found during update');
    }

    return createResponse(200, { message: 'Password updated successfully' });

  } catch (error) {
    logger.error('Error changing password:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
