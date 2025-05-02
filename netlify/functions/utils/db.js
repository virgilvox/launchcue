const { MongoClient } = require('mongodb');

let client = null;
let db = null;

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
    db = client.db(); // Default database
    console.log("Connected successfully to MongoDB");
    return { db, client };
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error; // Re-throw error after logging
  }
}

async function closeDbConnection() {
  if (client && client.topology && client.topology.isConnected()) {
    try {
      await client.close();
      console.log("MongoDB connection closed.");
      client = null;
      db = null;
    } catch (error) {
      console.error("Failed to close MongoDB connection:", error);
    }
  }
}

module.exports = { connectToDb, closeDbConnection }; 