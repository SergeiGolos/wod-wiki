import { describe, it, expect } from 'bun:test';
import { getAnalyticsFromRuntime, AnalyticsTransformer, SegmentWithMetadata } from './AnalyticsTransformer';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { TimeSpan } from '../runtime/models/TimeSpan';
import { IOutputStatement, OutputStatementType } from '../core/models/OutputStatement';
import { FragmentType, ICodeFragment } from '../core/models/CodeFragment';

// Helper to create mock output statements
function createMockOutput(options: {
  id?: number;
  outputType?: OutputStatementType;
  started?: number;
  ended?: number;
  sourceBlockKey?: string;
  stackLevel?: number;
  fragments?: ICodeFragment[];
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
    fragments: options.fragments ?? [],
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
      expect(result.data).toEqual([]);
      expect(result.segments).toEqual([]);
      expect(result.groups).toEqual([]);
    });

    it('returns empty result when runtime has no output statements', () => {
      const runtime = {
        getOutputStatements: () => [],
      } as unknown as IScriptRuntime;

      const result = getAnalyticsFromRuntime(runtime);
      expect(result.data).toEqual([]);
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
          fragments: [{ type: 'effort', fragmentType: FragmentType.Effort, value: 'Warmup', image: 'Warmup' }]
        })
      ];

      const runtime = {
        getOutputStatements: () => outputs,
      } as unknown as IScriptRuntime;

      const result = getAnalyticsFromRuntime(runtime);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].name).toBe('Warmup');
      expect(result.segments[0].duration).toBe(60);
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
          fragments: [{ type: 'amrap', fragmentType: FragmentType.Timer, value: '20:00 AMRAP', image: '20:00 AMRAP' }],
          hints: ['amrap', 'time_bound']
        });

        const segments = transformer.fromOutputStatements([output]);

        expect(segments).toHaveLength(1);
        expect(segments[0].name).toBe('20:00 AMRAP');
        expect(segments[0].tags).toContain('amrap');
        expect(segments[0].tags).toContain('time_bound');
      });

      it('should handle missing fragment images by defaulting to sourceBlockKey', () => {
        const startTime = Date.now();
        const output = createMockOutput({
          started: startTime,
          ended: startTime + 1000,
          sourceBlockKey: 'test-block',
          fragments: []
        });

        const segments = transformer.fromOutputStatements([output]);
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

        expect(transformer.isFromStrategy(segment, 'TimeBoundRoundsStrategy')).toBe(true);
        expect(transformer.isFromStrategy(segment, 'IntervalLogicStrategy')).toBe(false);
      });
    });
  });
});
