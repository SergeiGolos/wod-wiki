import { describe, it, expect, beforeEach, vi } from 'bun:test';
import {
  InfrastructureProvider,
  BoundTimerProvider,
  UnboundTimerProvider,
  LapTimerProvider,
  ChildIndexProvider,
  RoundPerLoopProvider,
  RoundPerNextProvider,
  SinglePassProvider,
  BoundLoopProvider,
  UnboundLoopProvider,
  ChildExecutionProvider,
  TimerCompletionProvider,
  HistoryProvider,
  RoundDisplayProvider,
  RoundSpanProvider,
  AudioProvider,
  IntervalProvider,
  RepSchemeProvider,
} from '../../../src/runtime/compiler/providers';
import { CompilationContext } from '../../../src/runtime/compiler/providers/CompilationContext';
import { BlockContext } from '../../../src/runtime/BlockContext';
import { BlockKey } from '../../../src/core/models/BlockKey';
import { FragmentType, ICodeFragment } from '../../../src/core/models/CodeFragment';
import { ICodeStatement, CodeStatement } from '../../../src/core/models/CodeStatement';
import { IScriptRuntime } from '@/core/types';

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

describe('Provider Matching', () => {
  let mockRuntime: IScriptRuntime;
  let mockContext: CompilationContext;

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

    const blockKey = new BlockKey();
    const blockContext = new BlockContext(mockRuntime, blockKey.toString(), '');
    mockContext = new CompilationContext(
      blockKey,
      blockKey.toString(),
      '',
      blockContext,
      [],
      {} as any,
      []
    );
  });

  function entry(fragments: any[], children: ICodeStatement[] = [], hints?: Set<string>): ICodeStatement {
    return new MockCodeStatement({
      id: Math.floor(Math.random() * 10000),
      fragments: fragments.map((f) => ({ ...f, type: f.type || 'test' })),
      children,
      meta: undefined,
      hints,
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
    rep: (val = 10) => ({
      fragmentType: FragmentType.Rep,
      value: val,
      type: 'rep',
    }),
  };

  describe('InfrastructureProvider', () => {
    const provider = new InfrastructureProvider();

    it('should always provide', () => {
      const statement = entry([]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });
  });

  describe('BoundTimerProvider', () => {
    const provider = new BoundTimerProvider();

    it('should provide when timer fragment with duration exists', () => {
      const statement = entry([f.timer(60000)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when no timer fragment', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });

    it('should not provide when timer value is 0', () => {
      const statement = entry([f.timer(0)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('UnboundTimerProvider', () => {
    const provider = new UnboundTimerProvider();

    it('should provide when no bound timer exists', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when bound timer already in context', () => {
      mockContext.addBehavior({ constructor: { name: 'BoundTimerBehavior' } } as any);
      const statement = entry([f.timer(60000)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('ChildIndexProvider', () => {
    const provider = new ChildIndexProvider();

    it('should provide when statement has children', () => {
      const child = entry([f.effort()]);
      const statement = entry([f.rounds()], [child]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when statement has no children', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('RoundPerLoopProvider', () => {
    const provider = new RoundPerLoopProvider();

    it('should provide when statement has children', () => {
      const child = entry([f.effort()]);
      const statement = entry([f.rounds()], [child]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when no children', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('RoundPerNextProvider', () => {
    const provider = new RoundPerNextProvider();

    it('should provide for leaf nodes (no children)', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when statement has children', () => {
      const child = entry([f.effort()]);
      const statement = entry([f.rounds()], [child]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('SinglePassProvider', () => {
    const provider = new SinglePassProvider();

    it('should provide when no rounds and no timer', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when rounds present', () => {
      const statement = entry([f.rounds()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });

    it('should not provide when timer present', () => {
      const statement = entry([f.timer()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('BoundLoopProvider', () => {
    const provider = new BoundLoopProvider();

    it('should provide when rounds present without timer', () => {
      const statement = entry([f.rounds(5)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when timer and rounds (AMRAP pattern)', () => {
      const statement = entry([f.timer(), f.rounds()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('UnboundLoopProvider', () => {
    const provider = new UnboundLoopProvider();

    it('should provide for AMRAP pattern (timer + rounds)', () => {
      const statement = entry([f.timer(), f.rounds()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when only timer', () => {
      const statement = entry([f.timer()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });

    it('should not provide when only rounds', () => {
      const statement = entry([f.rounds()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('ChildExecutionProvider', () => {
    const provider = new ChildExecutionProvider();

    it('should provide when statement has children', () => {
      const child = entry([f.effort()]);
      const statement = entry([f.rounds()], [child]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when no children', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('IntervalProvider', () => {
    const provider = new IntervalProvider();

    it('should provide for EMOM pattern (timer + EMOM action)', () => {
      const statement = entry([f.timer(), f.action('EMOM')]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should provide for repeating_interval hint', () => {
      const hints = new Set(['behavior.repeating_interval']);
      const statement = entry([f.timer()], [], hints);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide for plain timer', () => {
      const statement = entry([f.timer()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('RepSchemeProvider', () => {
    const provider = new RepSchemeProvider();

    it('should provide when rounds value is an array (rep scheme)', () => {
      const statement = entry([{ fragmentType: FragmentType.Rounds, value: [21, 15, 9], type: 'rounds' }]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should provide when multiple rep fragments', () => {
      const statement = entry([f.rep(10), f.rep(20), f.rep(30)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide for simple rounds', () => {
      const statement = entry([f.rounds(5)]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('AudioProvider', () => {
    const provider = new AudioProvider();

    it('should provide when timer present', () => {
      const statement = entry([f.timer()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });

    it('should not provide when no timer', () => {
      const statement = entry([f.effort()]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(false);
    });
  });

  describe('HistoryProvider', () => {
    const provider = new HistoryProvider();

    it('should always provide', () => {
      const statement = entry([]);
      expect(provider.canProvide(statement, mockRuntime, mockContext)).toBe(true);
    });
  });
});
