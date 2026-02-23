const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // New unified authentication
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Zod Schema for Note
const NoteSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    content: z.string().min(1, "Content is required"),
    tags: z.array(z.string().max(50)).optional(),
    // Optional links
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }).nullable().optional(),
    projectId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Project ID" }).nullable().optional(),
});

const NoteUpdateSchema = NoteSchema.partial();

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authContext;
    try {
        // Use the new unified authentication method (works for both JWT and API key)
        authContext = await authenticate(event, {
          requiredScopes: event.httpMethod === 'GET' 
            ? ['read:notes'] 
            : ['write:notes']
        });
    } catch (errorResponse) {
        logger.error("Authentication failed:", errorResponse.body || errorResponse);
        if(errorResponse.statusCode) return errorResponse; 
        return createErrorResponse(401, 'Unauthorized');
    }
    const { userId, teamId } = authContext;

    const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
    if (rateLimited) return rateLimited;

    let noteId = null;
    const pathParts = event.path.split('/');
    const notesIndex = pathParts.indexOf('notes');
    if (notesIndex !== -1 && pathParts.length > notesIndex + 1) {
        const potentialId = pathParts[notesIndex + 1];
        if (ObjectId.isValid(potentialId)) {
            noteId = potentialId;
        }
    }

    try {
        const { db } = await connectToDb();
        const collection = db.collection('notes');

        // GET: List or single item
        if (event.httpMethod === 'GET') {
            if (noteId) {
                const note = await collection.findOne({ _id: new ObjectId(noteId), teamId });
                if (!note) {
                    return createErrorResponse(404, 'Note not found');
                }
                note.id = note._id.toString();
                delete note._id;
                return createResponse(200, note);
            } else {
                const qp = event.queryStringParameters || {};
                const query = { teamId, ...notDeleted };
                if (qp.tag) query.tags = qp.tag;
                if (qp.clientId && ObjectId.isValid(qp.clientId)) query.clientId = qp.clientId;
                if (qp.projectId && ObjectId.isValid(qp.projectId)) query.projectId = qp.projectId;

                const formatNote = n => ({ ...n, id: n._id.toString(), _id: undefined });

                if (qp.page) {
                  const { page, limit, skip } = getPaginationParams(qp);
                  const [notes, total] = await Promise.all([
                    collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
                    collection.countDocuments(query),
                  ]);
                  return createResponse(200, createPaginatedResponse(notes.map(formatNote), total, page, limit));
                }

                const notes = await collection.find(query).sort({ createdAt: -1 }).toArray();
                return createResponse(200, notes.map(formatNote));
            }
        }

        // POST: Create new item
        else if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = NoteSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

            // Verify client/project if IDs provided
            if (validatedData.clientId) {
                const clientExists = await db.collection('clients').countDocuments({ _id: new ObjectId(validatedData.clientId), teamId });
                if (clientExists === 0) return createErrorResponse(400, `Client ${validatedData.clientId} not found`);
            }
             if (validatedData.projectId) {
                const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
                if (projectExists === 0) return createErrorResponse(400, `Project ${validatedData.projectId} not found`);
            }

            const now = new Date();
            const newNote = {
                ...validatedData,
                tags: validatedData.tags || [], // Ensure tags is an array
                teamId,
                userId,
                createdAt: now,
                updatedAt: now,
            };

            const result = await collection.insertOne(newNote);
            newNote.id = result.insertedId.toString();
            delete newNote._id;
            await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'note', resourceId: result.insertedId.toString() });
            return createResponse(201, newNote);
        }

        // PUT: Update item
        else if (event.httpMethod === 'PUT' && noteId) {
             let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
            
            const validationResult = NoteUpdateSchema.safeParse(data);
             if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;
            
            if (Object.keys(validatedData).length === 0) {
                 return createErrorResponse(400, 'No valid fields provided for update');
            }

            // Verify client/project if IDs provided
             if (validatedData.clientId) {
                const clientExists = await db.collection('clients').countDocuments({ _id: new ObjectId(validatedData.clientId), teamId });
                if (clientExists === 0) return createErrorResponse(400, `Client ${validatedData.clientId} not found`);
            }
             if (validatedData.projectId) {
                const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
                if (projectExists === 0) return createErrorResponse(400, `Project ${validatedData.projectId} not found`);
            }
            
            const updateFields = { ...validatedData, updatedAt: new Date() };
            delete updateFields.teamId; delete updateFields.userId; delete updateFields.createdAt; delete updateFields.id;

            const result = await collection.updateOne(
                { _id: new ObjectId(noteId), teamId }, 
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Note not found or user unauthorized');
            }
            
            const updatedNote = await collection.findOne({ _id: new ObjectId(noteId), teamId });
            updatedNote.id = updatedNote._id.toString();
            delete updatedNote._id;
            await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'note', resourceId: noteId });
            return createResponse(200, updatedNote);
        }

        // DELETE: Delete item
        else if (event.httpMethod === 'DELETE' && noteId) {
            const result = await softDelete(collection, { _id: new ObjectId(noteId), teamId, ...notDeleted }, userId);
            if (result.matchedCount === 0) {
                 return createErrorResponse(404, 'Note not found or user unauthorized');
            }
            await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'note', resourceId: noteId });
            return createResponse(200, { message: 'Note deleted successfully' });
        }

        // Method Not Allowed
        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        logger.error('Error handling notes request:', error);
        const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
        return createErrorResponse(500, 'Internal Server Error', safeDetails);
    }
}; 