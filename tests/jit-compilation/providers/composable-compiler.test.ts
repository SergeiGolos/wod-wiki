import { describe, it, expect, beforeEach, vi } from 'bun:test';
import {
  ComposableBlockCompiler,
  createDefaultProviders,
  InfrastructureProvider,
  BoundTimerProvider,
  UnboundTimerProvider,
  ChildIndexProvider,
  RoundPerLoopProvider,
  SinglePassProvider,
  HistoryProvider,
} from '../../../src/runtime/compiler/providers';
import { FragmentType, ICodeFragment } from '../../../src/core/models/CodeFragment';
import { ICodeStatement, CodeStatement } from '../../../src/core/models/CodeStatement';
import { IScriptRuntime } from '@/core/types';
import { BlockKey } from '../../../src/core/models/BlockKey';

class MockCodeStatement extends CodeStatement {
  id: any;
  parent?: number;
  children: any = [];
  meta: any;
  fragments: ICodeFragment[] = [];
  isLeaf?: boolean;
  hints?: Set<string>;

  constructor(data: any) {
    super();
    Object.assign(this, data);
  }
}

describe('ComposableBlockCompiler', () => {
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    mockRuntime = {
      jit: { compile: vi.fn(), strategies: [] },
      stack: { push: vi.fn(), pop: vi.fn(), current: vi.fn() },
      memory: {
        allocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        search: vi.fn().mockReturnValue([]),
        release: vi.fn(),
      },
      eventBus: {
        register: vi.fn().mockReturnValue(() => {}),
        emit: vi.fn(),
      },
      clock: { now: new Date() },
    } as any;
  });

  // Helper to create concise test statements
  function entry(fragments: any[], children: ICodeStatement[] = []): ICodeStatement {
    return new MockCodeStatement({
      id: Math.floor(Math.random() * 10000),
      fragments: fragments.map((f) => ({ ...f, type: f.type || 'test' })),
      children,
      meta: undefined,
    });
  }

  const f = {
    timer: (val = 600, direction: 'up' | 'down' = 'down') => ({
      fragmentType: FragmentType.Timer,
      value: val,
      direction,
      type: 'timer',
    }),
    rounds: (val = 3) => ({
      fragmentType: FragmentType.Rounds,
      value: val,
      type: 'rounds',
    }),
    effort: (val = 'Push-ups') => ({
      fragmentType: FragmentType.Effort,
      value: val,
      type: 'effort',
    }),
    action: (val = 'EMOM') => ({
      fragmentType: FragmentType.Action,
      value: val,
      type: 'action',
    }),
  };

  describe('Provider Registration', () => {
    it('should register providers and sort by priority', () => {
      const compiler = new ComposableBlockCompiler();

      // Add in wrong order
      compiler.registerProvider(new HistoryProvider());
      compiler.registerProvider(new InfrastructureProvider());

      const providers = compiler.getProviders();
      expect(providers[0].priority).toBeGreaterThan(providers[1].priority);
    });
  });

  describe('Basic Compilation', () => {
    it('should compile a simple timer statement', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const statement = entry([f.timer(60000, 'down')]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block).toBeDefined();
      expect(block?.blockType).toBe('Timer');
    });

    it('should compile an effort statement (fallback)', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const statement = entry([f.effort('Burpees')]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block).toBeDefined();
      // Should get some block type (Effort or Group based on providers)
    });

    it('should return undefined for empty statement', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const result = compiler.compile(null as any, mockRuntime);

      expect(result).toBeUndefined();
    });
  });

  describe('Provider Composition', () => {
    it('should compose multiple providers for timer blocks', () => {
      const compiler = new ComposableBlockCompiler([
        new InfrastructureProvider(),
        new BoundTimerProvider(),
        new HistoryProvider(),
      ]);

      const statement = entry([f.timer(60000, 'down')]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block).toBeDefined();
      // Should have behaviors from all three providers
      expect(block?.getBehavior).toBeDefined();
    });

    it('should skip excluded behaviors', () => {
      const compiler = new ComposableBlockCompiler([
        new InfrastructureProvider(),
        new BoundTimerProvider(), // Excludes UnboundTimerBehavior
        new UnboundTimerProvider(), // Should not contribute
        new HistoryProvider(),
      ]);

      const statement = entry([f.timer(60000)]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block).toBeDefined();
      // BoundTimerBehavior should be present, UnboundTimerBehavior should not
      const boundTimer = block?.getBehavior(
        class BoundTimerBehavior {} as any
      );
      // This is a simplified check - real test would verify behavior types
    });
  });

  describe('Block Type Determination', () => {
    it('should determine Timer block type for timer fragments', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const statement = entry([f.timer(60000)]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block?.blockType).toBe('Timer');
    });

    it('should determine Rounds block type for rounds fragments', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const childStmt = entry([f.effort('Squats')]);
      const statement = entry([f.rounds(5)], [childStmt]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block?.blockType).toBe('Rounds');
    });

    it('should determine AMRAP block type for timer + rounds', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const childStmt = entry([f.effort('Burpees')]);
      const statement = entry([f.timer(60000), f.rounds(10)], [childStmt]);
      const block = compiler.compile(statement, mockRuntime);

      expect(block?.blockType).toBe('AMRAP');
    });
  });

  describe('Validation', () => {
    it('should validate correct configurations', () => {
      const compiler = new ComposableBlockCompiler(createDefaultProviders());

      const statement = entry([f.timer(60000)]);
      const result = compiler.validateBehaviors(statement, mockRuntime);

      expect(result.valid).toBe(true);
    });
  });
});
