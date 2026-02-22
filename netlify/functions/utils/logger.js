const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const isProduction = process.env.NODE_ENV === 'production';
const currentLevel = isProduction ? LOG_LEVELS.warn : LOG_LEVELS.debug;

const logger = {
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.warn) console.warn('[WARN]', ...args);
  },
  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) console.log('[INFO]', ...args);
  },
  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.debug) console.log('[DEBUG]', ...args);
  }
};

module.exports = logger;
