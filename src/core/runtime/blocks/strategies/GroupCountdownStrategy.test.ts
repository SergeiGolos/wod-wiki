import { describe, it, expect, vi } from 'vitest';
import { GroupCountdownStrategy } from './GroupCountdownStrategy';
import { TimedGroupBlock } from '../TimedGroupBlock';
import { JitStatement } from '@/core/JitStatement';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { Duration } from '@/core/Duration';
import { BlockKey } from '@/core/BlockKey';

// Mock implementation for JitStatement
function createMockStatement(options: {
  hasDuration?: boolean;
  hasChildren?: boolean;
  hasEffort?: boolean;
  hasRounds?: boolean;
}): JitStatement {
  const {
    hasDuration = false,
    hasChildren = false,
    hasEffort = false,
    hasRounds = false,
  } = options;

  return {
    id: 'test-statement',
    parent: undefined,
    children: hasChildren ? ['child-id'] : [],
    meta: {},
    fragments: [],
    duration: (blockKey: BlockKey) => new Duration(hasDuration ? 300000 : undefined), // 5 minutes
    durations: () => hasDuration ? [new Duration(300000)] : [],
    efforts: () => hasEffort ? ['pullups'] : [],
    effort: (blockKey: BlockKey | number) => hasEffort ? { effort: 'pullups' } : undefined,
    rounds: () => hasRounds ? [{ value: 3 }] : [],
    round: (blockKey: BlockKey | number) => hasRounds ? { value: 3 } : undefined,
    repetitions: () => [],
    repetition: (blockKey: BlockKey | number) => undefined,
    resistances: () => [],
    resistance: (blockKey: BlockKey | number) => undefined,
    distances: () => [],
    distance: (blockKey: BlockKey | number) => undefined,
    increments: () => [],
    increment: (blockKey: BlockKey | number) => undefined,
    laps: () => [],
    lap: (blockKey: BlockKey | number) => undefined,
    toString: () => 'test statement',
    // Add other methods as needed
  } as any;
}

describe('GroupCountdownStrategy', () => {
  const strategy = new GroupCountdownStrategy();
  const mockRuntime = {} as ITimerRuntime;

  describe('canHandle', () => {
    it('should handle statements with duration and children', () => {
      const statement = createMockStatement({ hasDuration: true, hasChildren: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(true);
    });

    it('should not handle statements with duration but no children', () => {
      const statement = createMockStatement({ hasDuration: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with children but no duration', () => {
      const statement = createMockStatement({ hasChildren: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with neither duration nor children', () => {
      const statement = createMockStatement({});
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should handle multiple statements if all qualify', () => {
      const statement1 = createMockStatement({ hasDuration: true, hasChildren: true });
      const statement2 = createMockStatement({ hasDuration: true, hasChildren: true });
      
      expect(strategy.canHandle([statement1, statement2], mockRuntime)).toBe(true);
    });

    it('should not handle multiple statements if any one does not qualify', () => {
      const statement1 = createMockStatement({ hasDuration: true, hasChildren: true });
      const statement2 = createMockStatement({ hasDuration: true }); // no children
      
      expect(strategy.canHandle([statement1, statement2], mockRuntime)).toBe(false);
    });

    it('should handle group countdown scenarios like AMRAP', () => {
      // Simulate "5m AMRAP { pullups; pushups }"
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true 
      });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(true);
    });

    it('should handle group countdown scenarios with rounds', () => {
      // Simulate "20m 3 rounds { run 400m; rest }"
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true, 
        hasRounds: true 
      });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(true);
    });
  });

  describe('compile', () => {
    it('should create a TimedGroupBlock for valid single statement', () => {
      const statement = createMockStatement({ hasDuration: true, hasChildren: true });
      
      const block = strategy.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimedGroupBlock);
      expect(block?.sources).toEqual([statement]);
    });

    it('should return undefined for multiple statements', () => {
      const statement1 = createMockStatement({ hasDuration: true, hasChildren: true });
      const statement2 = createMockStatement({ hasDuration: true, hasChildren: true });
      
      // Console.warn should be called
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const block = strategy.compile([statement1, statement2], mockRuntime);
      
      expect(block).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('GroupCountdownStrategy: Expected array with exactly one node');
      
      consoleSpy.mockRestore();
    });

    it('should return undefined for empty array', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const block = strategy.compile([], mockRuntime);
      
      expect(block).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('GroupCountdownStrategy: Expected array with exactly one node');
      
      consoleSpy.mockRestore();
    });
  });
});