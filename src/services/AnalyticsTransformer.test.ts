
import { describe, it, expect } from 'bun:test';
import { transformRuntimeToAnalytics, AnalyticsTransformer, SegmentWithMetadata } from './AnalyticsTransformer';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { RuntimeSpan } from '../runtime/models/RuntimeSpan';
import { TimeSpan } from '../runtime/models/TimeSpan';

import { FragmentType } from '../core/models/CodeFragment';

describe('AnalyticsTransformer (RuntimeSpan version)', () => {
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
          getAllSpans: () => [],
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
        new RuntimeSpan(
          'block-1',
          [1],
          [new TimeSpan(startTime, startTime + 60000)],
          [[{ type: 'effort', fragmentType: FragmentType.Effort, value: 'Warmup', image: 'Warmup' }]]
        )
      ];

      const runtime = {
        tracker: {
          getAllSpans: () => spans,
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

      it('transforms spans to segments with tags and metadata', () => {
        const startTime = Date.now();
        const span = new RuntimeSpan(
          'amrap-block',
          [1],
          [new TimeSpan(startTime, startTime + 1200000)],
          [[{ type: 'amrap', fragmentType: FragmentType.Timer, value: '20:00 AMRAP', image: '20:00 AMRAP' }]]
        );
        span.metadata.tags = ['amrap', 'time_bound'];
        span.metadata.context = { strategyUsed: 'AmrapLogicStrategy' };

        const segments = transformer.toSegments([span]);

        expect(segments).toHaveLength(1);
        expect(segments[0].name).toBe('20:00 AMRAP');
        expect(segments[0].tags).toContain('amrap');
        expect(segments[0].tags).toContain('time_bound');
        expect(segments[0].context?.strategyUsed).toBe('AmrapLogicStrategy');
      });

      it('should handle missing fragment images by defaulting to blockId', () => {
        const startTime = Date.now();
        const span = new RuntimeSpan('test-block', [1], [new TimeSpan(startTime, startTime + 1000)], []);

        const segments = transformer.toSegments([span]);
        expect(segments[0].name).toBe('test-block');
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
    });

    describe('filterByType', () => {
      it('filters segments by span type', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'AMRAP', type: 'amrap', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, spanType: 'amrap' },
          { id: 2, name: 'EMOM', type: 'emom', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metrics: {}, lane: 0, spanType: 'emom' }
        ];

        const amrapSegments = transformer.filterByType(segments, 'amrap');
        expect(amrapSegments).toHaveLength(1);
        expect(amrapSegments[0].name).toBe('AMRAP');
      });
    });

    describe('isFromStrategy', () => {
      it('returns true when segment matches strategy', () => {
        const segment: SegmentWithMetadata = {
          id: 1, name: 'Test', type: 'test', startTime: 0, endTime: 1, duration: 1,
          parentId: null, depth: 0, metrics: {}, lane: 0,
          context: { strategyUsed: 'TimeBoundRoundsStrategy' }
        };

        expect(transformer.isFromStrategy(segment, 'AmrapLogicStrategy')).toBe(true);
        expect(transformer.isFromStrategy(segment, 'IntervalLogicStrategy')).toBe(false);
      });
    });
  });
});
