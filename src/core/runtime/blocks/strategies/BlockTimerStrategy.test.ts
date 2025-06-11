import { describe, it, expect } from 'vitest';
import { BlockTimerStrategy } from './BlockTimerStrategy';
import { TimerBlock } from '../TimerBlock';
import { JitStatement } from '@/core/types/JitStatement';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { Duration } from '@/core/types/Duration';
import { BlockKey } from '@/core/types/BlockKey';

// Mock implementation for JitStatement
function createMockStatement(options: {
  hasDuration?: boolean;
  hasEffort?: boolean;
  hasRepetitions?: boolean;
  hasChildren?: boolean;
  hasRounds?: boolean;
}): JitStatement {
  const {
    hasDuration = false,
    hasEffort = false,
    hasRepetitions = false,
    hasChildren = false,
    hasRounds = false,
  } = options;

  return {
    id: 'test-statement',
    parent: undefined,
    children: hasChildren ? ['child-id'] : [],
    meta: {},
    fragments: [],
    duration: (blockKey: BlockKey) => new Duration(hasDuration ? 30000 : undefined),
    durations: () => hasDuration ? [new Duration(30000)] : [],
    efforts: () => hasEffort ? ['pushups'] : [],
    effort: (blockKey: BlockKey | number) => hasEffort ? { effort: 'pushups' } : undefined,
    repetitions: () => hasRepetitions ? [{ value: 10 }] : [],
    repetition: (blockKey: BlockKey | number) => hasRepetitions ? { value: 10 } : undefined,
    rounds: () => hasRounds ? [{ value: 3 }] : [],
    round: (blockKey: BlockKey | number) => hasRounds ? { value: 3 } : undefined,
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

describe('BlockTimerStrategy', () => {
  const strategy = new BlockTimerStrategy();
  const mockRuntime = {} as ITimerRuntime;

  describe('canHandle', () => {
    it('should handle statements with duration only', () => {
      const statement = createMockStatement({ hasDuration: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(true);
    });

    it('should not handle statements without duration', () => {
      const statement = createMockStatement({});
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with duration and effort', () => {
      const statement = createMockStatement({ hasDuration: true, hasEffort: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with duration and repetitions', () => {
      const statement = createMockStatement({ hasDuration: true, hasRepetitions: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with duration and children', () => {
      const statement = createMockStatement({ hasDuration: true, hasChildren: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should not handle statements with duration and rounds', () => {
      const statement = createMockStatement({ hasDuration: true, hasRounds: true });
      
      expect(strategy.canHandle([statement], mockRuntime)).toBe(false);
    });

    it('should handle multiple statements if all qualify', () => {
      const statement1 = createMockStatement({ hasDuration: true });
      const statement2 = createMockStatement({ hasDuration: true });
      
      expect(strategy.canHandle([statement1, statement2], mockRuntime)).toBe(true);
    });

    it('should not handle multiple statements if any one does not qualify', () => {
      const statement1 = createMockStatement({ hasDuration: true });
      const statement2 = createMockStatement({ hasDuration: true, hasEffort: true });
      
      expect(strategy.canHandle([statement1, statement2], mockRuntime)).toBe(false);
    });
  });

  describe('compile', () => {
    it('should create a TimerBlock for valid statements', () => {
      const statement = createMockStatement({ hasDuration: true });
      
      const block = strategy.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimerBlock);
      expect(block?.sources).toEqual([statement]);
    });

    it('should create a TimerBlock for multiple valid statements', () => {
      const statement1 = createMockStatement({ hasDuration: true });
      const statement2 = createMockStatement({ hasDuration: true });
      
      const block = strategy.compile([statement1, statement2], mockRuntime);
      
      expect(block).toBeInstanceOf(TimerBlock);
      expect(block?.sources).toEqual([statement1, statement2]);
    });
  });
});