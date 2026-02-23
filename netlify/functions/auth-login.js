const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');
const { generateJti, TOKEN_EXPIRY } = require('./utils/authHandler');

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
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

    const validationResult = LoginSchema.safeParse(data);
    if (!validationResult.success) {
      return createErrorResponse(400, 'Validation failed', validationResult.error.format());
    }
    const { email, password } = validationResult.data;

    const { db } = await connectToDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      return createErrorResponse(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return createErrorResponse(401, 'Invalid credentials');
    }

    let teamId = null;
    let userRole = null;
    const userTeams = await db.collection('teams').find({ 'members.userId': user._id.toString() }).toArray();
    if (userTeams && userTeams.length > 0) {
      teamId = userTeams[0]._id.toString();
      // Look up the user's role in the first team
      const member = userTeams[0].members.find(m => m.userId === user._id.toString());
      userRole = member ? member.role : 'member';
    }

    if (!teamId) {
      logger.warn(`User ${user._id} has no associated teams during login`);
    }

    // For client role, include projectIds in payload
    let projectIds = null;
    if (userRole === 'client' && userTeams.length > 0) {
      const member = userTeams[0].members.find(m => m.userId === user._id.toString());
      projectIds = member?.projectIds || null;
    }

    const payload = {
      userId: user._id.toString(),
      teamId: teamId,
      role: userRole,
      email: user.email,
      name: user.name,
      jti: generateJti(),
      ...(projectIds ? { projectIds } : {}),
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });

    return createResponse(200, {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: userRole,
        ...(projectIds ? { projectIds } : {}),
      },
      currentTeamId: teamId
    });

  } catch (error) {
    logger.error('Login error:', error.message);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
