import { describe, it, expect } from 'vitest';

// These are CommonJS modules, need to use require-style or dynamic import
const { getPaginationParams, createPaginatedResponse } = require('../../netlify/functions/utils/pagination');

describe('getPaginationParams', () => {
  it('returns defaults when no params provided', () => {
    const result = getPaginationParams({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.skip).toBe(0);
  });

  it('parses valid page and limit', () => {
    const result = getPaginationParams({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('clamps limit to MAX_LIMIT (100)', () => {
    const result = getPaginationParams({ page: '1', limit: '500' });
    expect(result.limit).toBe(100);
  });

  it('defaults invalid page to 1', () => {
    const result = getPaginationParams({ page: 'abc', limit: '10' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('defaults negative page to 1', () => {
    const result = getPaginationParams({ page: '-1', limit: '10' });
    expect(result.page).toBe(1);
  });

  it('defaults negative limit to 25', () => {
    const result = getPaginationParams({ page: '1', limit: '-5' });
    expect(result.limit).toBe(25);
  });
});

describe('createPaginatedResponse', () => {
  it('creates correct pagination metadata', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result = createPaginatedResponse(items, 50, 1, 25);

    expect(result.data).toEqual(items);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(25);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.hasMore).toBe(true);
  });

  it('hasMore is false on last page', () => {
    const result = createPaginatedResponse([], 10, 1, 25);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('handles zero total', () => {
    const result = createPaginatedResponse([], 0, 1, 25);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });
});
