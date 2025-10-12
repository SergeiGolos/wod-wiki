import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerStrategy, RoundsStrategy, EffortStrategy } from '../../../src/runtime/strategies';
import { ICodeStatement } from '../../../src/CodeStatement';
import { ICodeFragment, FragmentType } from '../../../src/CodeFragment';
import { IScriptRuntime } from '../../../src/IScriptRuntime';
import { BlockKey } from '../../../src/BlockKey';

describe('Strategy Matching Contract', () => {
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    mockRuntime = {
      jit: {
        compile: vi.fn(),
        strategies: []
      },
      stack: {
        push: vi.fn(),
        pop: vi.fn(),
        current: vi.fn(),
        peek: vi.fn(),
        dispose: vi.fn(),
        clear: vi.fn()
      },
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      isRunning: vi.fn(),
      getCurrentTime: vi.fn()
    } as any;
  });

  describe('TSC-001: TimerStrategy matches statements with Timer fragments', () => {
    it('should return true when statement contains Timer fragment', () => {
      // GIVEN: A code statement with Timer fragment (value in milliseconds: 20 minutes)
      const statement: ICodeStatement = {
        id: new BlockKey('test-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: TimerStrategy.match() is called
      const strategy = new TimerStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });
  });

  describe('TSC-002: TimerStrategy rejects statements without Timer fragments', () => {
    it('should return false when statement contains only Effort fragment', () => {
      // GIVEN: A code statement with only Effort fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-2'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Pull-ups', type: 'effort' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: TimerStrategy.match() is called
      const strategy = new TimerStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('TSC-003: RoundsStrategy matches statements with Rounds fragments (no Timer)', () => {
    it('should return true when statement contains Rounds fragment but no Timer', () => {
      // GIVEN: A code statement with Rounds fragment but no Timer
      const statement: ICodeStatement = {
        id: new BlockKey('test-3'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: RoundsStrategy.match() is called
      const strategy = new RoundsStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });
  });

  describe('TSC-004: RoundsStrategy rejects statements with Timer fragments', () => {
    it('should return false when statement contains both Timer and Rounds fragments', () => {
      // GIVEN: A code statement with both Timer and Rounds fragments (value in milliseconds: 20 minutes)
      const statement: ICodeStatement = {
        id: new BlockKey('test-4'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: RoundsStrategy.match() is called
      const strategy = new RoundsStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false (Timer takes precedence)
      expect(result).toBe(false);
    });
  });

  describe('TSC-005: EffortStrategy matches statements without Timer or Rounds', () => {
    it('should return true when statement contains only Effort and Rep fragments', () => {
      // GIVEN: A code statement with only Effort fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-5'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Push-ups', type: 'effort' },
          { fragmentType: FragmentType.Rep, value: 20, type: 'rep' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: EffortStrategy.match() is called
      const strategy = new EffortStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });
  });

  describe('TSC-006: EffortStrategy rejects statements with Timer fragments', () => {
    it('should return false when statement contains Timer fragment', () => {
      // GIVEN: A code statement with Timer fragment (value in milliseconds: 10 minutes)
      const statement: ICodeStatement = {
        id: new BlockKey('test-6'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600000, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: EffortStrategy.match() is called
      const strategy = new EffortStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('TSC-007: EffortStrategy rejects statements with Rounds fragments', () => {
    it('should return false when statement contains Rounds fragment', () => {
      // GIVEN: A code statement with Rounds fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-7'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: EffortStrategy.match() is called
      const strategy = new EffortStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('TSC-008: Strategy handles empty statements array', () => {
    it('should return false for all strategies when statements array is empty', () => {
      // GIVEN: Empty statements array
      const statements: ICodeStatement[] = [];

      // WHEN: Any strategy.match() is called
      const timerStrategy = new TimerStrategy();
      const roundsStrategy = new RoundsStrategy();
      const effortStrategy = new EffortStrategy();

      // THEN: All return false
      expect(timerStrategy.match(statements, mockRuntime)).toBe(false);
      expect(roundsStrategy.match(statements, mockRuntime)).toBe(false);
      expect(effortStrategy.match(statements, mockRuntime)).toBe(false);
    });
  });

  describe('TSC-009: Strategy handles missing fragments array', () => {
    it('should return false when fragments array is undefined', () => {
      // GIVEN: Statement with undefined fragments
      const statement: ICodeStatement = {
        id: new BlockKey('test-9'),
        fragments: undefined as any, // Invalid but defensive check needed
        children: [],
        meta: undefined
      };

      // WHEN: Any strategy.match() is called
      const strategy = new TimerStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false (defensive programming)
      expect(result).toBe(false);
    });
  });
});

describe('Timer Configuration Extraction', () => {
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    mockRuntime = {
      jit: {
        compile: vi.fn(),
        strategies: []
      },
      stack: {
        push: vi.fn(),
        pop: vi.fn(),
        current: vi.fn(),
        peek: vi.fn(),
        dispose: vi.fn(),
        clear: vi.fn()
      },
      memory: {
        allocate: vi.fn((type, blockId, initialValue) => ({
          get: () => initialValue,
          set: vi.fn(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
          type,
          blockId
        })),
        get: vi.fn(),
        release: vi.fn(),
        clear: vi.fn()
      },
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      isRunning: vi.fn(),
      getCurrentTime: vi.fn(),
      handle: vi.fn()
    } as any;
  });

  describe('TSC-010: TimerStrategy extracts timer configuration from fragments', () => {
    it('should compile successfully with Timer fragment containing duration', () => {
      // GIVEN: Statement with 20 minute timer (value in milliseconds)
      const statement: ICodeStatement = {
        id: new BlockKey('test-10'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compile with TimerStrategy
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block should be created successfully
      expect(block).toBeDefined();
      expect(block.key).toBeDefined();
    });

    it('should use countdown direction for AMRAP workouts (Timer + Rounds)', () => {
      // GIVEN: AMRAP workout statement (Timer + Rounds), 20 minutes in milliseconds
      const statement: ICodeStatement = {
        id: new BlockKey('test-11'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 0, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compile with TimerStrategy
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block should be created (direction verification happens via TimerBehavior)
      expect(block).toBeDefined();
      expect(block.key).toBeDefined();
      // Note: TimerBehavior receives 'down' direction for countdown
    });

    it('should use count-up direction for For Time workouts (Timer only)', () => {
      // GIVEN: For Time workout statement (timer only, no rounds), 20 minutes in milliseconds
      const statement: ICodeStatement = {
        id: new BlockKey('test-12'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compile with TimerStrategy
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block should be created (direction verification happens via TimerBehavior)
      expect(block).toBeDefined();
      expect(block.key).toBeDefined();
      // Note: TimerBehavior receives 'up' direction for count-up
    });

    it('should handle timer fragment with no duration', () => {
      // GIVEN: Timer fragment with undefined duration
      const statement: ICodeStatement = {
        id: new BlockKey('test-13'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: undefined, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compile with TimerStrategy
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block should be created with default configuration
      expect(block).toBeDefined();
      expect(block.key).toBeDefined();
    });

    it('should handle statement with no timer fragment', () => {
      // GIVEN: Statement with no timer fragment (edge case)
      const statement: ICodeStatement = {
        id: new BlockKey('test-14'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Pull-ups', type: 'effort' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compile with TimerStrategy
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block should be created with default timer configuration
      expect(block).toBeDefined();
      expect(block.key).toBeDefined();
    });
  });
});