import { describe, it, expect, vi } from 'bun:test';
import { TimeBoundRoundsStrategy } from '../TimeBoundRoundsStrategy';
import { IScriptRuntime } from '../../IScriptRuntime';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { LoopCoordinatorBehavior, LoopType } from '../../behaviors/LoopCoordinatorBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { CompletionBehavior } from '../../behaviors/CompletionBehavior';
import { HistoryBehavior } from '../../behaviors/HistoryBehavior';

// Mock runtime
const mockRuntime = {
  fragmentCompiler: {
    compileStatementFragments: vi.fn().mockReturnValue({ values: [] }),
  },
  memory: {
    allocate: vi.fn().mockReturnValue({ id: 'mem-1' }),
  },
  clock: {
    register: vi.fn(),
  }
} as unknown as IScriptRuntime;

describe('TimeBoundRoundsStrategy', () => {
  const strategy = new TimeBoundRoundsStrategy();

  describe('match()', () => {
    it('should match statements with Timer and behavior.time_bound hint', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with Timer and Rounds fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should NOT match statements without Timer fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });

    it('should NOT match Timer-only statements without hint or Rounds', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });

    it('should not match empty statements array', () => {
      expect(strategy.match([], mockRuntime)).toBe(false);
    });

    it('should not match statement with missing fragments', () => {
      const statement: ICodeStatement = {
        id: 1,
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });
  });

  describe('compile()', () => {
    it('should compile AMRAP statement into RuntimeBlock', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: '20:00', type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      const block = strategy.compile([statement], mockRuntime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Timer');
    });

    it('should create TimerBehavior with countdown direction', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: '20:00', type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const timerBehavior = block.getBehavior(TimerBehavior);

      expect(timerBehavior).toBeDefined();
      expect((timerBehavior as any).direction).toBe('down');
    });

    it('should create LoopCoordinatorBehavior with TIME_BOUND type', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: '20:00', type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);

      expect(loopCoordinator).toBeDefined();
      expect((loopCoordinator as any).config.loopType).toBe(LoopType.TIME_BOUND);
      expect((loopCoordinator as any).config.totalRounds).toBe(Infinity);
    });

    it('should configure CompletionBehavior to depend on timer', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: '20:00', type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const completionBehavior = block.getBehavior(CompletionBehavior);

      expect(completionBehavior).toBeDefined();
      // We can't easily test the internal predicate function without running it, 
      // but we can check the events listened to.
      expect((completionBehavior as any).triggerEvents).toContain('timer:complete');
    });

    it('should attach HistoryBehavior', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: '20:00', type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.time_bound', 'workout.amrap'])
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
      expect((historyBehavior as any).label).toBe("AMRAP");
    });
  });
});
