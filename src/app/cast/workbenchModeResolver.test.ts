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

  it('returns active mode for paused track runtime', () => {
    // Covers the executionStatus === 'paused' branch inside resolveMode
    const message = resolver.resolve(makeState({
      viewMode: 'track',
      executionStatus: 'paused',
      runtime: {},
    }));

    expect(message).toEqual({ type: 'rpc-workbench-update', mode: 'active' });
  });

  it('returns active mode when track has runtime but no analytics and not running', () => {
    // Covers line 46: state.runtime truthy, executionStatus is completed, no segments
    const message = resolver.resolve(makeState({
      viewMode: 'track',
      executionStatus: 'completed',
      runtime: {},
      analyticsSegments: [],
    }));

    expect(message.type).toBe('rpc-workbench-update');
    expect(message.mode).toBe('active');
  });

  it('returns preview mode for track view without runtime and no analytics', () => {
    // Covers line 50: track, no runtime, no segments → preview path
    const message = resolver.resolve(makeState({
      viewMode: 'track',
      executionStatus: 'idle',
      runtime: null,
      analyticsSegments: [],
    }));

    // buildPreviewProjection with null selectedBlock and empty documentItems → idle
    expect(message.type).toBe('rpc-workbench-update');
    expect(message.mode).toBe('idle');
  });

  it('returns idle/preview for plan view without analytics', () => {
    // Non-track, non-review viewMode falls through to buildPreviewProjection
    const message = resolver.resolve(makeState({ viewMode: 'plan' }));
    expect(message.type).toBe('rpc-workbench-update');
    expect(message.mode).toBe('idle');
  });
});
