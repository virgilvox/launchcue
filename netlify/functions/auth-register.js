const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');
const { generateJti, TOKEN_EXPIRY } = require('./utils/authHandler');

const RegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string()
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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('Missing JWT_SECRET environment variable');
    return createErrorResponse(500, 'Internal Server Error', 'JWT secret configuration missing.');
  }

  try {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return createErrorResponse(400, 'Invalid JSON');
    }

    const validationResult = RegistrationSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    const { name, email, password } = validationResult.data;

    const { db } = await connectToDb();
    const usersCollection = db.collection('users');
    const teamsCollection = db.collection('teams');

    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return createErrorResponse(400, 'User already exists with this email');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const now = new Date();
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    const userResult = await usersCollection.insertOne(newUser);
    const userId = userResult.insertedId.toString();

    const newTeam = {
      name: `${name}'s Team`,
      createdAt: now,
      owner: userId,
      members: [
        {
          userId: userId,
          email: newUser.email,
          name: newUser.name,
          role: 'owner',
          joinedAt: now
        }
      ]
    };
    const teamResult = await teamsCollection.insertOne(newTeam);
    const teamId = teamResult.insertedId.toString();

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationSalt = await bcrypt.genSalt(10);
    const verificationTokenHash = await bcrypt.hash(verificationToken, verificationSalt);

    await db.collection('emailVerifications').insertOne({
      userId: userId,
      tokenHash: verificationTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: now,
    });

    logger.info(`Email verification token generated for user ${userId}`);

    const payload = {
      userId: userId,
      teamId: teamId,
      email: newUser.email,
      name: newUser.name,
      jti: generateJti(),
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });

    const responseBody = {
      token,
      user: {
        id: userId,
        email: newUser.email,
        name: newUser.name
      },
      currentTeamId: teamId,
    };

    // Only include verification token in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      responseBody.verificationToken = verificationToken;
    }

    return createResponse(201, responseBody);

  } catch (error) {
    logger.error('Registration error:', error.message);
    if (error.code === 11000) {
      return createErrorResponse(400, 'User already exists with this email');
    }
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
