const logger = require('./logger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validate required environment variables at module load time.
 * Called from db.js on first connection (cold start).
 */
function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(msg);
    throw new Error(msg);
  }

  // Production-only checks
  if (isProduction) {
    if (!process.env.ALLOWED_ORIGINS) {
      logger.error('ALLOWED_ORIGINS must be set in production');
      throw new Error('Missing required environment variable: ALLOWED_ORIGINS');
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY is not set — AI features will be unavailable');
    }
  }

  // Enforce strong JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    const msg = 'JWT_SECRET must be at least 64 characters long';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
    logger.warn(msg + ' — consider using a stronger secret');
  }
}

module.exports = { validateEnv };
