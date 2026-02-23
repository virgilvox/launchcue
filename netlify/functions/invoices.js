const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');
const logger = require('./utils/logger');
const { getPaginationParams, createPaginatedResponse } = require('./utils/pagination');
const { createAuditLog } = require('./utils/auditLog');
const { rateLimitCheck } = require('./utils/rateLimit');

// Line item schema validation
const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0).default(1),
  unit: z.string().default('unit'),
  rate: z.number().min(0).default(0),
});

// Invoice schema validation
const InvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  projectId: z.string().nullable().optional().default(null),
  scopeId: z.string().nullable().optional().default(null),
  lineItems: z.array(LineItemSchema).optional().default([]),
  tax: z.number().nullable().optional().default(null),
  taxRate: z.number().nullable().optional().default(null),
  currency: z.string().default('USD'),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue']).default('draft'),
  notes: z.string().optional().default(''),
  dueDate: z.string().nullable().optional().default(null),
});

// Update schema - all fields optional
const InvoiceUpdateSchema = InvoiceSchema.partial();

/**
 * Generate the next auto-incrementing invoice number for a team.
 * Pattern: INV-001, INV-002, etc.
 */
async function getNextInvoiceNumber(collection, teamId) {
  const latest = await collection
    .find({ teamId })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();

  if (latest.length === 0) {
    return 'INV-001';
  }

  const currentNumber = latest[0].invoiceNumber;
  const numericPart = parseInt(currentNumber.replace('INV-', ''), 10);
  const next = numericPart + 1;
  return `INV-${String(next).padStart(3, '0')}`;
}

/**
 * Compute line item amounts, subtotal, tax, and total.
 */
function computeInvoiceTotals(lineItems, tax, taxRate) {
  // Compute amount for each line item
  const computedLineItems = lineItems.map(item => ({
    ...item,
    amount: item.quantity * item.rate,
  }));

  const subtotal = computedLineItems.reduce((sum, item) => sum + item.amount, 0);

  // If taxRate is provided but tax is not, compute tax from rate
  let computedTax = tax;
  if (taxRate != null && computedTax == null) {
    computedTax = subtotal * (taxRate / 100);
  }

  const total = subtotal + (computedTax || 0);

  return { lineItems: computedLineItems, subtotal, tax: computedTax, total };
}

