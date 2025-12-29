import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness';
import { RoundsStrategy } from '../RoundsStrategy';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { ParsedCodeStatement } from '@/core/models/CodeStatement';
import { BoundLoopBehavior } from '@/runtime/behaviors/BoundLoopBehavior';
import { RepSchemeBehavior } from '@/runtime/behaviors/RepSchemeBehavior';
import { ChildRunnerBehavior } from '@/runtime/behaviors/ChildRunnerBehavior';
import { HistoryBehavior } from '@/runtime/behaviors/HistoryBehavior';

/**
 * RoundsStrategy Contract Tests (Migrated to Test Harness)
 * 
 * Tests matching and compilation of rounds-based blocks (e.g., "3 Rounds").
 */
describe('RoundsStrategy', () => {
  let harness: BehaviorTestHarness;
  const strategy = new RoundsStrategy();

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  describe('match()', () => {
    it('should match statements with Rounds fragment and no Timer', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should NOT match statements with Timer fragment', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' },
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });
  });

  describe('compile()', () => {
    it('should compile statement with Rounds fragment into RuntimeBlock', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Rounds');
    });

    it('should create BoundLoopBehavior with correct round limit', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const loopBehavior = block.getBehavior(BoundLoopBehavior);

      expect(loopBehavior).toBeDefined();
      // totalRounds is private, but we can check if it exists or use any
      expect((loopBehavior as any).totalRounds).toBe(5);
    });

    it('should support rep scheme (21-15-9)', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: [21, 15, 9], type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const repSchemeBehavior = block.getBehavior(RepSchemeBehavior);
      const loopBehavior = block.getBehavior(BoundLoopBehavior);

      expect(repSchemeBehavior).toBeDefined();
      expect((repSchemeBehavior as any).repScheme).toEqual([21, 15, 9]);
      expect((loopBehavior as any).totalRounds).toBe(3);
    });

    it('should create ChildRunnerBehavior', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      expect(block.getBehavior(ChildRunnerBehavior)).toBeDefined();
    });

    it('should attach HistoryBehavior', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
    });
  });
});
