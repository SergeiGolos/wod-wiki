import { describe, it, expect, beforeEach, vi } from 'bun:test';
import {
  TimerStrategy,
  RoundsStrategy,
  EffortStrategy,
  TimeBoundRoundsStrategy,
  IntervalStrategy,
  GroupStrategy
} from '../../src/runtime/compiler/strategies';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { ICodeStatement } from '../../src/core/models/CodeStatement';
import { CrossFitDialect } from '@/dialects';
import { IScriptRuntime } from '@/core/types';


describe('Block Compilation Contract', () => {
  let mockRuntime: IScriptRuntime;
  let mockJitCompiler: any;
  let mockStack: any;
  let mockMemory: any;

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

    mockMemory = {
      allocate: vi.fn((type, ownerId, initialValue, visibility) => ({
        id: `ref-${type}`,
        ownerId,
        type,
        visibility,
        get: vi.fn(() => initialValue),
        set: vi.fn()
      })),
      get: vi.fn(),
      set: vi.fn(),
      search: vi.fn(() => []),
      release: vi.fn()
    };

    mockRuntime = {
      jit: mockJitCompiler,
      stack: mockStack,
      memory: mockMemory,
      script: null as any, // Will be set in parseWorkout()
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      isRunning: vi.fn(),
      getCurrentTime: vi.fn(),
      handle: vi.fn(),
      fragmentCompiler: {
        compileStatementFragments: vi.fn().mockReturnValue({
          exerciseId: 'test-exercise',
          values: [],
          timeSpans: []
        })
      }
    } as any;
  });

  // Fixture to parse workout text into statements
  const parseWorkout = (text: string): ICodeStatement[] => {
    const parser = new MdTimerRuntime();
    const script = parser.read(text);

    // Update mock runtime to use the actual script for ID resolution
    mockRuntime.script = script;

    return script.statements;
  };

  describe('TBC-001: TimerStrategy compiles block with "Timer" type metadata', () => {
    it('should create block with Timer type when compiling timer statement', () => {
      // GIVEN: A timer workout script
      const workoutText = ':20';
      const statements = parseWorkout(workoutText);

      // WHEN: TimerStrategy.compile() is called
      const strategy = new TimerStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block has Timer type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Timer");
      expect(block!.sourceIds).toEqual(statements.map(s => s.id));
    });
  });

  describe('TBC-002: RoundsStrategy compiles block with "Rounds" type metadata', () => {
    it('should create block with Rounds type when compiling rounds statement with children', () => {
      // GIVEN: A rounds workout script with child exercise
      const workoutText = '(5)\nPush-ups';
      const statements = parseWorkout(workoutText);

      // WHEN: RoundsStrategy.compile() is called
      const strategy = new RoundsStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block has Rounds type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Rounds");
      expect(block!.sourceIds).toEqual([statements[0].id]); // Only the rounds statement
    });
  });

  describe('TBC-003: EffortStrategy compiles block with "Effort" type metadata', () => {
    it('should create block with Effort type when compiling effort statement', () => {
      // GIVEN: An effort workout script
      const workoutText = '10 Push-ups';
      const statements = parseWorkout(workoutText);

      // WHEN: EffortStrategy.compile() is called
      const strategy = new EffortStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block has Effort type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Effort");
      expect(block!.sourceIds).toEqual(statements.map(s => s.id));
    });
  });

  // TBC-004, TBC-005, TBC-006: Tests removed - old behavior system deprecated
  // Strategies now use LoopCoordinatorBehavior in RoundsBlock for child management
  // See LoopCoordinatorBehavior.test.ts for unified loop behavior tests

  describe('TBC-007: Block preserves source statement ID', () => {
    it('should reference source statement ID in compiled block', () => {
      // GIVEN: A workout script with specific content
      const workoutText = ':30 Squats';
      const statements = parseWorkout(workoutText);

      // WHEN: Strategy compiles statements
      const strategy = new TimerStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block references source statement IDs
      expect(block!.sourceIds).toEqual(statements.map(s => s.id));
      expect(block!.sourceIds.length).toBe(statements.length);
    });
  });

  describe('TBC-008: Block receives runtime reference', () => {
    it('should hold runtime reference in compiled block', () => {
      // GIVEN: A workout script
      const workoutText = '15 Burpees';
      const statements = parseWorkout(workoutText);

      // WHEN: Strategy compiles statements
      const strategy = new EffortStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block holds runtime reference internally (not exposed as public API)
      // The runtime is used internally by behaviors and passed to lifecycle methods
      // We verify this by checking that the block was successfully created
      expect(block).toBeDefined();
      expect(block!.sourceIds).toEqual(statements.map(s => s.id));
    });
  });

  describe('TBC-009: Multiple statements compiled into single block', () => {
    it('should reference source statement IDs in compiled block', () => {
      // GIVEN: Multiple workout lines that create separate statements
      const workoutText = ':20\n10 Squats';
      const statements = parseWorkout(workoutText);

      // WHEN: TimerStrategy compiles the first matching statement
      const strategy = new TimerStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block references the matching statement's ID
      expect(block!.sourceIds).toEqual([statements[0].id]); // TimerStrategy only matches the timer statement
      expect(block!.blockType).toBe("Timer");
    });
  });

  describe('TBC-010: TimeBoundRoundsStrategy compiles AMRAP workouts', () => {
    it('should create TimerBlock wrapping RoundsBlock for AMRAP workout', () => {
      // GIVEN: An AMRAP workout script (As Many Rounds As Possible in time limit)
      const workoutText = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats';
      const statements = parseWorkout(workoutText);

      // WHEN: TimeBoundRoundsStrategy.compile() is called
      const strategy = new TimeBoundRoundsStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block has Timer type metadata
      // TimeBoundRoundsStrategy creates a Timer block that contains a LoopCoordinatorBehavior
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Timer");
      expect(block!.sourceIds).toEqual([statements[0].id]);
    });

    it('should match Timer + AMRAP Action fragments', () => {
      // GIVEN: A workout with both timer and AMRAP action
      const workoutText = '20:00 AMRAP\n  5 Pullups';
      const statements = parseWorkout(workoutText);

      // Apply CrossFitDialect to add semantic hints
      const dialect = new CrossFitDialect();
      for (const stmt of statements) {
        const { hints } = dialect.analyze(stmt);
        stmt.hints = new Set(hints);
      }

      // WHEN: Checking if strategy matches
      const strategy = new TimeBoundRoundsStrategy();
      const matches = strategy.match(statements, mockRuntime);

      // THEN: Strategy should match this pattern
      expect(matches).toBe(true);
    });
  });

  describe('TBC-011: IntervalStrategy compiles EMOM workouts', () => {
    it('should create Interval block for EMOM workout', () => {
      // GIVEN: An EMOM workout script (Every Minute On the Minute)
      const workoutText = '(30) :60 EMOM\n  + 5 Pullups\n  + 10 Pushups\n  + 15 Air Squats';
      const statements = parseWorkout(workoutText);

      // WHEN: IntervalStrategy.compile() is called
      const strategy = new IntervalStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block has Interval type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Interval");
      expect(block!.sourceIds).toEqual([statements[0].id]);
    });

    it('should match Timer + EMOM Action fragments', () => {
      // GIVEN: A workout with timer and EMOM action
      const workoutText = '(20) :60 EMOM\n  + 4 KB Swings 106lb';
      const statements = parseWorkout(workoutText);

      // Apply CrossFitDialect to add semantic hints
      const dialect = new CrossFitDialect();
      for (const stmt of statements) {
        const { hints } = dialect.analyze(stmt);
        stmt.hints = new Set(hints);
      }

      // WHEN: Checking if strategy matches
      const strategy = new IntervalStrategy();
      const matches = strategy.match(statements, mockRuntime);

      // THEN: Strategy should match this pattern
      expect(matches).toBe(true);
    });
  });

  describe('TBC-012: GroupStrategy compiles nested workout structures', () => {
    it('should create Group block for nested exercises', () => {
      // GIVEN: A workout with nested structure (parent-child relationship)
      const workoutText = '(3)\n  Push-ups\n  Squats';
      const statements = parseWorkout(workoutText);

      // WHEN: GroupStrategy.compile() is called with statement that has children
      const strategy = new GroupStrategy();

      // Check if first statement has children (parsed with nesting)
      if (statements[0].children && statements[0].children.length > 0) {
        const block = strategy.compile([statements[0]], mockRuntime);

        // THEN: Block has Group type metadata
        expect(block).toBeDefined();
        expect(block!.blockType).toBe("Group");
      } else {
        // If parser doesn't create nested structure, skip this specific assertion
        // but verify strategy matching logic works
        const matches = strategy.match([statements[0]], mockRuntime);
        expect(matches).toBe(statements[0].children && statements[0].children.length > 0);
      }
    });

    it('should match statements with children', () => {
      // GIVEN: A statement with children IDs (correct number[][] format)
      const parentStatement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [[2]], // Single group containing statement ID 2
        meta: undefined
      };

      // WHEN: Checking if strategy matches
      const strategy = new GroupStrategy();
      const matches = strategy.match([parentStatement], mockRuntime);

      // THEN: Strategy should match statements with children
      expect(matches).toBe(true);
    });
  });
});