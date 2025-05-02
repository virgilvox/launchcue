const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Contact
const ContactSchema = z.object({
    name: z.string().min(1, "Contact name is required").max(200),
    email: z.string().email({ message: "Invalid email format" }).optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    role: z.string().max(100).optional(),
    isPrimary: z.boolean().default(false),
    notes: z.string().max(2000).optional(),
    // clientId will be added based on path, teamId from auth
});

const ContactUpdateSchema = ContactSchema.partial().omit({ isPrimary: true }); // Usually don't update isPrimary via generic update

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authResult;
    try {
        authResult = authenticateRequest(event);
    } catch (errorResponse) {
        return errorResponse;
    }
    const { userId, teamId } = authResult;

    try {
        const { db } = await connectToDb();
        const collection = db.collection('clientContacts'); // Use a dedicated collection

        // Parse query parameters or path parameters as needed
        const queryParams = event.queryStringParameters || {};
        
        // Extract Client ID from query parameter OR path
        let clientId = queryParams.clientId;
        let contactId = queryParams.id;
        
        // If not in query params, check path (for backward compatibility)
        if (!clientId || !contactId) {
            const pathParts = event.path.split('/');
            const clientsIndex = pathParts.indexOf('clients');
            const contactsIndex = pathParts.indexOf('contacts');
            
            if (clientsIndex !== -1 && pathParts.length > clientsIndex + 1) {
                const potentialClientId = pathParts[clientsIndex + 1];
                if (ObjectId.isValid(potentialClientId) && !clientId) {
                    clientId = potentialClientId;
                }
            }
            
            if (contactsIndex !== -1 && pathParts.length > contactsIndex + 1) {
                const potentialContactId = pathParts[contactsIndex + 1];
                if (ObjectId.isValid(potentialContactId) && !contactId) {
                    contactId = potentialContactId;
                }
            }
        }

        console.log(`Processing request with clientId: ${clientId}, contactId: ${contactId}`);

        // GET: List contacts for the client
        if (event.httpMethod === 'GET') {
            // Direct endpoint access without clientId, return error
            if (!clientId && !contactId) {
                return createErrorResponse(400, 'Client ID required to list contacts');
            }
            
            // Getting a specific contact by ID
            if (contactId) {
                const contact = await collection.findOne({ 
                    _id: new ObjectId(contactId), 
                    teamId 
                });
                
                if (!contact) {
                    return createErrorResponse(404, 'Contact not found');
                }
                
                const formattedContact = { ...contact, id: contact._id.toString() };
                delete formattedContact._id;
                return createResponse(200, formattedContact);
            } 
            
            // Getting all contacts for a client
            else {
                // Verify the client exists and belongs to the team
                if (ObjectId.isValid(clientId)) {
                    const clientExists = await db.collection('clients').countDocuments({ 
                        _id: new ObjectId(clientId), 
                        teamId 
                    });
                    
                    if (clientExists === 0) {
                        return createErrorResponse(404, 'Client not found or not associated with this team');
                    }
                } else {
                    return createErrorResponse(400, 'Invalid client ID format');
                }
                
                console.log(`Finding contacts with clientId: ${clientId}, teamId: ${teamId}`);
                const contacts = await collection.find({ 
                    clientId: clientId, 
                    teamId 
                }).toArray();
                
                console.log(`Found ${contacts.length} contacts`);
                const formattedContacts = contacts.map(c => {
                    return { 
                        ...c, 
                        id: c._id.toString(),
                        _id: undefined 
                    };
                });
                
                return createResponse(200, formattedContacts);
            }
        }

        // POST: Create a new contact for the client
        else if (event.httpMethod === 'POST') {
            if (!clientId) {
                return createErrorResponse(400, 'Client ID required to create a contact');
            }
            
            if (!ObjectId.isValid(clientId)) {
                return createErrorResponse(400, 'Invalid client ID format');
            }
            
            const clientExists = await db.collection('clients').countDocuments({ 
                _id: new ObjectId(clientId), 
                teamId 
            });
            
            if (clientExists === 0) {
                return createErrorResponse(404, 'Client not found or not associated with this team');
            }
            
            let data;
            try {
                data = JSON.parse(event.body);
                console.log('Received contact data:', data);
            } catch (e) { 
                return createErrorResponse(400, 'Invalid JSON'); 
            }

            const validationResult = ContactSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

            const now = new Date();
            // Create a proper contact object
            const newContact = {
                ...validatedData,
                clientId: clientId,  // Ensure this is stored as the parent client ID
                isContact: true,     // Add a flag to clearly identify this as a contact
                teamId: teamId,
                createdAt: now,
                updatedAt: now,
                createdBy: userId
            };
            
            // Handle primary contact logic: ensure only one primary per client
            if (newContact.isPrimary) {
                await collection.updateMany({ clientId: clientId, teamId: teamId }, { $set: { isPrimary: false } });
            }

            console.log('Saving contact to clientContacts collection:', newContact);
            const result = await collection.insertOne(newContact);
            newContact.id = result.insertedId.toString();
            delete newContact._id;
            
            // Also update the client with the contact info if it's the primary contact
            if (newContact.isPrimary) {
                await db.collection('clients').updateOne(
                    { _id: new ObjectId(clientId) },
                    { 
                        $set: { 
                            contactName: newContact.name,
                            contactEmail: newContact.email || '',
                            contactPhone: newContact.phone || '',
                            updatedAt: now
                        } 
                    }
                );
            }
            
            return createResponse(201, newContact);
        }

        // PUT: Update a specific contact
        else if (event.httpMethod === 'PUT' && contactId) {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { 
                return createErrorResponse(400, 'Invalid JSON'); 
            }
            
            const validationResult = ContactUpdateSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;
            
            if (Object.keys(validatedData).length === 0) {
                return createErrorResponse(400, 'No valid fields provided for update');
            }
            
            const updateFields = { ...validatedData, updatedAt: new Date() };
            // Don't allow changing key fields
            delete updateFields.clientId;
            delete updateFields.teamId;
            delete updateFields.createdBy;
            delete updateFields.createdAt;
            delete updateFields.id;

            // Query by ID and team ID for security
            const result = await collection.updateOne(
                { _id: new ObjectId(contactId), teamId: teamId }, 
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Contact not found or user unauthorized');
            }
            
            const updatedContact = await collection.findOne({ _id: new ObjectId(contactId) });
            updatedContact.id = updatedContact._id.toString();
            delete updatedContact._id;
            return createResponse(200, updatedContact);
        }

        // DELETE: Delete a specific contact
        else if (event.httpMethod === 'DELETE' && contactId) {
            const result = await collection.deleteOne({ 
                _id: new ObjectId(contactId), 
                teamId: teamId 
            });
            
            if (result.deletedCount === 0) {
                return createErrorResponse(404, 'Contact not found or user unauthorized');
            }
            
            return createResponse(200, { message: 'Contact deleted successfully' });
        }

        // Method Not Allowed or Path Incorrect
        else {
            return createErrorResponse(405, 'Method Not Allowed or Invalid Path');
        }

    } catch (error) {
        console.error('Error handling client contacts request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 