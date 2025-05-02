const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for BrainDump
const BrainDumpSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    content: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // Add other fields if needed (e.g., associated clientId, projectId)
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }).nullable().optional(),
    projectId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Project ID" }).nullable().optional(),
});

const BrainDumpUpdateSchema = BrainDumpSchema.partial();

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authContext;
    try {
        // Use the new unified authentication method with scope checking
        authContext = await authenticate(event, {
            requiredScopes: event.httpMethod === 'GET' 
                ? ['read:braindumps'] 
                : ['write:braindumps']
        });
    } catch (errorResponse) {
        console.error("Authentication failed:", errorResponse.body || errorResponse);
        if(errorResponse.statusCode) return errorResponse; 
        return createErrorResponse(401, 'Unauthorized');
    }
    
    // Use userId and teamId from the authentication context
    const { userId, teamId } = authContext;

    let dumpId = null;
    const pathParts = event.path.split('/');
    const dumpsIndex = pathParts.indexOf('braindumps');
    if (dumpsIndex !== -1 && pathParts.length > dumpsIndex + 1) {
        const potentialId = pathParts[dumpsIndex + 1];
        if (ObjectId.isValid(potentialId)) {
            dumpId = potentialId;
        }
    }

    try {
        const { db } = await connectToDb();
        const collection = db.collection('braindumps');

        // GET: List or single item
        if (event.httpMethod === 'GET') {
            if (dumpId) {
                const dump = await collection.findOne({ _id: new ObjectId(dumpId), teamId });
                if (!dump) {
                    return createErrorResponse(404, 'Brain dump not found');
                }
                dump.id = dump._id.toString();
                delete dump._id;
                return createResponse(200, dump);
            } else {
                const dumps = await collection.find({ teamId }).sort({ createdAt: -1 }).toArray();
                const formattedDumps = dumps.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
                return createResponse(200, formattedDumps);
            }
        }

        // POST: Create new item
        else if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = BrainDumpSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

            const now = new Date();
            const newDump = {
                ...validatedData,
                teamId,
                userId,
                createdAt: now,
                updatedAt: now,
            };

            const result = await collection.insertOne(newDump);
            newDump.id = result.insertedId.toString();
            delete newDump._id;
            return createResponse(201, newDump);
        }

        // PUT: Update item
        else if (event.httpMethod === 'PUT' && dumpId) {
             let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
            
            const validationResult = BrainDumpUpdateSchema.safeParse(data);
             if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;
            
            if (Object.keys(validatedData).length === 0) {
                 return createErrorResponse(400, 'No valid fields provided for update');
            }
            
            const updateFields = { ...validatedData, updatedAt: new Date() };
            // Ensure immutable fields are not updated
            delete updateFields.teamId;
            delete updateFields.userId;
            delete updateFields.createdAt;
            delete updateFields.id;

            const result = await collection.updateOne(
                { _id: new ObjectId(dumpId), teamId }, // Ensure user owns the doc
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Brain dump not found or user unauthorized');
            }
            
            const updatedDump = await collection.findOne({ _id: new ObjectId(dumpId), teamId });
            updatedDump.id = updatedDump._id.toString();
            delete updatedDump._id;
            return createResponse(200, updatedDump);
        }

        // DELETE: Delete item
        else if (event.httpMethod === 'DELETE' && dumpId) {
            const result = await collection.deleteOne({ _id: new ObjectId(dumpId), teamId });
            if (result.deletedCount === 0) {
                 return createErrorResponse(404, 'Brain dump not found or user unauthorized');
            }
            return createResponse(200, { message: 'Brain dump deleted successfully' });
        }

        // Method Not Allowed
        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        console.error('Error handling braindumps request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 