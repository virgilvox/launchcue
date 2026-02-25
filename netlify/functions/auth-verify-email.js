const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Support both GET (with query param) and POST (with body)
  let token;

  if (event.httpMethod === 'GET') {
    token = event.queryStringParameters?.token;
    if (!token) {
      return createErrorResponse(400, 'Token query parameter is required');
    }
  } else if (event.httpMethod === 'POST') {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON');
    }

    const validationResult = VerifyEmailSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    token = validationResult.data.token;
  } else {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const rateLimited = await rateLimitCheck(event, 'auth');
  if (rateLimited) return rateLimited;

  try {
    const { db } = await connectToDb();

    // Find all non-expired verification records
    const verificationRecords = await db.collection('emailVerifications').find({
      expiresAt: { $gt: new Date() },
    }).toArray();

    // Find the matching record by comparing token against each hash
    let matchingRecord = null;
    for (const record of verificationRecords) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
      return createErrorResponse(400, 'Invalid or expired verification token');
    }

    // Update the user's emailVerified status
    const { ObjectId } = require('mongodb');
    await db.collection('users').updateOne(
      { _id: new ObjectId(matchingRecord.userId) },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
      }
    );

    // Hard delete intentional: email verification tokens are single-use ephemeral records.
    // Once consumed they have no audit value and should be permanently removed.
    await db.collection('emailVerifications').deleteOne({ _id: matchingRecord._id });

    logger.info(`Email verified for user ${matchingRecord.userId}`);

    return createResponse(200, {
      message: 'Email has been verified successfully.',
    });

  } catch (error) {
    logger.error('Email verification error:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
