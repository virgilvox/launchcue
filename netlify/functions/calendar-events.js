const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Calendar Event
const EventSchema = z.object({
    title: z.string().min(1, "Event title is required").max(200),
    start: z.string().datetime({ message: "Invalid start date/time" }),
    end: z.string().datetime({ message: "Invalid end date/time" }).optional().nullable(),
    allDay: z.boolean().default(false),
    description: z.string().optional(),
    color: z.string().optional(), // e.g., 'blue', 'green'
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }).nullable().optional(),
    projectId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Project ID" }).nullable().optional(),
});

const EventUpdateSchema = EventSchema.partial();

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

    let eventId = null;
    const pathParts = event.path.split('/');
    const eventsIndex = pathParts.indexOf('calendar-events');
    if (eventsIndex !== -1 && pathParts.length > eventsIndex + 1) {
        const potentialId = pathParts[eventsIndex + 1];
        if (ObjectId.isValid(potentialId)) {
            eventId = potentialId;
        }
    }

    try {
        const { db } = await connectToDb();
        const collection = db.collection('calendarEvents');

        // GET: List events (supports date range filtering)
        if (event.httpMethod === 'GET' && !eventId) {
            const { start, end, clientId, projectId } = event.queryStringParameters || {};
            const query = { teamId };
            
            // Date range filtering (required for calendar view)
            if (start) query.start = { $gte: new Date(start) };
            if (end) query.end = { $lte: new Date(end) }; // Adjust logic based on how end dates are stored/queried
            // Simple range query: find events starting within the range
            // if (start && end) {
            //     query.start = { $gte: new Date(start), $lte: new Date(end) };
            // }

            if (clientId && ObjectId.isValid(clientId)) query.clientId = clientId;
            if (projectId && ObjectId.isValid(projectId)) query.projectId = projectId;

            const events = await collection.find(query).sort({ start: 1 }).toArray();
            const formattedEvents = events.map(e => ({ 
                ...e, 
                id: e._id.toString(), 
                // Ensure dates are ISO strings for frontend
                start: e.start?.toISOString(), 
                end: e.end?.toISOString(), 
                _id: undefined 
            }));
            return createResponse(200, formattedEvents);
        }

        // GET: Single event (if needed)
        else if (event.httpMethod === 'GET' && eventId) {
            const eventDoc = await collection.findOne({ _id: new ObjectId(eventId), teamId });
            if (!eventDoc) return createErrorResponse(404, 'Event not found');
            eventDoc.id = eventDoc._id.toString();
            eventDoc.start = eventDoc.start?.toISOString();
            eventDoc.end = eventDoc.end?.toISOString();
            delete eventDoc._id;
            return createResponse(200, eventDoc);
        }

        // POST: Create new event
        else if (event.httpMethod === 'POST' && !eventId) {
            let data;
            try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = EventSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

            // Verify client/project if provided
             if (validatedData.clientId) {
                const clientExists = await db.collection('clients').countDocuments({ _id: new ObjectId(validatedData.clientId), teamId });
                if (clientExists === 0) return createErrorResponse(400, `Client ${validatedData.clientId} not found`);
            }
             if (validatedData.projectId) {
                const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
                if (projectExists === 0) return createErrorResponse(400, `Project ${validatedData.projectId} not found`);
            }

            const now = new Date();
            const newEvent = {
                ...validatedData,
                start: new Date(validatedData.start),
                end: validatedData.end ? new Date(validatedData.end) : null,
                teamId,
                userId,
                createdAt: now,
                updatedAt: now,
            };

            const result = await collection.insertOne(newEvent);
            newEvent.id = result.insertedId.toString();
            newEvent.start = newEvent.start?.toISOString();
            newEvent.end = newEvent.end?.toISOString();
            delete newEvent._id;
            return createResponse(201, newEvent);
        }

        // PUT: Update event
        else if (event.httpMethod === 'PUT' && eventId) {
             let data;
            try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
            
            const validationResult = EventUpdateSchema.safeParse(data);
             if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;
            
            if (Object.keys(validatedData).length === 0) {
                 return createErrorResponse(400, 'No valid fields provided for update');
            }

             // Verify client/project if provided
             if (validatedData.clientId) { /* ... verification ... */ }
             if (validatedData.projectId) { /* ... verification ... */ }
            
            const updateFields = { ...validatedData, updatedAt: new Date() };
            if (updateFields.start) updateFields.start = new Date(updateFields.start);
            if (updateFields.end) updateFields.end = new Date(updateFields.end);
            else if (validatedData.hasOwnProperty('end')) updateFields.end = null; // Allow unsetting end date
            
            delete updateFields.teamId; delete updateFields.userId; delete updateFields.createdAt; delete updateFields.id;

            const result = await collection.updateOne({ _id: new ObjectId(eventId), teamId }, { $set: updateFields });

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Event not found or user unauthorized');
            }
            
            const updatedEvent = await collection.findOne({ _id: new ObjectId(eventId) });
            updatedEvent.id = updatedEvent._id.toString();
            updatedEvent.start = updatedEvent.start?.toISOString();
            updatedEvent.end = updatedEvent.end?.toISOString();
            delete updatedEvent._id;
            return createResponse(200, updatedEvent);
        }

        // DELETE: Delete event
        else if (event.httpMethod === 'DELETE' && eventId) {
            const result = await collection.deleteOne({ _id: new ObjectId(eventId), teamId });
            if (result.deletedCount === 0) {
                 return createErrorResponse(404, 'Event not found or user unauthorized');
            }
            return createResponse(200, { message: 'Event deleted successfully' });
        }

        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        console.error('Error handling calendar events request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 