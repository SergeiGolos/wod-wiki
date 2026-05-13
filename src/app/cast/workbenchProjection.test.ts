import { describe, expect, it } from 'bun:test';
import { buildCompletedRuntimeProjection, buildPreviewProjection, buildReviewProjection } from './workbenchProjection';

const makeSegment = (overrides: Partial<import('@/core/models/AnalyticsModels').Segment> = {}): import('@/core/models/AnalyticsModels').Segment => ({
  id: 1,
  name: 'Run',
  type: 'segment',
  startTime: 0,
  endTime: 60,
  elapsed: 60,
  total: 60,
  parentId: null,
  depth: 0,
  metric: {},
  lane: 0,
  ...overrides,
});

describe('workbenchProjection', () => {
  it('builds idle preview when no WOD blocks are present', () => {
    expect(buildPreviewProjection(null, [])).toEqual({
      type: 'rpc-workbench-update',
      mode: 'idle',
    });
  });

  it('builds preview data from document items', () => {
    const preview = buildPreviewProjection(null, [
      {
        id: 'block-1',
        type: 'wod',
        content: 'Fran\n21-15-9 thrusters',
        startLine: 1,
        endLine: 2,
        wodBlock: { statements: [{ id: 1 }] } as any,
      },
    ]);

    expect(preview.mode).toBe('preview');
    expect(preview.previewData?.title).toBe('Fran');
    expect(preview.previewData?.blocks[0]).toMatchObject({
      id: 'block-1',
      title: 'Fran',
      statementCount: 1,
    });
  });

  it('builds review data from analytics segments', () => {
    const review = buildReviewProjection([
      makeSegment({ name: 'Warm Up', startTime: 0, endTime: 30, elapsed: 30, total: 30, depth: 0 }),
      makeSegment({ id: 2, name: 'Sprint', startTime: 30, endTime: 90, elapsed: 60, total: 60, depth: 1 }),
    ]);

    expect(review.mode).toBe('review');
    expect(review.reviewData?.completedSegments).toBe(2);
    expect(review.reviewData?.rows[0]).toMatchObject({ label: 'Total Time', value: '01:30' });
    expect(review.reviewData?.rows.some((row) => row.label === 'Sprint')).toBe(true);
  });

  it('builds runtime review projection for completed inline runs', () => {
    expect(buildCompletedRuntimeProjection({ totalDurationMs: 90000, segmentCount: 3 })).toEqual({
      type: 'rpc-workbench-update',
      mode: 'review',
      reviewData: {
        totalDurationMs: 90000,
        completedSegments: 3,
        rows: [
          { label: 'Total Time', value: '01:30' },
          { label: 'Segments', value: '3' },
        ],
      },
    });
  });
});
