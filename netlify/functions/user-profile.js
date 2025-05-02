const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Profile Update (excluding sensitive fields like email, password)
const ProfileUpdateSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100).optional(),
    jobTitle: z.string().max(100).optional().or(z.literal('')), // Allow empty string
    bio: z.string().max(500).optional().or(z.literal('')),
    avatarUrl: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')),
    // Add other updatable profile fields here
});

exports.handler = async function(event, context) {
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    let authResult;
    try {
        authResult = authenticateRequest(event);
    } catch (errorResponse) {
        return errorResponse;
    }
    const { userId, teamId } = authResult; // teamId might not be needed here but available

    try {
        const { db } = await connectToDb();
        const usersCollection = db.collection('users');
        const userQuery = { _id: new ObjectId(userId) };

        // GET: Fetch current user's profile
        if (event.httpMethod === 'GET') {
            const user = await usersCollection.findOne(userQuery, { 
                projection: { password: 0 } // Exclude password hash
            });
            if (!user) {
                return createErrorResponse(404, 'User not found');
            }
            // Format response
            const profileData = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                jobTitle: user.jobTitle || '',
                bio: user.bio || '',
                avatarUrl: user.avatarUrl || '',
                createdAt: user.createdAt
                // Add other fields
            };
            return createResponse(200, profileData);
        }

        // PUT: Update user's profile
        else if (event.httpMethod === 'PUT') {
            let data;
            try {
                data = JSON.parse(event.body);
            } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

            const validationResult = ProfileUpdateSchema.safeParse(data);
            if (!validationResult.success) {
                return createErrorResponse(400, 'Validation failed', validationResult.error.format());
            }
            const validatedData = validationResult.data;

             if (Object.keys(validatedData).length === 0) {
                 return createErrorResponse(400, 'No valid fields provided for update');
            }

            // Ensure email is not included in the update data
            delete validatedData.email;

            const updateFields = { ...validatedData, updatedAt: new Date() };

            const result = await usersCollection.updateOne(userQuery, { $set: updateFields });

            if (result.matchedCount === 0) {
                // Should not happen if user is authenticated
                return createErrorResponse(404, 'User not found'); 
            }

            // Fetch the updated user data to return (excluding password)
            const updatedUser = await usersCollection.findOne(userQuery, { 
                projection: { password: 0 }
            }); 

            const updatedProfileData = {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                jobTitle: updatedUser.jobTitle || '',
                bio: updatedUser.bio || '',
                avatarUrl: updatedUser.avatarUrl || '',
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            };

            return createResponse(200, updatedProfileData);
        }

        // Method Not Allowed
        else {
            return createErrorResponse(405, 'Method Not Allowed');
        }

    } catch (error) {
        console.error('Error handling user profile request:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 