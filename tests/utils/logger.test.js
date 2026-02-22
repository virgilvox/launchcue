import { describe, it, expect, vi } from 'vitest';

const logger = require('../../netlify/functions/utils/logger');

describe('logger', () => {
  it('exposes error, warn, info, debug methods', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('error always logs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('test error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
