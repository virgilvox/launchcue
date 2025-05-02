const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || 
                event.headers.host.includes('localhost') ||
                event.headers.host.includes('127.0.0.1');
  
  let teamId = null;
  let userId = 'migration-script';
  
  // Skip authentication in development mode
  if (!isDev) {
    try {
      const authResult = authenticateRequest(event);
      teamId = authResult.teamId;
      userId = authResult.userId;
    } catch (errorResponse) {
      return errorResponse;
    }
  }

  try {
    const { db } = await connectToDb();
    const clientsCollection = db.collection('clients');
    
    // In dev mode, get the first team ID from the database
    if (isDev && !teamId) {
      const teams = await db.collection('teams').find({}).limit(1).toArray();
      if (teams.length > 0) {
        teamId = teams[0]._id.toString();
        console.log(`Using team ID ${teamId} for development mode`);
      } else {
        return createErrorResponse(400, 'No teams found in development database');
      }
    }
    
    if (!teamId) {
      return createErrorResponse(400, 'No team ID available');
    }
    
    // 1. Find all standalone contacts (documents with clientId)
    const standaloneContacts = await clientsCollection.find({ 
      clientId: { $exists: true, $ne: null },
      teamId: teamId
    }).toArray();
    
    console.log(`Found ${standaloneContacts.length} standalone contacts to embed in client documents`);
    
    // 2. Group contacts by clientId
    const contactsByClientId = {};
    for (const contact of standaloneContacts) {
      const clientId = contact.clientId.toString();
      if (!contactsByClientId[clientId]) {
        contactsByClientId[clientId] = [];
      }
      
      // Create a clean contact object (no _id, no clientId)
      const cleanContact = { ...contact };
      cleanContact.id = cleanContact._id.toString(); // Keep old _id as string id
      delete cleanContact._id;
      delete cleanContact.clientId; // Remove clientId as it will be embedded
      
      contactsByClientId[clientId].push(cleanContact);
    }
    
    // 3. For each client, embed its contacts
    let updatedClients = 0;
    let failedClients = 0;
    
    for (const clientId of Object.keys(contactsByClientId)) {
      try {
        const clientObjectId = new ObjectId(clientId);
        const contacts = contactsByClientId[clientId];
        
        // Get the client document 
        const client = await clientsCollection.findOne({ _id: clientObjectId, teamId });
        
        if (!client) {
          console.warn(`Client ${clientId} not found, skipping its contacts`);
          failedClients++;
          continue;
        }
        
        // Initialize contacts array if it doesn't exist
        if (!client.contacts) {
          client.contacts = [];
        }
        
        // Add standalone contacts to client.contacts
        client.contacts = [...client.contacts, ...contacts];
        
        // Update the client
        const updateResult = await clientsCollection.updateOne(
          { _id: clientObjectId, teamId },
          { $set: { contacts: client.contacts, updatedAt: new Date() } }
        );
        
        if (updateResult.modifiedCount > 0) {
          updatedClients++;
        } else {
          console.warn(`Client ${clientId} not updated`);
          failedClients++;
        }
      } catch (error) {
        console.error(`Error updating client ${clientId}:`, error);
        failedClients++;
      }
    }
    
    // 4. Delete the standalone contacts
    let deletedContacts = 0;
    if (standaloneContacts.length > 0) {
      const deleteResult = await clientsCollection.deleteMany({
        clientId: { $exists: true, $ne: null },
        teamId: teamId
      });
      
      deletedContacts = deleteResult.deletedCount;
    }
    
    return createResponse(200, {
      message: 'Migration completed successfully',
      details: {
        teamId,
        standaloneContactsFound: standaloneContacts.length,
        clientsUpdated: updatedClients,
        clientsFailedToUpdate: failedClients,
        contactsDeleted: deletedContacts
      }
    });
  } catch (error) {
    console.error('Error in migration:', error);
    return createErrorResponse(500, 'Migration failed', error.message);
  }
}; 