const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { notDeleted, softDelete } = require('./utils/softDelete');

const ContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(200),
  email: z.string().email({ message: 'Invalid email format' }).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

const ClientCreateSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(200),
  industry: z.string().max(100).optional(),
  website: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
  description: z.string().max(5000).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email({ message: 'Invalid email format' }).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  contacts: z.array(ContactSchema).optional(),
});

const ClientUpdateSchema = ClientCreateSchema.partial();

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
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:clients']
        : ['write:clients']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  // Extract client ID from path
  let clientId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2) {
    const pathClientId = pathParts[pathParts.length - 1];
    const isContactsPath = pathClientId === 'contacts';

    if (isContactsPath && pathParts.length > 3) {
      const potentialId = pathParts[pathParts.length - 2];
      if (ObjectId.isValid(potentialId)) {
        clientId = potentialId;
      }
    } else if (!isContactsPath && ObjectId.isValid(pathClientId)) {
      clientId = pathClientId;
    }
  }

  if (!clientId && event.queryStringParameters?.id && ObjectId.isValid(event.queryStringParameters.id)) {
    clientId = event.queryStringParameters.id;
  }

  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action;
  const contactId = queryParams.contactId;

  try {
    const { db } = await connectToDb();
    const clientsCollection = db.collection('clients');

    // Handle operations on specific client
    if (clientId) {
      try {
        const clientObjId = new ObjectId(clientId);
        const action = event.queryStringParameters?.action;

        if (action === 'getContacts') {
          const client = await clientsCollection.findOne({ _id: clientObjId, teamId: teamId });
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }
          return createResponse(200, client.contacts || []);
        }

        if (event.httpMethod === 'GET') {
          const client = await clientsCollection.findOne({ _id: clientObjId, teamId: teamId });
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }
          const formattedClient = { ...client, id: client._id.toString() };
          delete formattedClient._id;
          return createResponse(200, formattedClient);
        }

        if (event.httpMethod === 'PUT' && !action) {
          const body = JSON.parse(event.body);
          delete body.teamId;

          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId: teamId },
            { $set: { ...body, updatedAt: new Date() } },
            { returnDocument: 'after' }
          );

          if (!updateResult.value) {
            return createErrorResponse(404, 'Client not found');
          }
          return createResponse(200, updateResult.value);
        }

        if (event.httpMethod === 'DELETE') {
          const isContactAction =
            action === 'deleteContact' ||
            (pathParts.length > 3 && pathParts[pathParts.length - 2] === 'contacts');

          if (isContactAction) {
            let deleteContactId = event.queryStringParameters?.contactId;
            if (!deleteContactId && pathParts.length > 3 && pathParts[pathParts.length - 2] === 'contacts') {
              deleteContactId = pathParts[pathParts.length - 1];
            }

            if (!deleteContactId) {
              return createErrorResponse(400, 'Contact ID is required for contact deletion');
            }

            const clientDoc = await clientsCollection.findOne({ _id: new ObjectId(clientId), teamId });
            if (!clientDoc) {
              return createErrorResponse(404, 'Client not found');
            }

            const updateResult = await clientsCollection.findOneAndUpdate(
              { _id: new ObjectId(clientId), teamId },
              {
                $pull: { contacts: { id: deleteContactId } },
                $set: { updatedAt: new Date() }
              },
              { returnDocument: 'after' }
            );

            if (!updateResult.value) {
              return createErrorResponse(404, 'Client or contact not found');
            }
            return createResponse(200, { success: true, message: 'Contact deleted' });
          } else {
            if (!clientId || !ObjectId.isValid(clientId)) {
              return createErrorResponse(400, 'Invalid client ID');
            }
            const deleteResult = await softDelete(clientsCollection, { _id: new ObjectId(clientId), teamId, ...notDeleted }, userId);
            if (deleteResult.matchedCount === 0) {
              return createErrorResponse(404, 'Client not found');
            }
            return createResponse(200, { success: true, message: 'Client deleted' });
          }
        }

        if (event.httpMethod === 'POST' && action === 'addContact') {
          const body = JSON.parse(event.body);
          if (!body.name) {
            return createErrorResponse(400, 'Contact name is required');
          }

          const newContact = {
            ...body,
            id: new ObjectId().toString(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const client = await clientsCollection.findOne({ _id: clientObjId, teamId });
          if (!client) {
            return createErrorResponse(404, 'Client not found');
          }

          if (!client.contacts) {
            await clientsCollection.updateOne(
              { _id: clientObjId, teamId },
              { $set: { contacts: [] } }
            );
          }

          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId },
            {
              $push: { contacts: newContact },
              $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
          );

          if (!updateResult.value) {
            return createErrorResponse(500, 'Failed to add contact');
          }

          return createResponse(201, { ...newContact, id: newContact.id });
        }

        if (event.httpMethod === 'PUT' && action === 'updateContact') {
          const updateContactId = event.queryStringParameters?.contactId;
          if (!updateContactId) {
            return createErrorResponse(400, 'Contact ID is required');
          }

          const body = JSON.parse(event.body);

          const client = await clientsCollection.findOne({
            _id: clientObjId,
            teamId: teamId,
            'contacts.id': updateContactId
          });

          if (!client) {
            return createErrorResponse(404, 'Client or contact not found');
          }

          const existingContact = client.contacts.find(c => c.id === updateContactId);
          const updatedContact = {
            ...existingContact,
            ...body,
            id: updateContactId,
            updatedAt: new Date()
          };

          const updateResult = await clientsCollection.findOneAndUpdate(
            { _id: clientObjId, teamId: teamId, 'contacts.id': updateContactId },
            {
              $set: {
                'contacts.$': updatedContact,
                updatedAt: new Date()
              }
            },
            { returnDocument: 'after' }
          );

          if (!updateResult.value) {
            return createErrorResponse(404, 'Client or contact not found');
          }
          return createResponse(200, updatedContact);
        }

        return createErrorResponse(400, 'Invalid action or method for client ID');
      } catch (error) {
        logger.error(`Error handling client ${clientId}:`, error.message);
        return createErrorResponse(500, 'Server error', error.message);
      }
    }

    // List or create clients (no clientId)
    if (event.httpMethod === 'GET') {
      const query = { teamId, ...notDeleted };
      const qp = event.queryStringParameters || {};

      if (qp.page) {
        const { page, limit, skip } = getPaginationParams(qp);
        const [clients, total] = await Promise.all([
          clientsCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
          clientsCollection.countDocuments(query),
        ]);
        const formatted = clients.map(c => ({ ...c, id: c._id.toString(), _id: undefined }));
        return createResponse(200, createPaginatedResponse(formatted, total, page, limit));
      }

      const clients = await clientsCollection.find(query).toArray();
      const formattedClients = clients.map(c => ({
        ...c,
        id: c._id.toString(),
        _id: undefined
      }));
      return createResponse(200, formattedClients);
    }

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

    else if (event.httpMethod === 'PUT' && clientId) {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      const validationResult = ClientUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      const clientExists = await clientsCollection.findOne({
        _id: new ObjectId(clientId),
        teamId: teamId
      });

      if (!clientExists) {
        return createErrorResponse(404, 'Client not found or not associated with this team');
      }

      const updateData = { ...validatedData, updatedAt: new Date() };
      delete updateData.teamId;
      delete updateData.createdAt;
      delete updateData.createdBy;

      if (Array.isArray(updateData.contacts)) {
        updateData.contacts = updateData.contacts.map(contact => {
          if (!contact.id) {
            contact.id = new ObjectId().toString();
          }
          if (!contact.createdAt) {
            contact.createdAt = new Date().toISOString();
          }
          contact.updatedAt = new Date().toISOString();
          return contact;
        });
      } else if (updateData.contacts === undefined && clientExists.contacts) {
        updateData.contacts = clientExists.contacts;
      }

      await clientsCollection.updateOne(
        { _id: new ObjectId(clientId), teamId: teamId },
        { $set: updateData }
      );

      const updatedClient = await clientsCollection.findOne({
        _id: new ObjectId(clientId),
        teamId: teamId
      });
      if (updatedClient) {
        updatedClient.id = updatedClient._id.toString();
        delete updatedClient._id;
      } else {
        return createErrorResponse(404, 'Client not found after update');
      }

      return createResponse(200, updatedClient);
    }

    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error handling clients request:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
