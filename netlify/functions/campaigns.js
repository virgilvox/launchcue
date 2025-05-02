const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // Use new authentication handler
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Campaign Step
const CampaignStepSchema = z.object({
    id: z.string().optional(), // Frontend might generate temporary IDs
    title: z.string().min(1, "Step title is required"),
    description: z.string().optional(),
    date: z.string().datetime({ message: "Invalid step date format" }),
    assigneeId: z.string().nullable().optional(), // Link to user ID
    // Add other step-specific fields (e.g., type, status)
});

// Zod Schema for Campaign (with steps)
const CampaignSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().optional(),
    types: z.array(z.string()).optional(), // Array of strings like ["Docs", "Blog"]
    clientId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Client ID" }).nullable().optional(),
    projectId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Project ID" }).nullable().optional(),
    startDate: z.string().datetime({ message: "Invalid start date format" }).optional().nullable(),
    endDate: z.string().datetime({ message: "Invalid end date format" }).optional().nullable(),
    steps: z.array(CampaignStepSchema).optional().default([]), // Add steps array
    // Add other fields like status, goals, steps later if needed
});

const CampaignUpdateSchema = CampaignSchema.partial();

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authContext;
    try {
        // Use the new unified authentication method with scope checking
        authContext = await authenticate(event, {
            requiredScopes: event.httpMethod === 'GET' 
                ? ['read:campaigns'] 
                : ['write:campaigns']
        });
    } catch (errorResponse) {
        console.error("Authentication failed:", errorResponse.body || errorResponse);
        if(errorResponse.statusCode) return errorResponse; 
        return createErrorResponse(401, 'Unauthorized');
    }
    
    // Use userId and teamId from the authentication context
    const { userId, teamId } = authContext;

    let campaignId = null;
    const pathParts = event.path.split('/');
    const campaignsIndex = pathParts.indexOf('campaigns');
    if (campaignsIndex !== -1 && pathParts.length > campaignsIndex + 1) {
        const potentialId = pathParts[campaignsIndex + 1];
        // Check if the part after /campaigns/ is a valid ID, not a sub-resource like 'steps'
        if (ObjectId.isValid(potentialId) && pathParts.length === campaignsIndex + 2) {
            campaignId = potentialId;
        }
    }

    try {
        const { db } = await connectToDb();
        const collection = db.collection('campaigns');

        // GET: List or single item
        if (event.httpMethod === 'GET') {
            if (campaignId) {
                const campaign = await collection.findOne({ _id: new ObjectId(campaignId), teamId });
                if (!campaign) {
                    return createErrorResponse(404, 'Campaign not found');
                }
                campaign.id = campaign._id.toString();
                delete campaign._id;
                return createResponse(200, campaign);
            } else {
                // Add filtering by clientId if needed
                const { clientId, projectId } = event.queryStringParameters || {};
                const query = { teamId };
                if (clientId && ObjectId.isValid(clientId)) query.clientId = clientId;
                if (projectId && ObjectId.isValid(projectId)) query.projectId = projectId;
                
                const campaigns = await collection.find(query).sort({ createdAt: -1 }).toArray();
                const formattedCampaigns = campaigns.map(c => ({ ...c, id: c._id.toString(), _id: undefined }));
                return createResponse(200, formattedCampaigns);
            }
        }

        // POST: Create new item
        else if (event.httpMethod === 'POST') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = CampaignSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

            // Optional: Verify client/project exist if IDs provided
            if (validatedData.clientId) {
                const clientExists = await db.collection('clients').countDocuments({ _id: new ObjectId(validatedData.clientId), teamId });
                if (clientExists === 0) return createErrorResponse(400, `Client ${validatedData.clientId} not found`);
            }
             if (validatedData.projectId) {
                const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
                if (projectExists === 0) return createErrorResponse(400, `Project ${validatedData.projectId} not found`);
            }

            const now = new Date();
            const newCampaign = {
                ...validatedData,
                startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
                endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
                // Ensure steps have valid ObjectIds if provided, or generate new ones
                steps: (validatedData.steps || []).map(step => ({
                    ...step,
                    id: new ObjectId() // Assign new DB ID for each step on creation
                })),
                teamId,
                userId,
                createdAt: now,
                updatedAt: now,
            };

            const result = await collection.insertOne(newCampaign);
            // Map step ObjectId back to string for response
            newCampaign.steps = newCampaign.steps.map(s => ({...s, id: s.id.toString()}));
            newCampaign.id = result.insertedId.toString();
            delete newCampaign._id;
            return createResponse(201, newCampaign);
        }

        // PUT: Update item
        else if (event.httpMethod === 'PUT' && campaignId) {
             let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }
            
            const validationResult = CampaignUpdateSchema.safeParse(data);
             if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;
            
            if (Object.keys(validatedData).length === 0) {
                 return createErrorResponse(400, 'No valid fields provided for update');
            }
            
            // Optional: Verify client/project exist if IDs provided
            if (validatedData.clientId) {
                const clientExists = await db.collection('clients').countDocuments({ _id: new ObjectId(validatedData.clientId), teamId });
                if (clientExists === 0) return createErrorResponse(400, `Client ${validatedData.clientId} not found`);
            }
            if (validatedData.projectId) {
                const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
                if (projectExists === 0) return createErrorResponse(400, `Project ${validatedData.projectId} not found`);
            }
            
            const updateFields = { ...validatedData, updatedAt: new Date() };
            if (updateFields.startDate) updateFields.startDate = new Date(updateFields.startDate);
            if (updateFields.endDate) updateFields.endDate = new Date(updateFields.endDate);
            
            // Handle steps update carefully
            if (updateFields.steps) {
                updateFields.steps = updateFields.steps.map(step => ({
                    ...step,
                    // Assign ObjectId if it's a new step (no ID or non-valid ID)
                    id: (step.id && ObjectId.isValid(step.id)) ? new ObjectId(step.id) : new ObjectId()
                }));
            }

            delete updateFields.teamId; delete updateFields.userId; delete updateFields.createdAt; delete updateFields.id;

            const result = await collection.updateOne(
                { _id: new ObjectId(campaignId), teamId }, 
                { $set: updateFields }
            );

            if (result.matchedCount === 0) {
                return createErrorResponse(404, 'Campaign not found or user unauthorized');
            }
            
            const updatedCampaign = await collection.findOne({ _id: new ObjectId(campaignId), teamId });
            // Map step IDs back to strings
            updatedCampaign.steps = (updatedCampaign.steps || []).map(s => ({...s, id: s.id.toString()}));
            updatedCampaign.id = updatedCampaign._id.toString();
            delete updatedCampaign._id;
            return createResponse(200, updatedCampaign);
        }

        // DELETE: Delete item
        else if (event.httpMethod === 'DELETE' && campaignId) {
            // Optional: Delete associated steps/events first
            // await db.collection('campaignSteps').deleteMany({ campaignId: campaignId, teamId: teamId });
            
            const result = await collection.deleteOne({ _id: new ObjectId(campaignId), teamId });
            if (result.deletedCount === 0) {
                 return createErrorResponse(404, 'Campaign not found or user unauthorized');
            }
            return createResponse(200, { message: 'Campaign deleted successfully' });
        }

        // Method Not Allowed
        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        console.error('Error handling campaigns request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 