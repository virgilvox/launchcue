const logger = require('./logger');

async function createAuditLog(db, { userId, teamId, action, resourceType, resourceId, changes }) {
  try {
    await db.collection('auditLogs').insertOne({
      userId,
      teamId,
      action, // 'create', 'update', 'delete'
      resourceType, // 'task', 'project', 'client', etc.
      resourceId,
      changes, // { field: { from: oldValue, to: newValue } } - optional
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error.message);
    // Don't throw - audit logging should not break the main operation
  }
}

module.exports = { createAuditLog };
