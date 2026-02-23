const { MongoClient, ObjectId } = require('mongodb');
const { z } = require('zod'); // Import Zod
const { connectToDb, closeDbConnection } = require('./utils/db');
const { authenticate } = require('./utils/authHandler'); // New centralized auth
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Zod schema for validating new task data (POST)
const TaskCreateSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['To Do', 'In Progress', 'Blocked', 'Done']).default('To Do'),
  type: z.string().optional(), // Consider an enum if types are fixed
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string()
    .refine(val => val === null || val === undefined || ObjectId.isValid(val),
      { message: "Invalid Assignee ID format" })
    .nullable().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string()
    .refine(val => val === null || val === undefined || ObjectId.isValid(val),
      { message: "Invalid Project ID format" })
    .optional(),
  dueDate: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
  checklist: z.array(z.object({
    // Assuming simple checklist structure for now
    id: z.string().optional(), // Allow client-generated IDs
    title: z.string().min(1),
    completed: z.boolean().default(false)
  })).optional()
});

// Zod schema for validating task update data (PUT)
// Allows partial updates, making fields optional
const TaskUpdateSchema = TaskCreateSchema.partial();

// Helper function to sync task with calendar
async function syncTaskWithCalendar(db, task, operation) {
  try {
    // Only sync tasks with due dates
    if (!task.dueDate) return;
    
    const calendarCollection = db.collection('calendarEvents');
    
    if (operation === 'create' || operation === 'update') {
      // Check if calendar event already exists for this task
      const existingEvent = await calendarCollection.findOne({ taskId: task.id });
      
      const eventData = {
        title: `Task: ${task.title}`,
        start: task.dueDate, // Use due date as event start
        end: task.dueDate,   // Same day for now
        allDay: true,        // Tasks due dates are typically all-day events
        description: task.description || '',
        color: task.status === 'Done' ? 'green' : (task.status === 'Blocked' ? 'red' : 'blue'),
        projectId: task.projectId,
        taskId: task.id,     // Reference to the original task
        teamId: task.teamId,
        userId: task.createdBy,
        updatedAt: new Date(),
      };
      
      if (existingEvent) {
        // Update existing event
        await calendarCollection.updateOne(
          { _id: existingEvent._id },
          { $set: eventData }
        );
      } else {
        // Create new event
        eventData.createdAt = new Date();
        await calendarCollection.insertOne(eventData);
      }
    } else if (operation === 'delete') {
      // Delete the calendar event when the task is deleted
      await calendarCollection.deleteOne({ taskId: task.id });
    }
  } catch (error) {
    logger.error('Error syncing task with calendar:', error);
    // Don't throw error - this is a background operation that shouldn't affect the main task action
  }
}

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    // Use the new unified authentication method (works for both JWT and API key)
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:tasks'] 
        : ['write:tasks']
    });
  } catch (errorResponse) {
    logger.error("Authentication failed:", errorResponse.body || errorResponse);
    if(errorResponse.statusCode) return errorResponse; 
    return createErrorResponse(401, 'Unauthorized');
  }
  
  // Proceed with userId and teamId from the successful auth context
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  // Extract task ID from path for single-task operations
  let taskId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2) {
    const potentialTaskId = pathParts[pathParts.length - 1];
    if (ObjectId.isValid(potentialTaskId)) {
      taskId = potentialTaskId;
    }
  }
  
  try {
    const { db } = await connectToDb();
    const collection = db.collection('tasks'); // Use variable for clarity
    
    // GET request - Fetch tasks
    if (event.httpMethod === 'GET') {
      if (taskId) {
        const task = await collection.findOne({
          _id: new ObjectId(taskId),
          teamId: teamId 
        });
        if (!task) {
          return createErrorResponse(404, 'Task not found');
        }
        task.id = task._id.toString();
        delete task._id;
        return createResponse(200, task);
      } else {
        const query = { teamId, ...notDeleted };
        const qp = event.queryStringParameters || {};
        if (qp.projectId && ObjectId.isValid(qp.projectId)) query.projectId = qp.projectId;
        if (qp.status) query.status = qp.status;
        if (qp.type) query.type = qp.type;
        if (qp.priority) query.priority = qp.priority;
        if (qp.assigneeId && ObjectId.isValid(qp.assigneeId)) query.assigneeId = qp.assigneeId;

        const formatTask = t => ({ ...t, id: t._id.toString(), _id: undefined });

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [tasks, total] = await Promise.all([
            collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(tasks.map(formatTask), total, page, limit));
        }

        const tasks = await collection.find(query).toArray();
        return createResponse(200, tasks.map(formatTask));
      }
    } 
    
    // POST request - Create a new task
    else if (event.httpMethod === 'POST') {
        let data;
        try {
            data = JSON.parse(event.body);
            logger.debug('Task creation request:', data);
        } catch (e) { 
            logger.error('Invalid JSON in task creation:', e);
            return createErrorResponse(400, 'Invalid JSON'); 
        }

        const validationResult = TaskCreateSchema.safeParse(data);
        if (!validationResult.success) {
            logger.error('Task validation failed:', validationResult.error.format());
            return createErrorResponse(400, 'Validation failed', validationResult.error.format());
        }
        
        const validatedData = validationResult.data;
        const now = new Date();
        const newTask = {
            title: validatedData.title,
            description: validatedData.description,
            status: validatedData.status,
            type: validatedData.type || 'task',
            priority: validatedData.priority || 'medium',
            assigneeId: validatedData.assigneeId || null,
            tags: validatedData.tags || [],
            projectId: validatedData.projectId || null,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            checklist: validatedData.checklist || [],
            teamId: teamId,
            createdAt: now,
            updatedAt: now,
            createdBy: userId
        };
        
        logger.debug('Processed task data:', newTask);
        
        // Optional: Verify projectId exists if provided
        if (newTask.projectId) {
            try {
                const projectExists = await db.collection('projects').countDocuments({ 
                    _id: new ObjectId(newTask.projectId), 
                    teamId 
                });
                
                if (projectExists === 0) {
                    logger.error(`Project not found: ${newTask.projectId} for team ${teamId}`);
                    return createErrorResponse(400, `Project with ID ${newTask.projectId} not found or not associated with this team`);
                }
                
                logger.debug(`Project verification successful for ID: ${newTask.projectId}`);
            } catch (err) {
                logger.error(`Error verifying project existence: ${err.message}`);
                const safeDetails = process.env.NODE_ENV === 'production' ? undefined : err.message;
                return createErrorResponse(500, 'Error verifying project existence', safeDetails);
            }
        }

        try {
            const result = await collection.insertOne(newTask);
            logger.debug(`Task created with ID: ${result.insertedId}`);
            
            const createdTask = { ...newTask, id: result.insertedId.toString() };
            delete createdTask._id;
            
            // Sync task with calendar
            await syncTaskWithCalendar(db, createdTask, 'create');

            await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'task', resourceId: result.insertedId.toString() });

            return createResponse(201, createdTask);
        } catch (err) {
            logger.error(`Error inserting task: ${err.message}`);
            const safeDetails = process.env.NODE_ENV === 'production' ? undefined : err.message;
            return createErrorResponse(500, 'Error creating task', safeDetails);
        }
    } 
    
    // PUT request - Update an existing task
    else if (event.httpMethod === 'PUT' && taskId) {
        let data;
        try {
            data = JSON.parse(event.body);
        } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

        const validationResult = TaskUpdateSchema.safeParse(data);
        if (!validationResult.success) {
            return createErrorResponse(400, 'Validation failed', validationResult.error.format());
        }
        
        const validatedData = validationResult.data;

        // Optional: Verify projectId exists if it's being updated
        if (validatedData.projectId) {
             const projectExists = await db.collection('projects').countDocuments({ _id: new ObjectId(validatedData.projectId), teamId });
             if (projectExists === 0) {
                 return createErrorResponse(400, `Project with ID ${validatedData.projectId} not found or not associated with this team`);
             }
        }

        // Find the task ensuring it belongs to the correct team
        const existingTask = await collection.findOne({
            _id: new ObjectId(taskId),
            teamId: teamId
        });
        if (!existingTask) {
            return createErrorResponse(404, 'Task not found');
        }
        
        const updateFields = {};
        for (const key in validatedData) {
            if (validatedData[key] !== undefined) {
                if (key === 'dueDate' && validatedData.dueDate) {
                    updateFields[key] = new Date(validatedData.dueDate);
                } else {
                    updateFields[key] = validatedData[key];
                }
            }
        }
        delete updateFields.teamId; delete updateFields.userId; delete updateFields.createdAt; delete updateFields.id;

        if (Object.keys(updateFields).length === 0) {
            return createErrorResponse(400, 'No valid fields provided for update');
        }
        updateFields.updatedAt = new Date();

        await collection.updateOne({ _id: new ObjectId(taskId) }, { $set: updateFields });
        
        const updatedTaskResult = await collection.findOne({ _id: new ObjectId(taskId) });
        const updatedTask = { ...updatedTaskResult, id: updatedTaskResult._id.toString() };
        delete updatedTask._id;
        
        // Sync task with calendar
        await syncTaskWithCalendar(db, updatedTask, 'update');

        await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'task', resourceId: taskId });

        return createResponse(200, updatedTask);
    } 
    
    // DELETE request - Delete a task
    else if (event.httpMethod === 'DELETE' && taskId) {
      // Find the task first so we can use it for calendar sync
      const taskToDelete = await collection.findOne({ _id: new ObjectId(taskId), teamId: teamId });
      
      if (!taskToDelete) {
        return createErrorResponse(404, 'Task not found or not authorized to delete');
      }
      
      // Soft delete the task
      await softDelete(collection, { _id: new ObjectId(taskId), teamId: teamId, ...notDeleted }, userId);
      
      // Format task for calendar sync
      const formattedTask = {
        ...taskToDelete,
        id: taskToDelete._id.toString(),
      };
      
      // Sync deletion with calendar
      await syncTaskWithCalendar(db, formattedTask, 'delete');

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'task', resourceId: taskId });

      return createResponse(200, { message: 'Task deleted successfully' });
    } 
    
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error in tasks handler AFTER auth/db connect:', error);
    if (error.statusCode) {
        return error;
    }
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
}; 