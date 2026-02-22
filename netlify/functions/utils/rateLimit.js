/**
 * Rate limiting utility using MongoDB with TTL indexes.
 * Serverless-compatible (no in-memory state).
 */

const { connectToDb } = require('./db');
const { createErrorResponse } = require('./response');
const logger = require('./logger');

// Rate limit configurations
const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },       // 5 per 15 min
  general: { maxRequests: 100, windowMs: 60 * 1000 },        // 100 per min
  ai: { maxRequests: 10, windowMs: 60 * 1000 },              // 10 per min
};

let ttlIndexEnsured = false;

async function ensureRateLimitIndex(db) {
  if (ttlIndexEnsured) return;
  try {
    await db.collection('rateLimits').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    ttlIndexEnsured = true;
  } catch (error) {
    // Index may already exist; non-fatal
    logger.debug('Rate limit TTL index:', error.message);
  }
}

/**
 * Check rate limit for a given key and category.
 * @param {string} key - Unique identifier (userId or IP)
 * @param {'auth'|'general'|'ai'} category - Rate limit category
 * @returns {{ allowed: boolean, remaining: number, resetAt: Date } | null} null if error
 */
async function checkRateLimit(key, category = 'general') {
  const config = RATE_LIMITS[category];
  if (!config) return { allowed: true, remaining: Infinity, resetAt: new Date() };

  try {
    const { db } = await connectToDb();
    await ensureRateLimitIndex(db);

    const collection = db.collection('rateLimits');
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    const rateLimitKey = `${category}:${key}`;

    // Count requests in the current window
    const count = await collection.countDocuments({
      key: rateLimitKey,
      createdAt: { $gte: windowStart },
    });

    if (count >= config.maxRequests) {
      // Find the oldest request in the window to calculate reset time
      const oldest = await collection.findOne(
        { key: rateLimitKey, createdAt: { $gte: windowStart } },
        { sort: { createdAt: 1 } }
      );
      const resetAt = oldest
        ? new Date(oldest.createdAt.getTime() + config.windowMs)
        : new Date(now.getTime() + config.windowMs);

      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this request
    await collection.insertOne({
      key: rateLimitKey,
      createdAt: now,
      expiresAt: new Date(now.getTime() + config.windowMs),
    });

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  } catch (error) {
    logger.error('Rate limit check failed:', error.message);
    // Fail open - don't block requests if rate limiting is broken
    return { allowed: true, remaining: -1, resetAt: new Date() };
  }
}

/**
 * Middleware-style rate limit check. Returns an error response if rate limited, null otherwise.
 * @param {object} event - Netlify event
 * @param {'auth'|'general'|'ai'} category
 * @param {string} [userId] - User ID (falls back to IP if not provided)
 */
async function rateLimitCheck(event, category = 'general', userId = null) {
  const key = userId || event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const result = await checkRateLimit(key, category);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    return createErrorResponse(429, 'Too many requests. Please try again later.', {
      retryAfter,
      resetAt: result.resetAt.toISOString(),
    });
  }

  return null;
}

module.exports = { checkRateLimit, rateLimitCheck, RATE_LIMITS };
