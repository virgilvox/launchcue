import { describe, it, expect } from 'vitest';

const { notDeleted } = require('../../netlify/functions/utils/softDelete');

describe('softDelete utilities', () => {
  describe('notDeleted filter', () => {
    it('has deletedAt: null filter', () => {
      expect(notDeleted).toEqual({ deletedAt: null });
    });

    it('can be spread into a query', () => {
      const query = { teamId: 'team123', ...notDeleted };
      expect(query).toEqual({ teamId: 'team123', deletedAt: null });
    });
  });
});
