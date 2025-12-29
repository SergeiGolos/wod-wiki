import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness';
import { RoundsStrategy } from '../RoundsStrategy';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { ICodeStatement, ParsedCodeStatement } from '@/core/models/CodeStatement';
import { LoopCoordinatorBehavior, LoopType } from '../../../behaviors/LoopCoordinatorBehavior';
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

    it('should match statements with behavior.fixed_rounds hint (no Rounds fragment)', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any,
        hints: new Set(['behavior.fixed_rounds'])
      });

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should match statements with both Rounds fragment and hint', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any,
        hints: new Set(['behavior.fixed_rounds'])
      });

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should NOT match statements with Timer fragment (Timer takes precedence)', () => {
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

    it('should NOT match statements with Timer even with fixed_rounds hint', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any,
        hints: new Set(['behavior.fixed_rounds'])
      });

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });

    it('should not match statements without Rounds fragment or hint', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });

    it('should not match empty statements array', () => {
      expect(strategy.match([], harness.runtime)).toBe(false);
    });

    it('should not match statement with missing fragments', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
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

    it('should create LoopCoordinatorBehavior with correct round count', () => {
      const statement = new ParsedCodeStatement({
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
        ],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 } as any
      });

      const block = strategy.compile([statement], harness.runtime);
      const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);

      expect(loopCoordinator).toBeDefined();
      expect((loopCoordinator as any).config.totalRounds).toBe(5);
      expect((loopCoordinator as any).config.loopType).toBe(LoopType.FIXED);
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
      const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);

      expect(loopCoordinator).toBeDefined();
      expect((loopCoordinator as any).config.totalRounds).toBe(3);
      expect((loopCoordinator as any).config.loopType).toBe(LoopType.REP_SCHEME);
      expect((loopCoordinator as any).config.repScheme).toEqual([21, 15, 9]);
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
      expect((historyBehavior as any).label).toBe("Rounds");
    });
  });
});
