import { describe, it, expect } from 'bun:test';
import {
  planPath,
  trackPath,
  reviewPath,
  buildPath,
  parseRouteParams,
  playgroundPlanPath,
  playgroundTrackPath,
  playgroundReviewPath,
} from './routes';

describe('routes', () => {
  // ---------------------------------------------------------------
  // Path builders
  // ---------------------------------------------------------------

  describe('planPath', () => {
    it('builds plan path from note id', () => {
      expect(planPath('abc123')).toBe('/note/abc123/plan');
    });

    it('accepts full UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(planPath(uuid)).toBe(`/note/${uuid}/plan`);
    });
  });

  describe('trackPath', () => {
    it('builds track path with section id', () => {
      expect(trackPath('abc123', 'section-1')).toBe('/note/abc123/track/section-1');
    });

    it('builds track path without section id', () => {
      expect(trackPath('abc123')).toBe('/note/abc123/track');
    });
  });

  describe('reviewPath', () => {
    it('builds review-all path', () => {
      expect(reviewPath('abc123')).toBe('/note/abc123/review');
    });

    it('builds review-section path', () => {
      expect(reviewPath('abc123', 'sec-42')).toBe('/note/abc123/review/sec-42');
    });

    it('builds review-result path', () => {
      expect(reviewPath('abc123', 'sec-42', 'run-7')).toBe(
        '/note/abc123/review/sec-42/run-7',
      );
    });

    it('ignores resultId when sectionId is undefined', () => {
      expect(reviewPath('abc123', undefined, 'run-7')).toBe('/note/abc123/review');
    });
  });

  // ---------------------------------------------------------------
  // buildPath (typed union → string)
  // ---------------------------------------------------------------

  describe('buildPath', () => {
    it('builds plan', () => {
      expect(buildPath({ view: 'plan', noteId: 'n1' })).toBe('/note/n1/plan');
    });

    it('builds track', () => {
      expect(buildPath({ view: 'track', noteId: 'n1', sectionId: 's1' })).toBe(
        '/note/n1/track/s1',
      );
    });

    it('builds review-all', () => {
      expect(buildPath({ view: 'review', noteId: 'n1' })).toBe('/note/n1/review');
    });

    it('builds review-section', () => {
      expect(buildPath({ view: 'review', noteId: 'n1', sectionId: 's1' })).toBe(
        '/note/n1/review/s1',
      );
    });

    it('builds review-result', () => {
      expect(
        buildPath({ view: 'review', noteId: 'n1', sectionId: 's1', resultId: 'r1' }),
      ).toBe('/note/n1/review/s1/r1');
    });
  });

  // ---------------------------------------------------------------
  // parseRouteParams
  // ---------------------------------------------------------------

  describe('parseRouteParams', () => {
    it('returns null when noteId is missing', () => {
      expect(parseRouteParams({})).toBeNull();
    });

    it('returns null for unknown view', () => {
      expect(parseRouteParams({ noteId: 'n1', view: 'unknown' })).toBeNull();
    });

    it('parses plan', () => {
      expect(parseRouteParams({ noteId: 'n1', view: 'plan' })).toEqual({
        noteId: 'n1',
        view: 'plan',
      });
    });

    it('parses track with sectionId', () => {
      expect(
        parseRouteParams({ noteId: 'n1', view: 'track', sectionId: 's1' }),
      ).toEqual({ noteId: 'n1', view: 'track', sectionId: 's1' });
    });

    it('returns null for track without sectionId', () => {
      expect(parseRouteParams({ noteId: 'n1', view: 'track' })).toBeNull();
    });

    it('parses review-all', () => {
      expect(parseRouteParams({ noteId: 'n1', view: 'review' })).toEqual({
        noteId: 'n1',
        view: 'review',
      });
    });

    it('parses review-section', () => {
      expect(
        parseRouteParams({ noteId: 'n1', view: 'review', sectionId: 's1' }),
      ).toEqual({ noteId: 'n1', view: 'review', sectionId: 's1' });
    });

    it('parses review-result', () => {
      expect(
        parseRouteParams({
          noteId: 'n1',
          view: 'review',
          sectionId: 's1',
          resultId: 'r1',
        }),
      ).toEqual({ noteId: 'n1', view: 'review', sectionId: 's1', resultId: 'r1' });
    });
  });

  // ---------------------------------------------------------------
  // Playground paths
  // ---------------------------------------------------------------

  describe('playground paths', () => {
    it('playgroundPlanPath', () => {
      expect(playgroundPlanPath()).toBe('/playground/plan');
    });

    it('playgroundTrackPath', () => {
      expect(playgroundTrackPath('sec-1')).toBe('/playground/track/sec-1');
    });

    it('playgroundReviewPath', () => {
      expect(playgroundReviewPath()).toBe('/playground/review');
    });
  });
});
