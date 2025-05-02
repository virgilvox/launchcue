const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // New unified authentication
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Contact schema for embedded contacts
const ContactSchema = z.object({
    name: z.string().min(1, "Contact name is required").max(200),
    email: z.string().email({ message: "Invalid email format" }).optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    role: z.string().max(100).optional(),
    isPrimary: z.boolean().default(false),
    notes: z.string().max(2000).optional(),
});

// Zod Schema for Client Creation
const ClientCreateSchema = z.object({
    name: z.string().min(1, "Client name is required").max(200),
    industry: z.string().max(100).optional(),
    website: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')),
    description: z.string().max(5000).optional(),
    contactName: z.string().max(100).optional(),
    contactEmail: z.string().email({ message: "Invalid email format" }).optional().or(z.literal('')),
    contactPhone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
    contacts: z.array(ContactSchema).optional(),
});

// For updates, all fields are optional
const ClientUpdateSchema = ClientCreateSchema.partial();

// Define actions for the client endpoint
const ACTIONS = {
    ADD_CONTACT: 'addContact',
    UPDATE_CONTACT: 'updateContact',
    DELETE_CONTACT: 'deleteContact',
    GET_CONTACTS: 'getContacts'
};

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    // Use the new unified authentication method (works for both JWT and API key)
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:clients'] 
        : ['write:clients']
    });
  } catch (errorResponse) {
    console.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  // Check if path parameters are being used - add logging to debug
  console.log('Request URL:', event.path);
  console.log('HTTP Method:', event.httpMethod);

  // Extract client ID from path if present
  let clientId = null;
  
  // First check direct path parameters (/:id)
  const pathParts = event.path.split('/');
  if (pathParts.length > 2) {
    // Handle both /clients/123 and /clients/123/contacts formats
    const pathClientId = pathParts[pathParts.length - 1];
    const isContactsPath = pathClientId === 'contacts';
    
    if (isContactsPath && pathParts.length > 3) {
      // Handle /clients/123/contacts format
      const potentialId = pathParts[pathParts.length - 2];
      if (ObjectId.isValid(potentialId)) {
        clientId = potentialId;
      }
    } else if (!isContactsPath && ObjectId.isValid(pathClientId)) {
      // Handle /clients/123 format
      clientId = pathClientId;
    }
  }
  
  // Fall back to query parameters if no valid ID found in path
  if (!clientId && event.queryStringParameters?.id && ObjectId.isValid(event.queryStringParameters.id)) {
    clientId = event.queryStringParameters.id;
  }
  
  // For debugging
  console.log('Final resolved clientId:', clientId);

  // Extract action and check for contact operations
  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action;
  const contactId = queryParams.contactId;
  const isContactOperation = 
    action === 'addContact' || 
    action === 'updateContact' || 
    action === 'deleteContact' ||
    event.path.includes('/contacts/') ||
    (pathParts.length > 3 && pathParts[pathParts.length - 2] === 'contacts');

  if (isContactOperation) {
    console.log('CONTACT operation detected!', { action, path: event.path, contactId });
  }

  try {
    const { db } = await connectToDb();
    const clientsCollection = db.collection('clients');

    // Get client by ID and optionally perform contact-related actions
    if (clientId) {
      try {
        // Don't re-declare clientId, use the one we already parsed
        const clientObjId = new ObjectId(clientId);
        const action = event.queryStringParameters?.action;
        
        // Handle actions related to contacts (for backward compatibility)
        if (action === 'getContacts') {
          const client = await clientsCollection.findOne({ _id: clientObjId, teamId: teamId });
          
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }
          
          // Return the contacts array or an empty array
          return createResponse(200, client.contacts || []);
        }
        
        if (event.httpMethod === 'GET') {
          const client = await clientsCollection.findOne({ _id: clientObjId, teamId: teamId });
          
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }
          
          // Format the response
          const formattedClient = {
            ...client,
            id: client._id.toString()
          };
          delete formattedClient._id;
          
          return createResponse(200, formattedClient);
        }
        
        if (event.httpMethod === 'PUT') {
          const body = JSON.parse(event.body);
          
          // Don't allow changing teamId
          delete body.teamId;
          
          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId: teamId },
            { 
              $set: { 
                ...body,
                updatedAt: new Date()
              } 
            },
            { returnDocument: 'after' }
          );
          
          if (!updateResult.value) {
            return createErrorResponse(404, 'Client not found');
          }
          
          return createResponse(200, updateResult.value);
        }
        
        if (event.httpMethod === 'DELETE') {
          // Handle DELETE requests
          try {
            // Check if this is a contact deletion
            const isContactAction = 
              action === 'deleteContact' || 
              (pathParts.length > 3 && pathParts[pathParts.length - 2] === 'contacts');
              
            if (isContactAction) {
              console.log('DELETE CONTACT operation detected');
              
              let contactId = event.queryStringParameters?.contactId;
              
              // Extract contactId from path if it's in the format /clients/:clientId/contacts/:contactId
              if (!contactId && pathParts.length > 3 && pathParts[pathParts.length - 2] === 'contacts') {
                contactId = pathParts[pathParts.length - 1];
              }
              
              if (!contactId) {
                return createErrorResponse(400, 'Contact ID is required for contact deletion');
              }
              
              console.log('Deleting contact:', contactId, 'from client:', clientId);
              
              // First verify the client exists and belongs to this team
              const clientDoc = await clientsCollection.findOne({
                _id: new ObjectId(clientId),
                teamId
              });
              
              if (!clientDoc) {
                return createErrorResponse(404, 'Client not found');
              }
              
              // Now perform the contact deletion
              const clientObjId = new ObjectId(clientId);
              const updateResult = await clientsCollection.findOneAndUpdate(
                { _id: clientObjId, teamId },
                { 
                  $pull: { 
                    contacts: { id: contactId } 
                  },
                  $set: { updatedAt: new Date() }
                },
                { returnDocument: 'after' }
              );
              
              if (!updateResult.value) {
                return createErrorResponse(404, 'Client or contact not found');
              }
              
              return createResponse(200, { success: true, message: 'Contact deleted' });
            } else {
              // This is a client deletion (not a contact)
              console.log('DELETE CLIENT operation detected for ID:', clientId);
              
              if (!clientId || !ObjectId.isValid(clientId)) {
                return createErrorResponse(400, 'Invalid client ID');
              }
              
              const clientObjId = new ObjectId(clientId);
              const deleteResult = await clientsCollection.deleteOne({ 
                _id: clientObjId, 
                teamId 
              });
              
              if (deleteResult.deletedCount === 0) {
                return createErrorResponse(404, 'Client not found');
              }
              
              return createResponse(200, { success: true, message: 'Client deleted' });
            }
          } catch (error) {
            console.error('Error in DELETE operation:', error);
            return createErrorResponse(500, 'Server error', error.message);
          }
        }
        
        // Handle actions related to contacts (for backward compatibility)
        if (event.httpMethod === 'POST' && action === 'addContact') {
          // Parse the request body first
          const body = JSON.parse(event.body);
          
          console.log('ADDING CONTACT to client:', clientId, 'with data:', JSON.stringify(body));
          
          if (!body.name) {
            return createErrorResponse(400, 'Contact name is required');
          }
          
          // Create a new contact
          const newContact = {
            ...body,
            id: new ObjectId().toString(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Get the client document to ensure it exists
          const client = await clientsCollection.findOne({ 
            _id: clientObjId,
            teamId
          });
          
          if (!client) {
            console.error('Client not found for adding contact:', clientId);
            return createErrorResponse(404, 'Client not found');
          }
          
          // Initialize contacts array if it doesn't exist
          if (!client.contacts) {
            await clientsCollection.updateOne(
              { _id: clientObjId, teamId },
              { $set: { contacts: [] } }
            );
          }
          
          // Add the contact to the client
          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId },
            { 
              $push: { contacts: newContact },
              $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
          );
          
          if (!updateResult.value) {
            console.error('Failed to update client with new contact:', clientId);
            return createErrorResponse(500, 'Failed to add contact');
          }
          
          // Format the response - ensure we return the proper contact
          const formattedContact = {
            ...newContact,
            id: newContact.id
          };
          
          console.log('Contact added successfully:', newContact.id);
          return createResponse(201, formattedContact);
        }
        
        if (event.httpMethod === 'PUT' && action === 'updateContact') {
          const contactId = event.queryStringParameters?.contactId;
          
          if (!contactId) {
            return createErrorResponse(400, 'Contact ID is required');
          }
          
          const body = JSON.parse(event.body);
          
          // Find the client and get the existing contact
          const client = await clientsCollection.findOne({ 
            _id: clientObjId, 
            teamId: teamId,
            "contacts.id": contactId
          });
          
          if (!client) {
            return createErrorResponse(404, 'Client or contact not found');
          }
          
          // Find the existing contact and merge with updates
          const existingContact = client.contacts.find(c => c.id === contactId);
          const updatedContact = {
            ...existingContact,
            ...body,
            id: contactId, // Ensure ID doesn't change
            updatedAt: new Date()
          };
          
          // Update the contact in the contacts array
          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId: teamId, "contacts.id": contactId },
            { 
              $set: { 
                "contacts.$": updatedContact,
                updatedAt: new Date()
              } 
            },
            { returnDocument: 'after' }
          );
          
          if (!updateResult.value) {
            return createErrorResponse(404, 'Client or contact not found');
          }
          
          // Make sure to return the updated contact, not the entire client
          return createResponse(200, updatedContact);
        }
        
        return createErrorResponse(400, 'Invalid action or method for client ID');
      } catch (error) {
        console.error(`Error handling client ${clientId}:`, error);
        return createErrorResponse(500, 'Server error', error.message);
      }
    }

    // GET: List clients for the team or get a specific client
    if (event.httpMethod === 'GET') {
      // Get a specific client - reuse the clientId we've already extracted
      if (clientId) {
        try {
          const objId = new ObjectId(clientId);
          const client = await clientsCollection.findOne({
            _id: objId,
            teamId: teamId
          });
          
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }
          
          // Format the response
          const formattedClient = {
            ...client,
            id: client._id.toString()
          };
          delete formattedClient._id;
          
          return createResponse(200, formattedClient);
        } catch (error) {
          console.error('Error fetching client:', error);
          return createErrorResponse(500, 'Error fetching client', error.message);
        }
      } else {
        // List all clients for the team WITHOUT ANY FILTERING for debugging
        const query = { teamId };

        console.log('Fetching ALL documents with query:', JSON.stringify(query));
        const clients = await clientsCollection.find(query).toArray();

        // Show all documents for debugging
        console.log('ALL DOCUMENTS FROM DB:', JSON.stringify(clients));

        // Just return everything from the DB for now
        const formattedClients = clients.map(c => ({ 
          ...c, 
          id: c._id.toString(), 
          _id: undefined 
        }));
        console.log(`Returning ${formattedClients.length} documents`);
        return createResponse(200, formattedClients);
      }
    }

    // POST: Create a new client
    else if (event.httpMethod === 'POST') {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
      
      const validationResult = ClientCreateSchema.safeParse(data);
      if (!validationResult.success) {
          return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      const now = new Date();
      const newClient = {
        name: validatedData.name,
        industry: validatedData.industry || '',
        website: validatedData.website || '',
        description: validatedData.description || '',
        contactName: validatedData.contactName || '',
        contactEmail: validatedData.contactEmail || '',
        contactPhone: validatedData.contactPhone || '',
        address: validatedData.address || '',
        notes: validatedData.notes || '',
        teamId: teamId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId
      };

      const result = await clientsCollection.insertOne(newClient);
      const createdClient = { ...newClient, id: result.insertedId.toString() };
      delete createdClient._id;

      return createResponse(201, createdClient);
    }
    
    // PUT: Update an existing client
    else if (event.httpMethod === 'PUT' && clientId) {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
      
      const validationResult = ClientUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      
      const validatedData = validationResult.data;
      
      // Check if the client exists and belongs to the team
      const clientExists = await clientsCollection.findOne({
        _id: new ObjectId(clientId),
        teamId: teamId
      });
      
      if (!clientExists) {
        return createErrorResponse(404, 'Client not found or not associated with this team');
      }
      
      // Prepare update data, excluding fields that shouldn't be updated
      const updateData = { ...validatedData, updatedAt: new Date() };
      delete updateData.teamId;
      delete updateData.createdAt;
      delete updateData.createdBy;
      
      console.log('Updating client with contacts:', updateData.contacts ? updateData.contacts.length : 0);
      
      // If contacts are provided in the update, ensure they have proper structure
      if (Array.isArray(updateData.contacts)) {
        // Make sure each contact has an ID and dates
        updateData.contacts = updateData.contacts.map(contact => {
          // If the contact already has an ID, keep it, otherwise generate one
          if (!contact.id) {
            contact.id = new ObjectId().toString();
          }
          
          // Ensure dates exist
          if (!contact.createdAt) {
            contact.createdAt = new Date().toISOString();
          }
          
          contact.updatedAt = new Date().toISOString();
          return contact;
        });
      } else if (updateData.contacts === undefined && clientExists.contacts) {
        // If contacts weren't provided in the update but exist in the DB, preserve them
        updateData.contacts = clientExists.contacts;
      }
      
      // Update the client
      await clientsCollection.updateOne(
        { _id: new ObjectId(clientId), teamId: teamId },
        { $set: updateData }
      );
      
      // Fetch the updated client
      const updatedClient = await clientsCollection.findOne({ 
        _id: new ObjectId(clientId),
        teamId: teamId  // Add the teamId to ensure we find the client
      });
      if (updatedClient) {
        updatedClient.id = updatedClient._id.toString();
        delete updatedClient._id;
      } else {
        console.error('Client not found after update for ID:', clientId);
        return createErrorResponse(404, 'Client not found after update');
      }
      
      return createResponse(200, updatedClient);
    }
    
    // Method Not Allowed
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    console.error('Error handling clients request:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 