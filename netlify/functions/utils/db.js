const { MongoClient } = require('mongodb');
const logger = require('./logger');
const { validateEnv } = require('./validateEnv');

// Validate environment variables on cold start
validateEnv();

let client = null;
let db = null;
let indexesEnsured = false;

async function ensureIndexes(database) {
  if (indexesEnsured) return;

  try {
    await Promise.all([
      // Users
      database.collection('users').createIndex({ email: 1 }, { unique: true }),

      // Teams
      database.collection('teams').createIndex({ 'members.userId': 1 }),

      // Clients
      database.collection('clients').createIndex({ teamId: 1 }),

      // Projects
      database.collection('projects').createIndex({ teamId: 1 }),
      database.collection('projects').createIndex({ teamId: 1, clientId: 1 }),
      database.collection('projects').createIndex({ teamId: 1, status: 1 }),
      database.collection('projects').createIndex({ teamId: 1, dueDate: 1 }),

      // Tasks
      database.collection('tasks').createIndex({ teamId: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, projectId: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, status: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, dueDate: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, assigneeId: 1 }),

      // Campaigns
      database.collection('campaigns').createIndex({ teamId: 1 }),
      database.collection('campaigns').createIndex({ teamId: 1, clientId: 1 }),

      // Notes
      database.collection('notes').createIndex({ teamId: 1 }),
      database.collection('notes').createIndex({ teamId: 1, projectId: 1 }),

      // Brain Dumps
      database.collection('braindumps').createIndex({ teamId: 1 }),

      // Calendar Events
      database.collection('calendarEvents').createIndex({ teamId: 1, start: 1, end: 1 }),
      database.collection('calendarEvents').createIndex({ teamId: 1, projectId: 1 }),

      // Resources
      database.collection('resources').createIndex({ teamId: 1 }),

      // API Keys
      database.collection('apiKeys').createIndex({ prefix: 1 }, { unique: true }),
      database.collection('apiKeys').createIndex({ userId: 1 }),

      // Team Invites
      database.collection('teamInvites').createIndex({ email: 1, teamId: 1 }),

      // Comments
      database.collection('comments').createIndex({ resourceType: 1, resourceId: 1 }),
      database.collection('comments').createIndex({ userId: 1 }),

      // Notifications
      database.collection('notifications').createIndex({ userId: 1, read: 1 }),
      database.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),

      // Audit Logs
      database.collection('auditLogs').createIndex({ teamId: 1, timestamp: -1 }),
      database.collection('auditLogs').createIndex({ resourceType: 1, resourceId: 1 }),

      // Text search index for global search
      database.collection('tasks').createIndex({ title: 'text', description: 'text' }),
      database.collection('projects').createIndex({ title: 'text', description: 'text' }),
      database.collection('clients').createIndex({ name: 'text', description: 'text' }),
      database.collection('notes').createIndex({ title: 'text', content: 'text' }),
    ]);
    indexesEnsured = true;
    logger.debug('MongoDB indexes ensured');
  } catch (error) {
    logger.warn('Index creation warning (non-fatal):', error.message);
  }
}

async function connectToDb() {
  if (db && client && client.topology && client.topology.isConnected()) {
    return { db, client };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Please set the MONGODB_URI environment variable.');
  }

  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    db = client.db();
    logger.debug('Connected to MongoDB');
    await ensureIndexes(db);
    return { db, client };
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

async function closeDbConnection() {
  if (client && client.topology && client.topology.isConnected()) {
    try {
      await client.close();
      client = null;
      db = null;
    } catch (error) {
      logger.error('Failed to close MongoDB connection:', error.message);
    }
  }
}

module.exports = { connectToDb, closeDbConnection }; 