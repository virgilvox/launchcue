const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string()
    .min(10, 'Password must be at least 10 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const rateLimited = await rateLimitCheck(event, 'auth');
  if (rateLimited) return rateLimited;

  try {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON');
    }

    const validationResult = ResetPasswordSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    const { token, newPassword } = validationResult.data;

    const { db } = await connectToDb();

    // Find all non-expired, unused reset records
    const resetRecords = await db.collection('passwordResets').find({
      used: false,
      expiresAt: { $gt: new Date() },
    }).toArray();

    // Find the matching record by comparing token against each hash
    let matchingRecord = null;
    for (const record of resetRecords) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
      return createErrorResponse(400, 'Invalid or expired reset token');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    const { ObjectId } = require('mongodb');
    await db.collection('users').updateOne(
      { _id: new ObjectId(matchingRecord.userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    // Mark the token as used
    await db.collection('passwordResets').updateOne(
      { _id: matchingRecord._id },
      { $set: { used: true } }
    );

    logger.info(`Password reset successful for user ${matchingRecord.userId}`);

    return createResponse(200, {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });

  } catch (error) {
    logger.error('Reset password error:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
