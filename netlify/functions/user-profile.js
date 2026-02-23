const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');

const ProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
  jobTitle: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  avatarUrl: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
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

  try {
    const { db } = await connectToDb();
    const usersCollection = db.collection('users');
    const userQuery = { _id: new ObjectId(userId) };

    if (event.httpMethod === 'GET') {
      const user = await usersCollection.findOne(userQuery, {
        projection: { password: 0 }
      });
      if (!user) {
        return createErrorResponse(404, 'User not found');
      }
      const profileData = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        createdAt: user.createdAt
      };
      return createResponse(200, profileData);
    }

    else if (event.httpMethod === 'PUT') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = ProfileUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      if (Object.keys(validatedData).length === 0) {
        return createErrorResponse(400, 'No valid fields provided for update');
      }

      delete validatedData.email;

      const updateFields = { ...validatedData, updatedAt: new Date() };

      const result = await usersCollection.updateOne(userQuery, { $set: updateFields });

      if (result.matchedCount === 0) {
        return createErrorResponse(404, 'User not found');
      }

      const updatedUser = await usersCollection.findOne(userQuery, {
        projection: { password: 0 }
      });

      const updatedProfileData = {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        jobTitle: updatedUser.jobTitle || '',
        bio: updatedUser.bio || '',
        avatarUrl: updatedUser.avatarUrl || '',
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      return createResponse(200, updatedProfileData);
    }

    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }

  } catch (error) {
    logger.error('Error handling user profile request:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
