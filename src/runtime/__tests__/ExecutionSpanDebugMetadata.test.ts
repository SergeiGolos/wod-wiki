import { describe, it, expect } from 'vitest';
import {
  createExecutionSpan,
  createDebugMetadata,
  DebugMetadata,
  ExecutionSpan
} from '../models/ExecutionSpan';

describe('ExecutionSpan DebugMetadata', () => {
  describe('createDebugMetadata', () => {
    it('should create empty debug metadata with defaults', () => {
      const metadata = createDebugMetadata();
      
      expect(metadata.tags).toEqual([]);
      expect(metadata.context).toEqual({});
      expect(metadata.logs).toEqual([]);
    });

    it('should create debug metadata with provided tags', () => {
      const tags = ['amrap', 'time_bound', 'max_rounds'];
      const metadata = createDebugMetadata(tags);
      
      expect(metadata.tags).toEqual(tags);
      expect(metadata.context).toEqual({});
      expect(metadata.logs).toEqual([]);
    });

    it('should create debug metadata with provided context', () => {
      const context = {
        strategyUsed: 'TimeBoundRoundsStrategy',
        timerDuration: 1200000,
        targetRounds: Infinity
      };
      const metadata = createDebugMetadata([], context);
      
      expect(metadata.tags).toEqual([]);
      expect(metadata.context).toEqual(context);
    });

    it('should create debug metadata with both tags and context', () => {
      const tags = ['emom', 'interval'];
      const context = {
        strategyUsed: 'IntervalStrategy',
        intervalDuration: 60000,
        totalRounds: 10
      };
      const metadata = createDebugMetadata(tags, context);
      
      expect(metadata.tags).toEqual(tags);
      expect(metadata.context).toEqual(context);
    });
  });

  describe('createExecutionSpan with debugMetadata', () => {
    it('should create span without debug metadata', () => {
      const span = createExecutionSpan(
        'block-1',
        'timer',
        'Countdown',
        null
      );
      
      expect(span.debugMetadata).toBeUndefined();
    });

    it('should create span with debug metadata', () => {
      const debugMetadata = createDebugMetadata(
        ['amrap', 'time_bound'],
        { strategyUsed: 'TimeBoundRoundsStrategy' }
      );
      
      const span = createExecutionSpan(
        'block-1',
        'amrap',
        '20:00 AMRAP',
        null,
        [1, 2, 3],
        debugMetadata
      );
      
      expect(span.debugMetadata).toBeDefined();
      expect(span.debugMetadata?.tags).toContain('amrap');
      expect(span.debugMetadata?.tags).toContain('time_bound');
      expect(span.debugMetadata?.context.strategyUsed).toBe('TimeBoundRoundsStrategy');
    });

    it('should preserve all span properties when debug metadata is included', () => {
      const debugMetadata = createDebugMetadata(['effort'], { exerciseId: 'pushups' });
      const sourceIds = [1, 2];
      
      const span = createExecutionSpan(
        'effort-block',
        'effort',
        '10 Pushups',
        'parent-span-id',
        sourceIds,
        debugMetadata
      );
      
      expect(span.id).toContain('effort-block');
      expect(span.blockId).toBe('effort-block');
      expect(span.parentSpanId).toBe('parent-span-id');
      expect(span.type).toBe('effort');
      expect(span.label).toBe('10 Pushups');
      expect(span.status).toBe('active');
      expect(span.sourceIds).toEqual(sourceIds);
      expect(span.debugMetadata).toEqual(debugMetadata);
    });
  });

  describe('DebugMetadata serialization', () => {
    it('should serialize and deserialize debug metadata correctly', () => {
      const original = createDebugMetadata(
        ['rounds', 'rep_scheme'],
        {
          strategyUsed: 'RoundsStrategy',
          totalRounds: 3,
          repScheme: [21, 15, 9]
        }
      );
      
      // Simulate JSON serialization (like localStorage or network transfer)
      const serialized = JSON.stringify(original);
      const deserialized: DebugMetadata = JSON.parse(serialized);
      
      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.context).toEqual(original.context);
    });

    it('should serialize span with debug metadata correctly', () => {
      const debugMetadata = createDebugMetadata(
        ['timer', 'countdown'],
        { timerDuration: 300000 }
      );
      
      const span = createExecutionSpan(
        'timer-block',
        'timer',
        '5:00 Countdown',
        null,
        [1],
        debugMetadata
      );
      
      // Simulate full span serialization
      const serialized = JSON.stringify(span);
      const deserialized: ExecutionSpan = JSON.parse(serialized);
      
      expect(deserialized.debugMetadata).toBeDefined();
      expect(deserialized.debugMetadata?.tags).toEqual(['timer', 'countdown']);
      expect(deserialized.debugMetadata?.context.timerDuration).toBe(300000);
    });
  });

  describe('DebugMetadata usage patterns', () => {
    it('should support AMRAP workout metadata pattern', () => {
      const metadata = createDebugMetadata(
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
      const metadata = createDebugMetadata(
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
      const metadata = createDebugMetadata(
        ['effort', 'leaf_node'],
        {
          strategyUsed: 'EffortStrategy',
          exerciseId: 'burpees'
        }
      );
      
      expect(metadata.tags.includes('effort')).toBe(true);
      expect(metadata.context.exerciseId).toBe('burpees');
    });

    it('should allow adding logs to debug metadata', () => {
      const metadata = createDebugMetadata(['test'], {});
      
      // Add logs as they would be during execution
      metadata.logs = metadata.logs || [];
      metadata.logs.push('[2024-01-01T00:00:00.000Z] Block started');
      metadata.logs.push('[2024-01-01T00:00:05.000Z] Timer tick at 5000ms');
      
      expect(metadata.logs).toHaveLength(2);
      expect(metadata.logs[0]).toContain('Block started');
    });
  });
});
