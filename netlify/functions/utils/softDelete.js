/**
 * Soft delete utility. Adds deletedAt/deletedBy fields instead of removing documents.
 *
 * Usage:
 *   - Use `notDeleted` as a base query filter for all find operations
 *   - Use `softDelete(collection, filter, userId)` instead of `deleteOne`
 *   - Use `restoreDocument(collection, filter)` to undo a soft delete
 */

const logger = require('./logger');

/** Base filter to exclude soft-deleted documents */
const notDeleted = { deletedAt: null };

/**
 * Soft-delete a document by setting deletedAt and deletedBy.
 * @param {Collection} collection - MongoDB collection
 * @param {object} filter - Query filter to find the document
 * @param {string} userId - ID of the user performing the delete
 * @returns {object} updateResult
 */
async function softDelete(collection, filter, userId) {
  const result = await collection.updateOne(filter, {
    $set: {
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });

  if (result.matchedCount === 0) {
    logger.debug('softDelete: no document matched filter');
  }

  return result;
}

/**
 * Restore a soft-deleted document.
 * @param {Collection} collection - MongoDB collection
 * @param {object} filter - Query filter (should match a deleted document)
 * @returns {object} updateResult
 */
async function restoreDocument(collection, filter) {
  return collection.updateOne(
    { ...filter, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, deletedBy: null } }
  );
}

module.exports = { notDeleted, softDelete, restoreDocument };
