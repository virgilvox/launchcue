const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');
const { generateJti, TOKEN_EXPIRY } = require('./utils/authHandler');

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
    const data = JSON.parse(event.body);
    const { email, password } = data;

    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required');
    }

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
    const userTeams = await db.collection('teams').find({ 'members.userId': user._id.toString() }).toArray();
    if (userTeams && userTeams.length > 0) {
      teamId = userTeams[0]._id.toString();
    }

    if (!teamId) {
      logger.warn(`User ${user._id} has no associated teams during login`);
    }

    const payload = {
      userId: user._id.toString(),
      teamId: teamId,
      email: user.email,
      name: user.name,
      jti: generateJti(),
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRY });

    return createResponse(200, {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      },
      currentTeamId: teamId
    });

  } catch (error) {
    logger.error('Login error:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
