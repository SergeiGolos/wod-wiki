import { describe, it, expect } from 'bun:test';
import { getAnalyticsFromRuntime, AnalyticsTransformer, SegmentWithMetadata } from './AnalyticsTransformer';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { TimeSpan } from '../runtime/models/TimeSpan';
import { IOutputStatement, OutputStatementType } from '../core/models/OutputStatement';
import { MetricType, IMetric } from '../core/models/Metric';

// Helper to create mock output statements
function createMockOutput(options: {
  id?: number;
  outputType?: OutputStatementType;
  started?: number;
  ended?: number;
  sourceBlockKey?: string;
  stackLevel?: number;
  metrics?: IMetric[];
  hints?: string[];
}): IOutputStatement {
  const now = Date.now();
  const timeSpan = new TimeSpan(options.started ?? now, options.ended ?? now + 60000);
  return {
    id: options.id ?? 1,
    outputType: options.outputType ?? 'segment',
    timeSpan,
    spans: [],
    elapsed: timeSpan.duration,
    total: timeSpan.duration,
    sourceBlockKey: options.sourceBlockKey ?? 'block-1',
    stackLevel: options.stackLevel ?? 0,
    metrics: options.metrics ?? [],
    hints: options.hints ? new Set(options.hints) : undefined,
    sourceStatementId: undefined,
    meta: { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' },
    isLeaf: true,
  } as IOutputStatement;
}

describe('AnalyticsTransformer', () => {
  describe('getAnalyticsFromRuntime', () => {
    it('returns empty result when runtime is null', () => {
      const result = getAnalyticsFromRuntime(null);
      expect(result.segments).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('returns empty result when runtime has no output statements', () => {
      const runtime = {
        getOutputStatements: () => [],
      } as unknown as IScriptRuntime;

      const result = getAnalyticsFromRuntime(runtime);
      expect(result.segments).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('transforms output statements into segments', () => {
      const startTime = Date.now();
      const outputs: IOutputStatement[] = [
        createMockOutput({
          id: 1,
          outputType: 'segment',
          started: startTime,
          ended: startTime + 60000,
          metrics: [{ type: MetricType.Effort, value: 'Warmup', image: 'Warmup' }]
        })
      ];

      const runtime = {
        getOutputStatements: () => outputs,
      } as unknown as IScriptRuntime;

      const result = getAnalyticsFromRuntime(runtime);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].name).toBe('Warmup');
      expect(result.segments[0].elapsed).toBe(60);
    });

    it('ignores non-segment output types (load, system, etc.)', () => {
      const startTime = Date.now();
      const outputs: IOutputStatement[] = [
        createMockOutput({
          id: 1,
          outputType: 'load',
          started: startTime,
          ended: startTime,
          metrics: [{ type: MetricType.Label, value: 'Load', image: 'Load' }]
        }),
        createMockOutput({
          id: 2,
          outputType: 'segment',
          started: startTime,
          ended: startTime + 60000,
          metrics: [{ type: MetricType.Effort, value: 'Work', image: 'Work' }]
        }),
        createMockOutput({
          id: 3,
          outputType: 'system',
          started: startTime + 60000,
          ended: startTime + 60000,
          metrics: [{ type: MetricType.System, value: 'pop', image: 'pop' }]
        })
      ];

      const runtime = {
        getOutputStatements: () => outputs,
      } as unknown as IScriptRuntime;

      const result = getAnalyticsFromRuntime(runtime);

      // Should ONLY include the 'segment' output
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].name).toBe('Work');
    });
  });

  describe('AnalyticsTransformer Class', () => {
    const transformer = new AnalyticsTransformer();

    describe('fromOutputStatements', () => {
      it('returns empty array for empty outputs', () => {
        const segments = transformer.fromOutputStatements([]);
        expect(segments).toEqual([]);
      });

      it('transforms outputs to segments with hints as tags', () => {
        const startTime = Date.now();
        const output = createMockOutput({
          id: 1,
          outputType: 'segment',
          started: startTime,
          ended: startTime + 1200000,
          metrics: [{ type: MetricType.Duration, value: '20:00 AMRAP', image: '20:00 AMRAP' }],
          hints: ['amrap', 'time_bound']
        });

        const segments = transformer.fromOutputStatements([output]);

        expect(segments).toHaveLength(1);
        expect(segments[0].name).toBe('20:00 AMRAP');
        expect(segments[0].tags).toContain('amrap');
        expect(segments[0].tags).toContain('time_bound');
      });

      it('should transfer spans and absoluteStartTime from output to segment', () => {
        const workoutStart = 1000000;
        const spanStart = 1002000; // 2s after workout start
        const spanEnd = 1005000;   // 5s after workout start
        const output = createMockOutput({
          started: spanStart,
          ended: spanEnd,
          sourceBlockKey: 'timed-block',
          metrics: [{ type: MetricType.Effort, value: 'Run', image: 'Run' }],
        });
        // Inject real spans (TimeSpan objects use epoch ms)
        (output as any).spans = [new TimeSpan(spanStart, spanEnd)];
        (output as any).elapsed = spanEnd - spanStart; // 3000ms

        const segments = transformer.fromOutputStatements([output], workoutStart);

        expect(segments).toHaveLength(1);
        const seg = segments[0];

        // absoluteStartTime should be preserved in ms
        expect(seg.absoluteStartTime).toBe(spanStart);

        // spans should be in seconds relative to workout start
        expect(seg.spans).toBeDefined();
        expect(seg.spans!.length).toBe(1);
        expect(seg.spans![0].started).toBe((spanStart - workoutStart) / 1000); // 2s
        expect(seg.spans![0].ended).toBe((spanEnd - workoutStart) / 1000);     // 5s

        // Elapsed should reflect pause-aware active time (3s)
        expect(seg.elapsed).toBe(3);
      });

      it('should include sourceBlockKey and completionReason in context', () => {
        const startTime = Date.now();
        const output = createMockOutput({
          started: startTime,
          ended: startTime + 10000,
          sourceBlockKey: 'my-block-uuid',
          metrics: [],
        });
        (output as any).completionReason = 'timer-expired';

        const segments = transformer.fromOutputStatements([output]);

        expect(segments).toHaveLength(1);
        const ctx = (segments[0] as SegmentWithMetadata).context;
        expect(ctx?.sourceBlockKey).toBe('my-block-uuid');
        expect(ctx?.completionReason).toBe('timer-expired');
      });

      it('should handle missing metrics images by defaulting to sourceBlockKey', () => {
        const startTime = Date.now();
        const output = createMockOutput({
          started: startTime,
          ended: startTime + 1000,
          sourceBlockKey: 'test-block',
          metrics: []
        });

        const segments = transformer.fromOutputStatements([output]);
        expect(segments[0].name).toBe('test-block');
        expect(segments[0].duration).toBeUndefined();
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
            metric: { repetitions: 10, resistance: 50 },
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
          { id: 1, name: 'A', type: 'a', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, tags: ['amrap'] },
          { id: 2, name: 'B', type: 'b', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, tags: ['emom'] }
        ];

        const filtered = transformer.filterByTags(segments, []);
        expect(filtered).toHaveLength(2);
      });

      it('filters segments by single tag', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'AMRAP', type: 'amrap', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, tags: ['amrap', 'time_bound'] },
          { id: 2, name: 'EMOM', type: 'emom', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, tags: ['emom', 'interval'] }
        ];

        const filtered = transformer.filterByTags(segments, ['amrap']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('AMRAP');
      });
    });

    describe('filterByType', () => {
      it('filters segments by span type', () => {
        const segments: SegmentWithMetadata[] = [
          { id: 1, name: 'AMRAP', type: 'amrap', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, spanType: 'amrap' },
          { id: 2, name: 'EMOM', type: 'emom', startTime: 0, endTime: 1, duration: 1, parentId: null, depth: 0, metric: {}, lane: 0, spanType: 'emom' }
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
          parentId: null, depth: 0, metric: {}, lane: 0,
          context: { strategyUsed: 'TimeBoundRoundsStrategy' }
        };

        expect(transformer.isFromStrategy(segment, 'TimeBoundRoundsStrategy')).toBe(true);
        expect(transformer.isFromStrategy(segment, 'IntervalLogicStrategy')).toBe(false);
      });
    });
  });
});
