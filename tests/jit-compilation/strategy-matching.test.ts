import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerStrategy, RoundsStrategy, EffortStrategy, IntervalStrategy, TimeBoundRoundsStrategy, GroupStrategy } from '../../src/runtime/strategies';
import { ICodeStatement } from '../../src/CodeStatement';
import { ICodeFragment, FragmentType } from '../../src/CodeFragment';
import { IScriptRuntime } from '../../src/IScriptRuntime';
import { BlockKey } from '../../src/BlockKey';

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
      // GIVEN: A code statement with Timer fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
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
      // GIVEN: A code statement with both Timer and Rounds fragments
      const statement: ICodeStatement = {
        id: new BlockKey('test-4'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
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
      // GIVEN: A code statement with Timer fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-6'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
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

  describe('TSC-010: IntervalStrategy matches Timer + Action with EMOM', () => {
    it('should return true when statement contains Timer and EMOM action', () => {
      // GIVEN: A code statement with Timer and EMOM action fragments
      const statement: ICodeStatement = {
        id: new BlockKey('test-10'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600, type: 'timer' },
          { fragmentType: FragmentType.Action, value: 'EMOM', type: 'action' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: IntervalStrategy.match() is called
      const strategy = new IntervalStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });

    it('should return false when statement has only Timer without EMOM action', () => {
      // GIVEN: A code statement with only Timer fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-10b'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: IntervalStrategy.match() is called
      const strategy = new IntervalStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('TSC-011: TimeBoundRoundsStrategy matches Timer + Rounds/AMRAP', () => {
    it('should return true when statement contains Timer and Rounds', () => {
      // GIVEN: A code statement with Timer and Rounds fragments
      const statement: ICodeStatement = {
        id: new BlockKey('test-11a'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: TimeBoundRoundsStrategy.match() is called
      const strategy = new TimeBoundRoundsStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });

    it('should return true when statement contains Timer and AMRAP action', () => {
      // GIVEN: A code statement with Timer and AMRAP action
      const statement: ICodeStatement = {
        id: new BlockKey('test-11b'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: TimeBoundRoundsStrategy.match() is called
      const strategy = new TimeBoundRoundsStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });

    it('should return false when statement has only Timer', () => {
      // GIVEN: A code statement with only Timer fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-11c'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: TimeBoundRoundsStrategy.match() is called
      const strategy = new TimeBoundRoundsStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false (needs Rounds or AMRAP action)
      expect(result).toBe(false);
    });
  });

  describe('TSC-012: GroupStrategy matches statements with children', () => {
    it('should return true when statement has children', () => {
      // GIVEN: A code statement with children
      const statement: ICodeStatement = {
        id: new BlockKey('test-12'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [
          {
            id: new BlockKey('child-1'),
            fragments: [
              { fragmentType: FragmentType.Effort, value: 'Pullups', type: 'effort' }
            ],
            children: [],
            meta: undefined
          }
        ],
        meta: undefined
      };

      // WHEN: GroupStrategy.match() is called
      const strategy = new GroupStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns true
      expect(result).toBe(true);
    });

    it('should return false when statement has no children', () => {
      // GIVEN: A code statement without children
      const statement: ICodeStatement = {
        id: new BlockKey('test-12b'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Pullups', type: 'effort' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: GroupStrategy.match() is called
      const strategy = new GroupStrategy();
      const result = strategy.match([statement], mockRuntime);

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });
});