import { describe, it, expect, vi } from 'bun:test';
import { transformRuntimeToAnalytics, AnalyticsTransformer, SegmentWithMetadata } from './AnalyticsTransformer';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { ExecutionSpan, createDebugMetadata, createExecutionSpan } from '../runtime/models/ExecutionSpan';

describe('AnalyticsTransformer', () => {
  describe('Legacy Function', () => {
    it('returns empty result when runtime is null', () => {
      const result = transformRuntimeToAnalytics(null);
      expect(result.data).toEqual([]);
      expect(result.segments).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('returns empty result when runtime has no logs or blocks', () => {
      const runtime = {
        tracker: {
          getCompletedSpans: () => [],
          getActiveSpansMap: () => new Map()
        }
      } as unknown as ScriptRuntime;

      const result = transformRuntimeToAnalytics(runtime);
      expect(result.data).toEqual([]);
      expect(result.segments).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('transforms execution logs into segments', () => {
      const startTime = Date.now();
      const spans = [
        {
          id: 'block-1',
          blockId: 'block-1',
          label: 'Warmup',
          type: 'group',
          startTime: startTime,
          endTime: startTime + 60000,
          parentSpanId: null,
          status: 'completed',
          metrics: {},
          segments: []
        } as ExecutionSpan
      ];

      const runtime = {
        tracker: {
          getCompletedSpans: () => spans,
          getActiveSpansMap: () => new Map()
        }
      } as unknown as ScriptRuntime;

      const result = transformRuntimeToAnalytics(runtime);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].name).toBe('Warmup');
      expect(result.segments[0].duration).toBe(60);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('AnalyticsTransformer Class', () => {
    const transformer = new AnalyticsTransformer();

    describe('toSegments', () => {
      it('returns empty array for empty spans', () => {
        const segments = transformer.toSegments([]);
        expect(segments).toEqual([]);
      });

      it('transforms spans to segments with debug metadata', () => {
        const startTime = Date.now();
        const debugMetadata = createDebugMetadata(
          ['amrap', 'time_bound'],
          { strategyUsed: 'TimeBoundRoundsStrategy' }
        );

        const spans: ExecutionSpan[] = [
          {
            id: `${startTime}-amrap-block`,
            blockId: 'amrap-block',
            parentSpanId: null,
            type: 'amrap',
            label: '20:00 AMRAP',
            status: 'completed',
            startTime: startTime,
            endTime: startTime + 1200000,
            metrics: {},
            segments: [],
            debugMetadata
          }
        ];

        const segments = transformer.toSegments(spans);

        expect(segments).toHaveLength(1);
        expect(segments[0].name).toBe('20:00 AMRAP');
        expect(segments[0].debugMetadata).toBeDefined();
        expect(segments[0].tags).toContain('amrap');
        expect(segments[0].tags).toContain('time_bound');
        expect(segments[0].spanType).toBe('amrap');
      });

      it('calculates depth from parent chain', () => {
        const startTime = Date.now();
        const spans: ExecutionSpan[] = [
          {
            id: 'parent-span',
            blockId: 'parent',
            parentSpanId: null,
            type: 'rounds',
            label: '3 Rounds',
            status: 'completed',
            startTime: startTime,
            endTime: startTime + 300000,
            metrics: {},
            segments: []
          },
          {
            id: 'child-span',
            blockId: 'child',
            parentSpanId: 'parent-span',
            type: 'effort',
            label: '10 Pushups',
            status: 'completed',
            startTime: startTime + 1000,
            endTime: startTime + 30000,
            metrics: {},
            segments: []
          }
        ];

        const segments = transformer.toSegments(spans);

        expect(segments).toHaveLength(2);
        expect(segments[0].depth).toBe(0);
        expect(segments[1].depth).toBe(1);
      });
    });

    describe('toAnalyticsGroup', () => {
      it('creates performance group from metrics', () => {
        const segments: SegmentWithMetadata[] = [
          {
            id: 1,
            name: 'Test',
            type: 'effort',
            startTime: 0,
            endTime: 60,
            duration: 60,
            parentId: null,
            depth: 0,
            metrics: { repetitions: 10, resistance: 50 },
            lane: 0
          }
        ];

        const groups = transformer.toAnalyticsGroup(segments);

        expect(groups).toHaveLength(1);
        expect(groups[0].id).toBe('performance');
        expect(groups[0].graphs.some(g => g.id === 'repetitions')).toBe(true);
        expect(groups[0].graphs.some(g => g.id === 'resistance')).toBe(true);
      });
    });

    describe('filterByTags', () => {
      it('returns all segments when no tags provided', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'A', type: 'a', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['amrap'] },
          { id: 2, name: 'B', type: 'b', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['emom'] }
        ];

        const filtered = transformer.filterByTags(segments, []);
        expect(filtered).toHaveLength(2);
      });

      it('filters segments by single tag', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'AMRAP', type: 'amrap', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['amrap', 'time_bound'] },
          { id: 2, name: 'EMOM', type: 'emom', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['emom', 'interval'] }
        ];

        const filtered = transformer.filterByTags(segments, ['amrap']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('AMRAP');
      });

      it('filters segments by multiple tags (AND logic)', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'A', type: 'a', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['amrap', 'time_bound'] },
          { id: 2, name: 'B', type: 'b', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, tags: ['amrap'] }
        ];

        const filtered = transformer.filterByTags(segments, ['amrap', 'time_bound']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('A');
      });
    });

    describe('filterByType', () => {
      it('filters segments by span type', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'AMRAP', type: 'amrap', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, spanType: 'amrap' },
          { id: 2, name: 'EMOM', type: 'emom', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, spanType: 'emom' },
          { id: 3, name: 'Effort', type: 'effort', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, spanType: 'effort' }
        ];

        const amrapSegments = transformer.filterByType(segments, 'amrap');
        expect(amrapSegments).toHaveLength(1);
        expect(amrapSegments[0].name).toBe('AMRAP');
      });
    });

    describe('getDebugContext', () => {
      it('returns empty object when no debug metadata', () => {
        const segment: SegmentWithMetadata = {
          id: 1, name: 'Test', type: 'test', startTime: 0, endTime: 1, duration: 1,
          parentId: null, depth: 0, metrics: {}, lane: 0
        };

        const context = transformer.getDebugContext(segment);
        expect(context).toEqual({});
      });

      it('returns context from debug metadata', () => {
        const segment: SegmentWithMetadata = {
          id: 1, name: 'Test', type: 'test', startTime: 0, endTime: 1, duration: 1,
          parentId: null, depth: 0, metrics: {}, lane: 0,
          debugMetadata: createDebugMetadata([], { strategyUsed: 'TestStrategy', value: 42 })
        };

        const context = transformer.getDebugContext(segment);
        expect(context.strategyUsed).toBe('TestStrategy');
        expect(context.value).toBe(42);
      });
    });

    describe('isFromStrategy', () => {
      it('returns true when segment matches strategy', () => {
        const segment: SegmentWithMetadata = {
          id: 1, name: 'Test', type: 'test', startTime: 0, endTime: 1, duration: 1,
          parentId: null, depth: 0, metrics: {}, lane: 0,
          debugMetadata: createDebugMetadata([], { strategyUsed: 'TimeBoundRoundsStrategy' })
        };

        expect(transformer.isFromStrategy(segment, 'TimeBoundRoundsStrategy')).toBe(true);
        expect(transformer.isFromStrategy(segment, 'IntervalStrategy')).toBe(false);
      });

      it('returns false when no debug metadata', () => {
        const segment: SegmentWithMetadata = {
          id: 1, name: 'Test', type: 'test', startTime: 0, endTime: 1, duration: 1,
          parentId: null, depth: 0, metrics: {}, lane: 0
        };

        expect(transformer.isFromStrategy(segment, 'AnyStrategy')).toBe(false);
      });
    });
  });
});
