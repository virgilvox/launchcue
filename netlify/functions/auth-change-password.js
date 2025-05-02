const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

// Zod Schema for Password Change
const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
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
    const { userId } = authResult; // teamId not needed here

    if (event.httpMethod !== 'POST') {
        return createErrorResponse(405, 'Method Not Allowed');
    }

    try {
        let data;
        try {
            data = JSON.parse(event.body);
        } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

        const validationResult = PasswordChangeSchema.safeParse(data);
        if (!validationResult.success) {
            return createErrorResponse(400, 'Validation failed', validationResult.error.format());
        }
        const { currentPassword, newPassword } = validationResult.data;

        const { db } = await connectToDb();
        const usersCollection = db.collection('users');
        const userQuery = { _id: new ObjectId(userId) };

        // 1. Find the user
        const user = await usersCollection.findOne(userQuery);
        if (!user) {
            return createErrorResponse(404, 'User not found'); // Should not happen
        }

        // 2. Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return createErrorResponse(400, 'Incorrect current password');
        }
        
        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // 4. Update the user's password
        const result = await usersCollection.updateOne(userQuery, {
            $set: { 
                password: hashedNewPassword,
                updatedAt: new Date()
            }
        });

        if (result.matchedCount === 0) {
            return createErrorResponse(404, 'User not found during update'); // Should not happen
        }

        return createResponse(200, { message: "Password updated successfully" });

    } catch (error) {
        console.error('Error changing password:', error);
        return createErrorResponse(500, 'Internal Server Error', error.message);
    }
}; 