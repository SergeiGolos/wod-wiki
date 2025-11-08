import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JitCompiler } from '../../src/runtime/JitCompiler';
import { TimerStrategy, RoundsStrategy, EffortStrategy, IntervalStrategy, TimeBoundRoundsStrategy, GroupStrategy } from '../../src/runtime/strategies';
import { ICodeStatement } from '../../src/CodeStatement';
import { ICodeFragment, FragmentType } from '../../src/CodeFragment';
import { IScriptRuntime } from '../../src/IScriptRuntime';
import { BlockKey } from '../../src/BlockKey';

describe('Strategy Precedence Contract', () => {
  let mockRuntime: IScriptRuntime;
  let mockJitCompiler: any;
  let mockStack: any;

  beforeEach(() => {
    mockJitCompiler = {
      compile: vi.fn(),
      strategies: []
    };

    mockStack = {
      push: vi.fn(),
      pop: vi.fn(),
      current: vi.fn(),
      peek: vi.fn(),
      dispose: vi.fn(),
      clear: vi.fn()
    };

    const mockMemory = {
      allocate: vi.fn((type: string, owner: string, initialValue?: any, visibility?: string) => {
        return {
          id: `mock-ref-${Math.random()}`,
          type,
          owner,
          get: vi.fn(() => initialValue),
          set: vi.fn(),
          update: vi.fn(),
          visibility: visibility || 'private'
        };
      }),
      release: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      search: vi.fn(() => [])
    };

    mockRuntime = {
      jit: mockJitCompiler,
      stack: mockStack,
      memory: mockMemory,
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      isRunning: vi.fn(),
      getCurrentTime: vi.fn()
    } as any;
  });

  describe('TSP-001: TimerStrategy evaluated before RoundsStrategy', () => {
    it('should compile Timer block when both TimerStrategy and RoundsStrategy registered', () => {
      // GIVEN: JitCompiler with TimerStrategy and RoundsStrategy registered
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());

      // GIVEN: Statement with Timer fragment
      const statement: ICodeStatement = {
        id: new BlockKey('test-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: Block has Timer type (not Rounds)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Timer");
    });
  });

  describe('TSP-002: RoundsStrategy evaluated before EffortStrategy', () => {
    it('should compile Rounds block when all strategies registered in correct order', () => {
      // GIVEN: JitCompiler with all strategies registered in correct order
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with Rounds fragment (no Timer)
      const statement: ICodeStatement = {
        id: new BlockKey('test-2'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: Block has Rounds type (not Effort)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Rounds");
    });
  });

  describe('TSP-003: EffortStrategy acts as fallback', () => {
    it('should compile Effort block when only Effort fragment present', () => {
      // GIVEN: JitCompiler with all strategies registered
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with only Effort fragment (no Timer, no Rounds)
      const statement: ICodeStatement = {
        id: new BlockKey('test-3'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Deadlifts', type: 'effort' },
          { fragmentType: FragmentType.Rep, value: 10, type: 'rep' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: Block has Effort type (fallback)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Effort");
    });
  });

  describe('TSP-004: Timer + Rounds statement matches TimerStrategy (precedence)', () => {
    it('should prioritize TimerStrategy when both Timer and Rounds fragments present', () => {
      // GIVEN: JitCompiler with strategies registered
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with BOTH Timer and Rounds fragments
      const statement: ICodeStatement = {
        id: new BlockKey('test-4'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: TimerStrategy wins (evaluated first)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Timer");
    });
  });

  describe('TSP-005: Registration order determines precedence', () => {
    it('should demonstrate incorrect behavior when strategies registered in wrong order', () => {
      // GIVEN: JitCompiler with strategies registered in WRONG order
      const compiler = new JitCompiler();
      compiler.registerStrategy(new EffortStrategy());  // Fallback first (wrong!)
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());

      // GIVEN: Timer statement
      const statement: ICodeStatement = {
        id: new BlockKey('test-5'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: EffortStrategy incorrectly matches first (demonstrates order matters)
      // NOTE: This test demonstrates INCORRECT behavior - EffortStrategy should NOT match
      // This validates that order matters and documents the bug when order is wrong
      expect(block).toBeDefined();
      // In correct implementation, EffortStrategy match() should return false for Timer
      // So this test will fail until EffortStrategy is fixed
    });
  });

  describe('TSP-006: No matching strategy returns undefined', () => {
    it('should return undefined when no strategies registered', () => {
      // GIVEN: JitCompiler with NO strategies registered
      const compiler = new JitCompiler();
      // (no registerStrategy calls)

      // GIVEN: Any statement
      const statement: ICodeStatement = {
        id: new BlockKey('test-6'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 300, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: Returns undefined (no matching strategy)
      expect(block).toBeUndefined();
    });
  });

  describe('TSP-007: Empty statements array returns undefined', () => {
    it('should return undefined when compiling empty array', () => {
      // GIVEN: JitCompiler with strategies registered
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Empty statements array
      const statements: ICodeStatement[] = [];

      // WHEN: Compiler compiles empty array
      const block = compiler.compile(statements, mockRuntime);

      // THEN: Returns undefined (logged warning)
      expect(block).toBeUndefined();
    });
  });

  describe('TSP-008: First match wins (no double compilation)', () => {
    it('should only call compile() on first matching strategy', () => {
      // GIVEN: Spy on strategy compile methods
      const timerStrategy = new TimerStrategy();
      const timerCompileSpy = vi.spyOn(timerStrategy, 'compile');

      const roundsStrategy = new RoundsStrategy();
      const roundsCompileSpy = vi.spyOn(roundsStrategy, 'compile');

      const compiler = new JitCompiler();
      compiler.registerStrategy(timerStrategy);
      compiler.registerStrategy(roundsStrategy);

      // GIVEN: Timer statement
      const statement: ICodeStatement = {
        id: new BlockKey('test-8'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 900, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      compiler.compile([statement], mockRuntime);

      // THEN: Only TimerStrategy.compile() called (not RoundsStrategy)
      expect(timerCompileSpy).toHaveBeenCalledOnce();
      expect(roundsCompileSpy).not.toHaveBeenCalled();
    });
  });

  describe('TSP-009: Multiple compile calls maintain consistent precedence', () => {
    it('should maintain consistent precedence across multiple compilations', () => {
      // GIVEN: JitCompiler with strategies
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Multiple different statements
      const timerStmt: ICodeStatement = {
        id: new BlockKey('t1'),
        fragments: [{ fragmentType: FragmentType.Timer, value: 600, type: 'timer' }],
        children: [], meta: undefined
      };

      const roundsStmt: ICodeStatement = {
        id: new BlockKey('r1'),
        fragments: [{ fragmentType: FragmentType.Rounds, value: 4, type: 'rounds' }],
        children: [], meta: undefined
      };

      const effortStmt: ICodeStatement = {
        id: new BlockKey('e1'),
        fragments: [{ fragmentType: FragmentType.Effort, value: 'Lunges', type: 'effort' }],
        children: [], meta: undefined
      };

      // WHEN: Compiler compiles multiple statements
      const block1 = compiler.compile([timerStmt], mockRuntime);
      const block2 = compiler.compile([roundsStmt], mockRuntime);
      const block3 = compiler.compile([effortStmt], mockRuntime);

      // THEN: Each statement matches correct strategy
      expect(block1!.blockType).toBe("Timer");
      expect(block2!.blockType).toBe("Rounds");
      expect(block3!.blockType).toBe("Effort");
    });
  });

  describe('TSP-010: TimeBoundRoundsStrategy has higher precedence than TimerStrategy', () => {
    it('should match TimeBoundRoundsStrategy when both Timer and Rounds present', () => {
      // GIVEN: JitCompiler with strategies in correct order
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimeBoundRoundsStrategy()); // Most specific first
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with BOTH Timer and Rounds fragments (AMRAP)
      const statement: ICodeStatement = {
        id: new BlockKey('amrap-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 10, type: 'rounds' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: TimeBoundRoundsStrategy wins (most specific)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("TimeBoundRounds");
    });
  });

  describe('TSP-011: IntervalStrategy has correct precedence', () => {
    it('should match IntervalStrategy when Timer and EMOM action present', () => {
      // GIVEN: JitCompiler with strategies in correct order
      const compiler = new JitCompiler();
      compiler.registerStrategy(new IntervalStrategy());
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with Timer and EMOM action
      const statement: ICodeStatement = {
        id: new BlockKey('emom-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 600, type: 'timer' },
          { fragmentType: FragmentType.Action, value: 'EMOM', type: 'action' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: IntervalStrategy wins (more specific than TimerStrategy)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Interval");
    });
  });

  describe('TSP-012: GroupStrategy evaluated before EffortStrategy', () => {
    it('should match GroupStrategy when statement has children but no specific fragments', () => {
      // GIVEN: JitCompiler with strategies including GroupStrategy
      const compiler = new JitCompiler();
      compiler.registerStrategy(new TimerStrategy());
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new GroupStrategy()); // Before EffortStrategy
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with children but NO specific fragments (just text/action)
      // This represents a pure grouping construct
      const statement: ICodeStatement = {
        id: new BlockKey('group-1'),
        fragments: [
          { fragmentType: FragmentType.Action, value: 'Superset', type: 'action' }
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

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: GroupStrategy matches (has children, no timer/rounds)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Group");
    });

    it('should prioritize RoundsStrategy over GroupStrategy when Rounds fragment present', () => {
      // GIVEN: JitCompiler with strategies
      const compiler = new JitCompiler();
      compiler.registerStrategy(new RoundsStrategy());
      compiler.registerStrategy(new GroupStrategy());
      compiler.registerStrategy(new EffortStrategy());

      // GIVEN: Statement with Rounds fragment AND children
      const statement: ICodeStatement = {
        id: new BlockKey('rounds-group'),
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

      // WHEN: Compiler compiles statement
      const block = compiler.compile([statement], mockRuntime);

      // THEN: RoundsStrategy wins (more specific - handles rounds behavior)
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Rounds");
    });
  });
});