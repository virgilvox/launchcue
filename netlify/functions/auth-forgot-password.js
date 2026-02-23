const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
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

    const validationResult = ForgotPasswordSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    const { email } = validationResult.data;

    const { db } = await connectToDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    // Always return success to avoid leaking whether an email exists
    if (!user) {
      return createResponse(200, {
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const tokenHash = await bcrypt.hash(token, salt);

    // Store the token hash in the passwordResets collection
    await db.collection('passwordResets').insertOne({
      userId: user._id.toString(),
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      used: false,
      createdAt: new Date(),
    });

    // In development, return the token directly.
    // In production, this would be sent via email instead.
    logger.info(`Password reset token generated for user ${user._id}`);

    const responseBody = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    // Only include reset token in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      responseBody.token = token;
    }

    return createResponse(200, responseBody);

  } catch (error) {
    logger.error('Forgot password error:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
