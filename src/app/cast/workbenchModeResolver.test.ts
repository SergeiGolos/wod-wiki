import { describe, expect, it } from 'bun:test';
import { WorkbenchModeResolver } from './workbenchModeResolver';

const resolver = new WorkbenchModeResolver();

const makeState = (overrides: Partial<import('./workbenchModeResolver').WorkbenchModeResolverState> = {}): import('./workbenchModeResolver').WorkbenchModeResolverState => ({
  viewMode: 'plan',
  executionStatus: 'idle',
  runtime: null,
  analyticsSegments: [],
  selectedBlock: null,
  documentItems: [],
  ...overrides,
});

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

describe('WorkbenchModeResolver', () => {
  it('returns active mode for running track runtime', () => {
    const message = resolver.resolve(makeState({
      viewMode: 'track',
      executionStatus: 'running',
      runtime: {},
    }));

    expect(message).toEqual({ type: 'rpc-workbench-update', mode: 'active' });
  });

  it('returns review mode for track with analytics after completion', () => {
    const message = resolver.resolve(makeState({
      viewMode: 'track',
      executionStatus: 'completed',
      runtime: {},
      analyticsSegments: [makeSegment()],
    }));

    expect(message.mode).toBe('review');
    expect(message.reviewData?.completedSegments).toBe(1);
  });

  it('returns preview/idle projection for non-track views without analytics', () => {
    const message = resolver.resolve(makeState({ viewMode: 'review' }));
    expect(message).toEqual({ type: 'rpc-workbench-update', mode: 'idle' });
  });

  it('returns review projection for review view with analytics', () => {
    const message = resolver.resolve(makeState({
      viewMode: 'review',
      analyticsSegments: [makeSegment()],
    }));

    expect(message.mode).toBe('review');
  });
});
