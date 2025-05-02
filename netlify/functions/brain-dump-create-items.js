const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

// Mapping AI item types to database collections and potential default values
const itemTypeMapping = {
  task: {
    collection: 'tasks',
    defaults: { status: 'To Do', priority: 'Medium' }
  },
  event: {
    collection: 'calendarEvents', // Assuming a collection name for calendar events
    defaults: { duration: '1 hour' }
  },
  project: {
    collection: 'projects',
    defaults: { status: 'Planning' }
  }
  // Add more mappings as needed (e.g., 'note', 'resource')
};

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

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  try {
    console.log('Received request body:', event.body);
    const requestBody = JSON.parse(event.body);
    
    // Extract items - handle both array format and category object format
    const tasks = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'task') 
                                            : requestBody.tasks || [];
    const events = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'event') 
                                             : requestBody.events || [];
    const projects = Array.isArray(requestBody) ? requestBody.filter(item => item.type === 'project') 
                                               : requestBody.projects || [];
    
    const itemsToCreate = [...tasks, ...events, ...projects];

    if (itemsToCreate.length === 0) {
      return createErrorResponse(400, 'No items provided to create');
    }

    const { db } = await connectToDb();
    const results = { created: [], errors: [] };
    const now = new Date();

    for (const item of itemsToCreate) {
      const itemType = item.type?.toLowerCase();
      const mapping = itemTypeMapping[itemType];
      
      if (!mapping) {
        results.errors.push({ itemTitle: item.title, error: `Unsupported item type: ${itemType}` });
        continue;
      }

      if (!item.title) {
        results.errors.push({ item, error: 'Item title is required' });
        continue;
      }

      const collection = db.collection(mapping.collection);
      const newItem = {
        ...mapping.defaults, // Apply default values
        ...item, // Apply values from AI
        teamId: teamId, // Ensure correct team assignment
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        source: 'braindump-ai' // Add source tracking
      };

      // Remove fields not belonging to the schema
      delete newItem.type;
      
      // Handle special field mappings
      if (newItem.eventDateTime && mapping.collection === 'calendarEvents') {
        newItem.start = new Date(newItem.eventDateTime); // Map to correct field
        newItem.end = new Date(new Date(newItem.eventDateTime).getTime() + 60 * 60 * 1000); // Default 1 hour
        delete newItem.eventDateTime;
      }
      
      // Format dates properly
      if (newItem.dueDate && typeof newItem.dueDate === 'string') {
        try {
          newItem.dueDate = new Date(newItem.dueDate);
        } catch (err) {
          console.warn(`Invalid dueDate format: ${newItem.dueDate}`, err);
        }
      }
      
      console.log(`Creating ${itemType}: ${newItem.title}`);
      
      try {
        const insertResult = await collection.insertOne(newItem);
        results.created.push({ 
            id: insertResult.insertedId.toString(), 
            type: itemType, // Return the original type for frontend tracking
            title: newItem.title 
        });
      } catch (dbError) {
        console.error(`Error creating ${itemType} "${item.title}":`, dbError);
        results.errors.push({ itemTitle: item.title, type: itemType, error: dbError.message });
      }
    }

    return createResponse(200, { 
        message: `Processed ${itemsToCreate.length} items. Created: ${results.created.length}, Errors: ${results.errors.length}`, 
        results 
    });

  } catch (error) {
    console.error('Error creating items from AI data:', error);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
}; 