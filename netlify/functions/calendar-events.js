const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');
const { notDeleted, softDelete } = require('./utils/softDelete');

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
    recurrence: z.object({
        frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
        interval: z.number().int().min(1).default(1),
        endDate: z.string().datetime().nullable().optional(),
    }).nullable().optional(),
    reminders: z.array(z.object({
        type: z.enum(['email', 'inApp']),
        minutesBefore: z.number().int().min(0),
    })).optional(),
});

const EventUpdateSchema = EventSchema.partial();

/**
 * Generate recurring event occurrences within a given date range.
 * If the event has no recurrence, returns the event as-is.
 */
function generateOccurrences(event, rangeStart, rangeEnd) {
    // If no recurrence, return the event as-is
    if (!event.recurrence) return [event];

    const occurrences = [];
    const { frequency, interval, endDate } = event.recurrence;
    let currentDate = new Date(event.start);
    const end = endDate ? new Date(endDate) : new Date(rangeEnd);
    const rangeStartDate = new Date(rangeStart);

    while (currentDate <= end && currentDate <= new Date(rangeEnd)) {
        if (currentDate >= rangeStartDate) {
            const occurrence = {
                ...event,
                start: currentDate.toISOString(),
                end: event.end ? new Date(new Date(event.end).getTime() + (currentDate.getTime() - new Date(event.start).getTime())).toISOString() : null,
                isRecurrence: true,
                originalEventId: event.id || event._id?.toString(),
            };
            occurrences.push(occurrence);
        }

        // Advance by interval based on frequency
        switch (frequency) {
            case 'daily': currentDate.setDate(currentDate.getDate() + interval); break;
            case 'weekly': currentDate.setDate(currentDate.getDate() + (7 * interval)); break;
            case 'monthly': currentDate.setMonth(currentDate.getMonth() + interval); break;
            case 'yearly': currentDate.setFullYear(currentDate.getFullYear() + interval); break;
        }
    }

    return occurrences;
}

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authContext;
    try {
        // Use the new unified authentication method with scope checking
        authContext = await authenticate(event, {
            requiredScopes: event.httpMethod === 'GET' 
                ? ['read:calendar-events'] 
                : ['write:calendar-events']
        });
    } catch (errorResponse) {
        logger.error("Authentication failed:", errorResponse.body || errorResponse);
        if(errorResponse.statusCode) return errorResponse; 
        return createErrorResponse(401, 'Unauthorized');
    }
    
    // Use userId and teamId from the authentication context
    const { userId, teamId } = authContext;

    const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
    if (rateLimited) return rateLimited;

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
            const query = { teamId, ...notDeleted };
            
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

            // Expand recurring events into individual occurrences when date range is provided
            if (start && end) {
                const expandedEvents = [];
                for (const evt of formattedEvents) {
                    const occurrences = generateOccurrences(evt, start, end);
                    expandedEvents.push(...occurrences);
                }
                // Sort expanded events by start date
                expandedEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
                return createResponse(200, expandedEvents);
            }

            return createResponse(200, formattedEvents);
        }

        // GET: Single event (if needed)
        else if (event.httpMethod === 'GET' && eventId) {
            const eventDoc = await collection.findOne({ _id: new ObjectId(eventId), teamId, ...notDeleted });
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
                recurrence: validatedData.recurrence || null,
                reminders: validatedData.reminders || [],
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
            await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'calendarEvent', resourceId: result.insertedId.toString() });
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
            if (validatedData.hasOwnProperty('recurrence')) updateFields.recurrence = validatedData.recurrence || null;
            if (validatedData.hasOwnProperty('reminders')) updateFields.reminders = validatedData.reminders || [];

            delete updateFields._id; delete updateFields.id; delete updateFields.teamId; delete updateFields.userId; delete updateFields.createdAt; delete updateFields.deletedAt; delete updateFields.deletedBy;

            const result = await collection.updateOne({ _id: new ObjectId(eventId), teamId, ...notDeleted }, { $set: updateFields });

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Event not found or user unauthorized');
            }
            
            const updatedEvent = await collection.findOne({ _id: new ObjectId(eventId), teamId });
            updatedEvent.id = updatedEvent._id.toString();
            updatedEvent.start = updatedEvent.start?.toISOString();
            updatedEvent.end = updatedEvent.end?.toISOString();
            delete updatedEvent._id;
            await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'calendarEvent', resourceId: eventId });
            return createResponse(200, updatedEvent);
        }

        // DELETE: Soft delete event
        else if (event.httpMethod === 'DELETE' && eventId) {
            const result = await softDelete(collection, { _id: new ObjectId(eventId), teamId, ...notDeleted }, userId);
            if (result.matchedCount === 0) {
                 return createErrorResponse(404, 'Event not found or user unauthorized');
            }
            await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'calendarEvent', resourceId: eventId });
            return createResponse(200, { message: 'Event deleted successfully' });
        }

        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        logger.error('Error handling calendar events request:', error);
        const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
        return createErrorResponse(500, 'Internal Server Error', safeDetails);
    }
}; 