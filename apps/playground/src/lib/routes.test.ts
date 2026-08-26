import { describe, it, expect } from 'bun:test';
import {
  planPath,
  trackPath,
} from './routes';

describe('routes', () => {
  describe('planPath', () => {
    it('builds plan path from note id', () => {
      expect(planPath('abc123')).toBe('/note/abc123/plan');
    });

    it('accepts full UUID', () => {
      expect(planPath('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '/note/550e8400-e29b-41d4-a716-446655440000/plan',
      );
    });
  });

  describe('trackPath', () => {
    it('builds track base path without section', () => {
      expect(trackPath('abc123')).toBe('/note/abc123/track');
    });

    it('builds track path with section', () => {
      expect(trackPath('abc123', 'wod-1')).toBe('/note/abc123/track/wod-1');
    });
  });
});
