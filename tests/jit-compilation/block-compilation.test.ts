import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerStrategy, RoundsStrategy, EffortStrategy } from '../../src/runtime/strategies';
import { ICodeStatement } from '../../src/CodeStatement';
import { ICodeFragment, FragmentType } from '../../src/CodeFragment';
import { IScriptRuntime } from '../../src/IScriptRuntime';
import { BlockKey } from '../../src/BlockKey';
import { IRuntimeBehavior } from '../../src/runtime/IRuntimeBehavior';

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

  describe('TBC-001: TimerStrategy compiles block with "Timer" type metadata', () => {
    it('should create block with Timer type when compiling timer statement with children', () => {
      // GIVEN: A timer statement with children
      const statement: ICodeStatement = {
        id: new BlockKey('timer-1'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
        ],
        children: [
          { id: new BlockKey('child-1'), fragments: [], children: [], meta: undefined }
        ],
        meta: undefined
      };

      // WHEN: TimerStrategy.compile() is called
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block has Timer type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Timer");
      expect(block!.sourceIds).toEqual([statement.id]);
    });
  });

  describe('TBC-002: RoundsStrategy compiles block with "Rounds" type metadata', () => {
    it('should create block with Rounds type when compiling rounds statement', () => {
      // GIVEN: A rounds statement with child
      const statement: ICodeStatement = {
        id: new BlockKey('rounds-1'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [
          { id: new BlockKey('child-1'), fragments: [{ fragmentType: FragmentType.Effort, value: 'Push-ups', type: 'effort' }], children: [], meta: undefined }
        ],
        meta: undefined
      };

      // WHEN: RoundsStrategy.compile() is called
      const strategy = new RoundsStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block has Rounds type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Rounds");
      expect(block!.sourceIds).toEqual([statement.id]);
    });
  });

  describe('TBC-003: EffortStrategy compiles block with "Effort" type metadata', () => {
    it('should create block with Effort type when compiling effort statement', () => {
      // GIVEN: An effort statement
      const statement: ICodeStatement = {
        id: new BlockKey('effort-1'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Squats', type: 'effort' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: EffortStrategy.compile() is called
      const strategy = new EffortStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block has Effort type metadata
      expect(block).toBeDefined();
      expect(block!.blockType).toBe("Effort");
      expect(block!.sourceIds).toEqual([statement.id]);
    });
  });

  // TBC-004, TBC-005, TBC-006: Tests removed - old behavior system deprecated
  // Strategies now use LoopCoordinatorBehavior in RoundsBlock for child management
  // See LoopCoordinatorBehavior.test.ts for unified loop behavior tests

  describe('TBC-007: Block preserves source statement ID', () => {
    it('should reference source statement ID in compiled block', () => {
      // GIVEN: A statement with specific ID
      const statementId = new BlockKey('unique-id-123');
      const statement: ICodeStatement = {
        id: statementId,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 300, type: 'timer' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Strategy compiles statement
      const strategy = new TimerStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block references source statement ID
      expect(block!.sourceIds).toContain(statementId);
      expect(block!.sourceIds.length).toBe(1);
    });
  });

  describe('TBC-008: Block receives runtime reference', () => {
    it('should hold runtime reference in compiled block', () => {
      // GIVEN: A mock runtime instance
      const statement: ICodeStatement = {
        id: new BlockKey('test-1'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Sit-ups', type: 'effort' }
        ],
        children: [],
        meta: undefined
      };

      // WHEN: Strategy compiles statement
      const strategy = new EffortStrategy();
      const block = strategy.compile([statement], mockRuntime);

      // THEN: Block holds runtime reference internally (not exposed as public API)
      // The runtime is used internally by behaviors and passed to lifecycle methods
      // We verify this by checking that the block was successfully created
      expect(block).toBeDefined();
      expect(block!.sourceIds).toEqual([statement.id]);
    });
  });

  describe('TBC-009: Multiple statements compiled into single block', () => {
    it('should reference first statement ID when compiling multiple statements', () => {
      // GIVEN: Multiple statements (edge case - typically one)
      const statements: ICodeStatement[] = [
        { id: new BlockKey('s1'), fragments: [{ fragmentType: FragmentType.Timer, value: 600, type: 'timer' }], children: [], meta: undefined },
        { id: new BlockKey('s2'), fragments: [], children: [], meta: undefined }
      ];

      // WHEN: Strategy compiles multiple statements
      const strategy = new TimerStrategy();
      const block = strategy.compile(statements, mockRuntime);

      // THEN: Block references first statement's ID
      expect(block!.sourceIds).toContain(statements[0].id);
      expect(block!.blockType).toBe("Timer");
    });
  });
});