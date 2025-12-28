import { describe, it, expect, beforeEach, vi } from 'bun:test';
import {
  TimerStrategy,
  RoundsStrategy,
  EffortStrategy,
  IntervalStrategy,
  TimeBoundRoundsStrategy,
  GroupStrategy
} from '../../src/runtime/strategies';
import { BlockKey } from '../../src/core/models/BlockKey';
import { IScriptRuntime } from '../../src/runtime/IScriptRuntime';
import { ICodeStatement, CodeStatement } from '../../src/core/models/CodeStatement';
import { FragmentType, ICodeFragment } from '../../src/core/models/CodeFragment';
import { CodeMetadata } from '../../src/core/models/CodeMetadata';

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

/**
 * Strategy Matching Contract
 * 
 * Verifies that each JIT strategy correctly identifies the statements
 * it is responsible for compiling based on fragment patterns.
 */
describe('Strategy Matching Contract', () => {
  let mockRuntime: IScriptRuntime;

  beforeEach(() => {
    mockRuntime = {
      jit: { compile: vi.fn(), strategies: [] },
      stack: { push: vi.fn(), pop: vi.fn(), current: vi.fn() },
    } as any;
  });

  // Helper to create concise test statements
  function entry(fragments: any[], children: ICodeStatement[] = []): ICodeStatement {
    return new MockCodeStatement({
      id: new BlockKey(`test-${Math.random().toString(36).slice(2, 7)}`),
      fragments: fragments.map(f => ({ ...f, type: f.type || 'test' })),
      children,
      meta: undefined
    });
  }

  const f = {
    timer: (val = 600) => ({ fragmentType: FragmentType.Timer, value: val, type: 'timer' }),
    rounds: (val = 3) => ({ fragmentType: FragmentType.Rounds, value: val, type: 'rounds' }),
    effort: (val = 'Push-ups') => ({ fragmentType: FragmentType.Effort, value: val, type: 'effort' }),
    action: (val = 'EMOM') => ({ fragmentType: FragmentType.Action, value: val, type: 'action' }),
    rep: (val = 10) => ({ fragmentType: FragmentType.Rep, value: val, type: 'rep' }),
  };

  describe.each([
    {
      name: 'TimerStrategy',
      strategy: () => new TimerStrategy(),
      cases: [
        { label: 'Timer fragment', input: [entry([f.timer()])], expected: true },
        { label: 'Only Effort', input: [entry([f.effort()])], expected: false },
        { label: 'No statements', input: [], expected: false },
      ]
    },
    {
      name: 'RoundsStrategy',
      strategy: () => new RoundsStrategy(),
      cases: [
        { label: 'Rounds fragment', input: [entry([f.rounds()])], expected: true },
        { label: 'Timer (takes precedence)', input: [entry([f.timer(), f.rounds()])], expected: false },
        { label: 'Only Effort', input: [entry([f.effort()])], expected: false },
      ]
    },
    {
      name: 'EffortStrategy',
      strategy: () => new EffortStrategy(),
      cases: [
        { label: 'Effort + Rep', input: [entry([f.effort(), f.rep()])], expected: true },
        { label: 'Timer conflict', input: [entry([f.timer()])], expected: false },
        { label: 'Rounds conflict', input: [entry([f.rounds()])], expected: false },
      ]
    },
    {
      name: 'IntervalStrategy',
      strategy: () => new IntervalStrategy(),
      cases: [
        { label: 'Timer + EMOM', input: [entry([f.timer(), f.action('EMOM')])], expected: true },
        { label: 'Timer only', input: [entry([f.timer()])], expected: false },
      ]
    },
    {
      name: 'TimeBoundRoundsStrategy',
      strategy: () => new TimeBoundRoundsStrategy(),
      cases: [
        { label: 'Timer + Rounds', input: [entry([f.timer(), f.rounds()])], expected: true },
        { label: 'Timer + AMRAP', input: [entry([f.timer(), f.action('AMRAP')])], expected: true },
        { label: 'Timer only', input: [entry([f.timer()])], expected: false },
      ]
    },
    {
      name: 'GroupStrategy',
      strategy: () => new GroupStrategy(),
      cases: [
        { label: 'Has children', input: [entry([f.rounds()], [entry([f.effort()])])], expected: true },
        { label: 'No children', input: [entry([f.rounds()])], expected: false },
      ]
    }
  ])('$name Matching', ({ strategy: createStrategy, cases }) => {
    it.each(cases)('should return $expected for $label', ({ input, expected }) => {
      const strategy = createStrategy();
      expect(strategy.match(input, mockRuntime)).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined fragments gracefully', () => {
      const statement = entry([]);
      (statement as any).fragments = undefined;
      const strategy = new TimerStrategy();
      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });
  });
});