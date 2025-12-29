import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness';
import { TimeBoundRoundsStrategy } from '../TimeBoundRoundsStrategy';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { UnboundLoopBehavior } from '../../../behaviors/UnboundLoopBehavior';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { CompletionBehavior } from '@/runtime/behaviors/CompletionBehavior';
import { HistoryBehavior } from '@/runtime/behaviors/HistoryBehavior';
import { ChildRunnerBehavior } from '@/runtime/behaviors/ChildRunnerBehavior';
import { ParsedCodeStatement } from '@/core/models/CodeStatement';

/**
 * TimeBoundRoundsStrategy Contract Tests (Migrated to Test Harness)
 */
describe('TimeBoundRoundsStrategy', () => {
  let harness: BehaviorTestHarness;
  const strategy = new TimeBoundRoundsStrategy();

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  describe('match()', () => {
    it('should match statements with Timer and Rounds fragment', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should NOT match statements without Timer fragment', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });
  });

  describe('compile()', () => {
    it('should compile AMRAP statement into RuntimeBlock with AMRAP type', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('AMRAP');
    });

    it('should create BoundTimerBehavior with up direction (as implemented)', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const timerBehavior = block.getBehavior(BoundTimerBehavior);

      expect(timerBehavior).toBeDefined();
      expect((timerBehavior as any).direction).toBe('up');
    });

    it('should create UnboundLoopBehavior and ChildRunnerBehavior', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);

      expect(block.getBehavior(UnboundLoopBehavior)).toBeDefined();
      expect(block.getBehavior(ChildRunnerBehavior)).toBeDefined();
    });

    it('should configure CompletionBehavior to depend on timer', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const completionBehavior = block.getBehavior(CompletionBehavior);

      expect(completionBehavior).toBeDefined();
      expect((completionBehavior as any).checkOnEvents).toContain('timer:complete');
    });

    it('should attach HistoryBehavior', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'AMRAP', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 1200000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
      expect((historyBehavior as any).label).toBe("AMRAP");
    });
  });
});
