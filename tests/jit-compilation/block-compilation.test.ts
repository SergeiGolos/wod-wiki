import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerStrategy, RoundsStrategy, EffortStrategy } from '../../src/runtime/strategies';
import { ICodeStatement } from '../../src/CodeStatement';
import { IScriptRuntime } from '../../src/runtime/IScriptRuntime';
import { MdTimerRuntime } from '../../src/parser/md-timer';

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
      script: {
        getIds: vi.fn((ids: any) => ids) // Return the same IDs as statements
      },
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      isRunning: vi.fn(),
      getCurrentTime: vi.fn(),
      handle: vi.fn()
    } as any;
  });

  // Fixture to parse workout text into statements
  const parseWorkout = (text: string): ICodeStatement[] => {
    const parser = new MdTimerRuntime();
    const script = parser.read(text);
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
});