const { MongoClient } = require('mongodb');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Get MongoDB URI from environment variable
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Missing MongoDB connection string. Please set the MONGODB_URI environment variable.' 
      })
    };
  }

  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    
    // Test connection
    const databases = await client.db().admin().listDatabases();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Connected to MongoDB successfully!',
        databases: databases.databases.map(db => db.name)
      })
    };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to connect to MongoDB',
        details: error.message
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}; 