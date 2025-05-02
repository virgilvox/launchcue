// Proxy file for the auth/register.js function
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
    const { name, email, password } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return createErrorResponse(400, 'Name, email, and password are required');
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return createErrorResponse(400, 'Invalid email format');
    }

    // Basic password validation (e.g., minimum length)
    if (password.length < 6) {
      return createErrorResponse(400, 'Password must be at least 6 characters long');
    }

    const { db } = await connectToDb();
    const usersCollection = db.collection('users');
    const teamsCollection = db.collection('teams');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return createErrorResponse(400, 'User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const now = new Date();
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    // Insert new user
    const userResult = await usersCollection.insertOne(newUser);
    const userId = userResult.insertedId.toString();

    // Create a default personal team for the new user
    const newTeam = {
      name: `${name}'s Team`, // Or just "Personal Team"
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

    // Create JWT Payload
    const payload = {
      userId: userId,
      teamId: teamId, // Use the newly created team ID
      email: newUser.email,
      name: newUser.name
    };

    // Sign token
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    return createResponse(201, {
      token,
      user: {
        id: userId,
        email: newUser.email,
        name: newUser.name
      },
      currentTeamId: teamId // Send back the ID of the created team
    });

  } catch (error) {
    console.error('Registration error:', error);
    // Handle potential duplicate key errors during user insert more gracefully
    if (error.code === 11000) {
      return createErrorResponse(400, 'User already exists with this email');
    }
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 