exports.handler = async (event, context) => {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  logger.debug(`Processing ${event.httpMethod} request for invoices`);

  // Authenticate with scope checking
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:invoices']
        : ['write:invoices']
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

  // Extract invoice ID from path if available
  const pathParts = event.path.split('/');
  const invoicesIndex = pathParts.indexOf('invoices');
  let specificInvoiceId = null;
  if (invoicesIndex !== -1 && pathParts.length > invoicesIndex + 1) {
    const potentialId = pathParts[invoicesIndex + 1];
    if (ObjectId.isValid(potentialId)) {
      specificInvoiceId = potentialId;
    }
  }

  try {
    const { db } = await connectToDb();
    const invoicesCollection = db.collection('invoices');

    // GET: Fetch invoices (either all for a team or a specific invoice)
    if (event.httpMethod === 'GET') {
      // If requesting a specific invoice
      if (specificInvoiceId) {
        logger.debug(`Fetching specific invoice: ${specificInvoiceId}`);
        try {
          const invoice = await invoicesCollection.findOne({
            _id: new ObjectId(specificInvoiceId),
            teamId: teamId,
            deletedAt: null
          });

          if (!invoice) {
            logger.error(`Invoice ${specificInvoiceId} not found`);
            return createErrorResponse(404, 'Invoice not found');
          }

          // Return the invoice with id instead of _id
          invoice.id = invoice._id.toString();
          delete invoice._id;

          return createResponse(200, invoice);
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid invoice ID format');
          }
          throw error; // Let the main catch block handle it
        }
      }
      // Otherwise, fetch all invoices for the authenticated team
      else {
        const qp = event.queryStringParameters || {};
        const query = { teamId, deletedAt: null };
        const formatInvoice = r => { r.id = r._id.toString(); delete r._id; return r; };

        // Apply optional filters
        if (qp.clientId) query.clientId = qp.clientId;
        if (qp.projectId) query.projectId = qp.projectId;
        if (qp.status) query.status = qp.status;

        // Date range filter on createdAt
        if (qp.dateFrom || qp.dateTo) {
          query.createdAt = {};
          if (qp.dateFrom) query.createdAt.$gte = new Date(qp.dateFrom);
          if (qp.dateTo) query.createdAt.$lte = new Date(qp.dateTo);
        }

        if (qp.page) {
          const { page, limit, skip } = getPaginationParams(qp);
          const [invoices, total] = await Promise.all([
            invoicesCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            invoicesCollection.countDocuments(query),
          ]);
          return createResponse(200, createPaginatedResponse(invoices.map(formatInvoice), total, page, limit));
        }

        const invoices = await invoicesCollection.find(query).sort({ createdAt: -1 }).toArray();
        return createResponse(200, invoices.map(formatInvoice));
      }
    }

    // POST: Create a new invoice
    else if (event.httpMethod === 'POST') {
      logger.debug('Creating a new invoice');

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // If scopeId is provided, look up the scope and copy deliverables as line items
      if (data.scopeId) {
        logger.debug(`Creating invoice from scope: ${data.scopeId}`);
        const scopesCollection = db.collection('scopes');
        try {
          const scope = await scopesCollection.findOne({
            _id: new ObjectId(data.scopeId),
            teamId: teamId,
            deletedAt: null
          });

          if (scope) {
            // Map scope deliverables to invoice line items
            if (!data.lineItems || data.lineItems.length === 0) {
              data.lineItems = (scope.deliverables || []).map(d => ({
                description: d.title,
                quantity: d.quantity || 1,
                unit: d.unit || 'unit',
                rate: d.rate || 0,
              }));
            }
            // Set projectId and clientId from scope if not already provided
            if (!data.projectId && scope.projectId) data.projectId = scope.projectId;
            if (!data.clientId && scope.clientId) data.clientId = scope.clientId;
          } else {
            logger.error(`Scope ${data.scopeId} not found`);
            return createErrorResponse(404, 'Scope not found');
          }
        } catch (error) {
          if (error.name === 'BSONTypeError') {
            return createErrorResponse(400, 'Invalid scope ID format');
          }
          throw error;
        }
      }

      // Validate data
      const validationResult = InvoiceSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Generate IDs for line items that don't have them
      validatedData.lineItems = validatedData.lineItems.map(item => ({
        ...item,
        id: item.id || new ObjectId().toString(),
      }));

      // Compute totals
      const { lineItems, subtotal, tax, total } = computeInvoiceTotals(
        validatedData.lineItems,
        validatedData.tax,
        validatedData.taxRate
      );

      // Generate auto-incrementing invoice number
      const invoiceNumber = await getNextInvoiceNumber(invoicesCollection, teamId);

      // Add metadata and ensure teamId
      const newInvoice = {
        ...validatedData,
        lineItems,
        subtotal,
        tax,
        total,
        invoiceNumber,
        teamId: teamId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      logger.debug('Creating invoice:', newInvoice);
      const result = await invoicesCollection.insertOne(newInvoice);

      // Get the newly created invoice
      const createdInvoice = await invoicesCollection.findOne({ _id: result.insertedId });
      createdInvoice.id = createdInvoice._id.toString();
      delete createdInvoice._id;

      await createAuditLog(db, { userId, teamId, action: 'create', resourceType: 'invoice', resourceId: result.insertedId.toString() });

      return createResponse(201, createdInvoice);
    }

    // PUT: Update an existing invoice
    else if (event.httpMethod === 'PUT' && specificInvoiceId) {
      logger.debug(`Updating invoice: ${specificInvoiceId}`);

      let data;
      try {
        data = JSON.parse(event.body);
        logger.debug('Request body:', data);
      } catch (e) {
        logger.error('Invalid JSON:', e);
        return createErrorResponse(400, 'Invalid JSON');
      }

      // Validate data
      const validationResult = InvoiceUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error('Validation failed:', validationResult.error.format());
        return createErrorResponse(400, 'Validation failed', validationResult.error.format());
      }

      const validatedData = validationResult.data;

      // Find the invoice to check if it exists and belongs to the user's team
      const invoiceExists = await invoicesCollection.findOne({
        _id: new ObjectId(specificInvoiceId),
        teamId: teamId,
        deletedAt: null
      });

      if (!invoiceExists) {
        logger.error(`Invoice ${specificInvoiceId} not found`);
        return createErrorResponse(404, 'Invoice not found');
      }

      // Generate IDs for line items that don't have them
      if (validatedData.lineItems) {
        validatedData.lineItems = validatedData.lineItems.map(item => ({
          ...item,
          id: item.id || new ObjectId().toString(),
        }));
      }

      // Recompute totals using updated or existing line items
      const currentLineItems = validatedData.lineItems || invoiceExists.lineItems || [];
      const currentTax = validatedData.tax !== undefined ? validatedData.tax : invoiceExists.tax;
      const currentTaxRate = validatedData.taxRate !== undefined ? validatedData.taxRate : invoiceExists.taxRate;
      const { lineItems, subtotal, tax, total } = computeInvoiceTotals(
        currentLineItems,
        currentTax,
        currentTaxRate
      );

      // Prepare update data (don't allow changing teamId or createdBy)
      const updateData = {
        ...validatedData,
        lineItems,
        subtotal,
        tax,
        total,
        updatedAt: new Date(),
        updatedBy: userId
      };

      // Handle status transitions
      if (validatedData.status && validatedData.status !== invoiceExists.status) {
        if (validatedData.status === 'sent') {
          updateData.sentAt = new Date().toISOString();
        }
        if (validatedData.status === 'paid') {
          updateData.paidAt = new Date().toISOString();
          updateData.paidAmount = total;
        }
      }

      // Remove fields that should not be updated
      delete updateData.teamId;
      delete updateData.createdBy;
      delete updateData.createdAt;

      // Update the invoice
      const result = await invoicesCollection.updateOne(
        { _id: new ObjectId(specificInvoiceId), teamId: teamId },
        { $set: updateData }
      );

      // Get the updated invoice
      const updatedInvoice = await invoicesCollection.findOne({ _id: new ObjectId(specificInvoiceId) });
      updatedInvoice.id = updatedInvoice._id.toString();
      delete updatedInvoice._id;

      await createAuditLog(db, { userId, teamId, action: 'update', resourceType: 'invoice', resourceId: specificInvoiceId });

      return createResponse(200, updatedInvoice);
    }

    // DELETE: Soft delete an existing invoice
    else if (event.httpMethod === 'DELETE' && specificInvoiceId) {
      logger.debug(`Soft deleting invoice: ${specificInvoiceId}`);

      // Check if the invoice exists and belongs to the user's team
      const invoiceExists = await invoicesCollection.findOne({
        _id: new ObjectId(specificInvoiceId),
        teamId: teamId,
        deletedAt: null
      });

      if (!invoiceExists) {
        logger.error(`Invoice ${specificInvoiceId} not found`);
        return createErrorResponse(404, 'Invoice not found');
      }

      // Soft delete the invoice
      await invoicesCollection.updateOne(
        { _id: new ObjectId(specificInvoiceId), teamId: teamId },
        { $set: { deletedAt: new Date().toISOString(), deletedBy: userId } }
      );

      await createAuditLog(db, { userId, teamId, action: 'delete', resourceType: 'invoice', resourceId: specificInvoiceId });

      return createResponse(200, { message: 'Invoice deleted successfully' });
    }

    // Unsupported method
    else {
      return createErrorResponse(405, 'Method Not Allowed');
    }
  } catch (error) {
    logger.error('Error processing request:', error);
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
