const { ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { notDeleted, softDelete } = require('./utils/softDelete');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Standardize on 'title' - remove 'name' from schemas
const ProjectCreateSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(200),
  description: z.string().max(5000).optional(),
  status: z.string().optional().default('Planning'),
  clientId: z.string().refine(val => ObjectId.isValid(val), { message: 'Invalid Client ID' }),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const ProjectUpdateSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  clientId: z.string().refine(val => ObjectId.isValid(val), { message: 'Invalid Client ID' }).optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

async function syncProjectWithCalendar(db, project, operation) {
  try {
    if (!project.dueDate) return;

    const calendarCollection = db.collection('calendarEvents');

    if (operation === 'create' || operation === 'update') {
      const existingEvent = await calendarCollection.findOne({ projectId: project.id, taskId: null });

      const eventData = {
        title: `Project Due: ${project.title}`,
        start: project.dueDate,
        end: project.dueDate,
        allDay: true,
        description: project.description || '',
        color: project.status === 'Done' ? 'green' : 'orange',
        projectId: project.id,
        clientId: project.clientId,
        taskId: null,
        teamId: project.teamId,
        userId: project.createdBy,
        updatedAt: new Date(),
      };

      if (existingEvent) {
        await calendarCollection.updateOne(
          { _id: existingEvent._id },
          { $set: eventData }
        );
      } else {
        eventData.createdAt = new Date();
        await calendarCollection.insertOne(eventData);
      }
    } else if (operation === 'delete') {
      await calendarCollection.deleteOne({ projectId: project.id, taskId: null });
    }
  } catch (error) {
    logger.error('Error syncing project with calendar:', error.message);
  }
}

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:projects']
        : ['write:projects']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  const rateLimited = await rateLimitCheck(event, 'general', authContext.userId);
  if (rateLimited) return rateLimited;

  let projectId = null;
  const pathParts = event.path.split('/');
  if (pathParts.length > 2) {
    const potentialId = pathParts[pathParts.length - 1];
    if (ObjectId.isValid(potentialId)) {
      projectId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const projectsCollection = db.collection('projects');

    if (event.httpMethod === 'GET') {
      if (projectId) {
        const project = await projectsCollection.findOne({
          _id: new ObjectId(projectId),
          teamId: teamId,
          ...notDeleted
        });

        if (!project) {
          return createErrorResponse(404, 'Project not found');
        }

        project.id = project._id.toString();
        delete project._id;
        project.tags = Array.isArray(project.tags) ? project.tags : [];

        return createResponse(200, project);
      } else {
        const query = { teamId, ...notDeleted };
        const qp = event.queryStringParameters || {};
        if (qp.clientId && ObjectId.isValid(qp.clientId)) query.clientId = qp.clientId;
        if (qp.status) query.status = qp.status;

        const formatProject = p => ({ ...p, id: p._id.toString(), _id: undefined, tags: Array.isArray(p.tags) ? p.tags : [] });

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [projects, total] = await Promise.all([
            projectsCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            projectsCollection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(projects.map(formatProject), total, page, limit));
        }

        const projects = await projectsCollection.find(query).toArray();
        return createResponse(200, projects.map(formatProject));
      }
    }

    else if (event.httpMethod === 'POST') {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      // Support legacy 'name' field by mapping to 'title'
      if (data.name && !data.title) {
        data.title = data.name;
      }
      delete data.name;

      const validationResult = ProjectCreateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }
      const validatedData = validationResult.data;

      const client = await db.collection('clients').findOne({
        _id: new ObjectId(validatedData.clientId),
        teamId: teamId
      });
      if (!client) {
        return createErrorResponse(400, `Client with ID ${validatedData.clientId} not found or not associated with this team`);
      }

      const now = new Date();
      const newProject = {
        title: validatedData.title,
        description: validatedData.description || '',
        status: validatedData.status || 'Planning',
        clientId: validatedData.clientId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        tags: Array.isArray(validatedData.tags) ? validatedData.tags : [],
        teamId: teamId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId
      };

      const result = await projectsCollection.insertOne(newProject);
      const createdProject = { ...newProject, id: result.insertedId.toString() };
      delete createdProject._id;

      await syncProjectWithCalendar(db, createdProject, 'create');

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'project', resourceId: result.insertedId.toString() });

      return createResponse(201, createdProject);
    }

    else if (event.httpMethod === 'PUT' && projectId) {
      let data;
      try { data = JSON.parse(event.body); } catch (e) { return createErrorResponse(400, 'Invalid JSON'); }

      // Support legacy 'name' field by mapping to 'title'
      if (data.name && !data.title) {
        data.title = data.name;
      }
      delete data.name;

      const validationResult = ProjectUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      const projectExists = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        teamId: teamId
      });

      if (!projectExists) {
        return createErrorResponse(404, 'Project not found or not associated with this team');
      }

      if (validatedData.clientId && validatedData.clientId !== projectExists.clientId) {
        const clientExists = await db.collection('clients').findOne({
          _id: new ObjectId(validatedData.clientId),
          teamId: teamId
        });
        if (!clientExists) {
          return createErrorResponse(400, `Client with ID ${validatedData.clientId} not found or not associated with this team`);
        }
      }

      if (!validatedData.clientId && projectExists.clientId) {
        validatedData.clientId = projectExists.clientId;
      }

      const updateData = { ...validatedData, updatedAt: new Date() };
      if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.tags) updateData.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
      delete updateData.teamId;
      delete updateData.createdAt;
      delete updateData.createdBy;

      await projectsCollection.updateOne(
        { _id: new ObjectId(projectId), teamId: teamId },
        { $set: updateData }
      );

      const updatedProject = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
      updatedProject.id = updatedProject._id.toString();
      delete updatedProject._id;

      await syncProjectWithCalendar(db, updatedProject, 'update');

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'project', resourceId: projectId });

      return createResponse(200, updatedProject);
    }

    else if (event.httpMethod === 'DELETE' && projectId) {
      const projectExists = await projectsCollection.findOne({
        _id: new ObjectId(projectId),
        teamId: teamId
      });

      if (!projectExists) {
        return createErrorResponse(404, 'Project not found or not associated with this team');
      }

      const formattedProject = {
        ...projectExists,
        id: projectExists._id.toString(),
      };

      await softDelete(projectsCollection, { _id: new ObjectId(projectId), teamId: teamId, ...notDeleted }, userId);

      await syncProjectWithCalendar(db, formattedProject, 'delete');

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'project', resourceId: projectId });

      return createResponse(200, { message: 'Project deleted successfully' });
    }

    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error in projects handler:', error.message);
    if (error.statusCode) { return error; }
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
