const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDb } = require('./utils/db');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('Missing JWT_SECRET environment variable.');
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
    
    // *** Important: Determine the user's current/default teamId ***
    // This needs logic. For now, assume the first team they belong to, or a default.
    // In a real app, this might come from user preferences or the last used team.
    let teamId = null;
    const userTeams = await db.collection('teams').find({ 'members.userId': user._id.toString() }).toArray();
    if (userTeams && userTeams.length > 0) {
        teamId = userTeams[0]._id.toString(); // Example: use the first team
    }
    
    if (!teamId) {
        // Handle case where user has no teams? Or create a default one?
        console.warn(`User ${user._id} has no associated teams during login.`);
        // Depending on app logic, might return error or proceed without team context
        // return createErrorResponse(400, 'User has no associated team'); 
    }

    // Create JWT Payload
    const payload = {
      userId: user._id.toString(),
      teamId: teamId, // Include teamId in the token
      email: user.email,
      name: user.name
    };

    // Sign token
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' }); // Token expires in 7 days

    return createResponse(200, {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      },
      currentTeamId: teamId // Inform frontend which team context was used
    });

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 