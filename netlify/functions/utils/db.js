const { MongoClient } = require('mongodb');
const logger = require('./logger');

let client = null;
let db = null;
let indexesEnsured = false;

async function ensureIndexes(database) {
  if (indexesEnsured) return;

  try {
    await Promise.all([
      database.collection('users').createIndex({ email: 1 }, { unique: true }),
      database.collection('teams').createIndex({ 'members.userId': 1 }),
      database.collection('clients').createIndex({ teamId: 1 }),
      database.collection('projects').createIndex({ teamId: 1 }),
      database.collection('projects').createIndex({ teamId: 1, clientId: 1 }),
      database.collection('tasks').createIndex({ teamId: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, projectId: 1 }),
      database.collection('tasks').createIndex({ teamId: 1, status: 1 }),
      database.collection('campaigns').createIndex({ teamId: 1 }),
      database.collection('notes').createIndex({ teamId: 1 }),
      database.collection('notes').createIndex({ teamId: 1, clientId: 1 }),
      database.collection('braindumps').createIndex({ teamId: 1 }),
      database.collection('calendarEvents').createIndex({ teamId: 1, start: 1, end: 1 }),
      database.collection('resources').createIndex({ teamId: 1 }),
      database.collection('apiKeys').createIndex({ prefix: 1 }, { unique: true }),
      database.collection('apiKeys').createIndex({ userId: 1 }),
      database.collection('teamInvites').createIndex({ email: 1, teamId: 1 }),
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
    client = new MongoClient(uri);
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