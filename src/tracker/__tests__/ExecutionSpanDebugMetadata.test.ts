import { describe, it, expect } from 'bun:test';
import {
  RuntimeSpan,
  SpanMetadata
} from '../../runtime/models/RuntimeSpan';
import { createSpanMetadata } from '../../runtime/utils/metadata';

describe('RuntimeSpan Metadata', () => {
  describe('createSpanMetadata', () => {
    it('should create empty metadata with defaults', () => {
      const metadata = createSpanMetadata();

      expect(metadata.tags).toEqual([]);
      expect(metadata.context).toEqual({});
      expect(metadata.logs).toEqual([]);
    });

    it('should create metadata with provided tags', () => {
      const tags = ['amrap', 'time_bound', 'max_rounds'];
      const metadata = createSpanMetadata(tags);

      expect(metadata.tags).toEqual(tags);
      expect(metadata.context).toEqual({});
      expect(metadata.logs).toEqual([]);
    });

    it('should create metadata with provided context', () => {
      const context = {
        strategyUsed: 'TimeBoundRoundsStrategy',
        timerDuration: 1200000,
        targetRounds: Infinity
      };
      const metadata = createSpanMetadata([], context);

      expect(metadata.tags).toEqual([]);
      expect(metadata.context).toEqual(context);
    });

    it('should create metadata with both tags and context', () => {
      const tags = ['emom', 'interval'];
      const context = {
        strategyUsed: 'IntervalStrategy',
        intervalDuration: 60000,
        totalRounds: 10
      };
      const metadata = createSpanMetadata(tags, context);

      expect(metadata.tags).toEqual(tags);
      expect(metadata.context).toEqual(context);
    });
  });

  describe('RuntimeSpan with Metadata', () => {
    it('should create span with metadata', () => {
      const metadata = createSpanMetadata(
        ['amrap', 'time_bound'],
        { strategyUsed: 'TimeBoundRoundsStrategy' }
      );

      const span = new RuntimeSpan(
        'block-1',
        [1, 2, 3],
        [],
        [],
        undefined,
        metadata
      );

      expect(span.metadata).toBeDefined();
      expect(span.metadata.tags).toContain('amrap');
      expect(span.metadata.tags).toContain('time_bound');
      expect(span.metadata.context.strategyUsed).toBe('TimeBoundRoundsStrategy');
    });

    it('should preserve all span properties when metadata is included', () => {
      const metadata = createSpanMetadata(['effort'], { exerciseId: 'pushups' });
      const sourceIds = [1, 2];

      const span = new RuntimeSpan(
        'effort-block',
        sourceIds,
        [],
        [],
        undefined,
        metadata,
        'parent-span-id'
      );

      expect(span.blockId).toBe('effort-block');
      expect(span.parentSpanId).toBe('parent-span-id');
      expect(span.sourceIds).toEqual(sourceIds);
      expect(span.metadata).toEqual(metadata);
    });
  });

  describe('RuntimeSpan Metadata serialization', () => {
    it('should serialize and deserialize metadata correctly', () => {
      const original = createSpanMetadata(
        ['rounds', 'rep_scheme'],
        {
          strategyUsed: 'RoundsStrategy',
          totalRounds: 3,
          repScheme: [21, 15, 9]
        }
      );

      // Simulate JSON serialization (like localStorage or network transfer)
      const serialized = JSON.stringify(original);
      const deserialized: SpanMetadata = JSON.parse(serialized);

      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.context).toEqual(original.context);
    });

    it('should serialize span with metadata correctly', () => {
      const metadata = createSpanMetadata(
        ['timer', 'countdown'],
        { timerDuration: 300000 }
      );

      const span = new RuntimeSpan(
        'timer-block',
        [1],
        [],
        [],
        undefined,
        metadata
      );

      // Simulate full span serialization
      const serialized = JSON.stringify(span);
      const deserialized: any = JSON.parse(serialized);

      expect(deserialized.metadata).toBeDefined();
      expect(deserialized.metadata.tags).toEqual(['timer', 'countdown']);
      expect(deserialized.metadata.context.timerDuration).toBe(300000);
    });
  });

  describe('Metadata usage patterns', () => {
    it('should support AMRAP workout metadata pattern', () => {
      const metadata = createSpanMetadata(
        ['amrap', 'time_bound', 'max_rounds'],
        {
          strategyUsed: 'TimeBoundRoundsStrategy',
          timerDuration: 1200000,
          timerDirection: 'down',
          targetRounds: Infinity
        }
      );

      // Analytics can now directly read the workout type
      expect(metadata.tags.includes('amrap')).toBe(true);
      expect(metadata.context.strategyUsed).toBe('TimeBoundRoundsStrategy');
      expect(metadata.context.timerDuration).toBe(1200000);
    });

    it('should support EMOM workout metadata pattern', () => {
      const metadata = createSpanMetadata(
        ['emom', 'interval', 'fixed_rounds'],
        {
          strategyUsed: 'IntervalStrategy',
          intervalDuration: 60000,
          totalRounds: 10,
          loopType: 'interval'
        }
      );

      expect(metadata.tags.includes('emom')).toBe(true);
      expect(metadata.tags.includes('interval')).toBe(true);
      expect(metadata.context.totalRounds).toBe(10);
    });

    it('should support effort block metadata pattern', () => {
      const metadata = createSpanMetadata(
        ['effort', 'leaf_node'],
        {
          strategyUsed: 'EffortStrategy',
          exerciseId: 'burpees'
        }
      );

      expect(metadata.tags.includes('effort')).toBe(true);
      expect(metadata.context.exerciseId).toBe('burpees');
    });

    it('should allow adding logs to metadata', () => {
      const metadata = createSpanMetadata(['test'], {});

      // Add logs as they would be during execution
      metadata.logs.push('[2024-01-01T00:00:00.000Z] Block started');
      metadata.logs.push('[2024-01-01T00:00:05.000Z] Timer tick at 5000ms');

      expect(metadata.logs).toHaveLength(2);
      expect(metadata.logs[0]).toContain('Block started');
    });
  });
});
