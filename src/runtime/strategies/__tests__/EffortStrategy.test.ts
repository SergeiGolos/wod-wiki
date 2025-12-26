import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { EffortStrategy } from '../EffortStrategy';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { HistoryBehavior } from '../../behaviors/HistoryBehavior';
import { EffortBlock } from '../../blocks/EffortBlock';
import { BlockKey } from '../../../core/models/BlockKey';
import { BehaviorTestHarness } from '../../../../tests/harness';

/**
 * EffortStrategy Unit Tests
 * 
 * Verifies that the EffortStrategy correctly matches and compiles
 * statements into Effort-based runtime blocks.
 */
describe('EffortStrategy', () => {
  let harness: BehaviorTestHarness;
  let strategy: EffortStrategy;

  beforeEach(() => {
    harness = new BehaviorTestHarness();
    strategy = new EffortStrategy();
  });

  describe('match()', () => {
    it('should match statements without Timer or Rounds (structural fallback)', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-1'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should match statements with behavior.effort hint (explicit effort)', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-2'),
        fragments: [],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.effort'])
      };

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should match with effort hint even when Timer or Rounds are present', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-3'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' },
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.effort'])
      };

      expect(strategy.match([statement], harness.runtime)).toBe(true);
    });

    it('should NOT match statements with Timer fragments by default', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-4'),
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });

    it('should NOT match statements with Rounds fragments by default', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-5'),
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });

    it('should not match empty statements array', () => {
      expect(strategy.match([], harness.runtime)).toBe(false);
    });

    it('should not match statement with missing fragments', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-6'),
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], harness.runtime)).toBe(false);
    });
  });

  describe('compile()', () => {
    it('should compile statement into RuntimeBlock with blockType Effort', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-7'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      const block = strategy.compile([statement], harness.runtime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Effort');
    });

    it('should configure targetReps when Rep fragment is present', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-8'),
        fragments: [
          { fragmentType: FragmentType.Rep, value: 10, type: 'rep' },
          { fragmentType: FragmentType.Effort, value: 'Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      const block = strategy.compile([statement], harness.runtime);

      expect(block).toBeInstanceOf(EffortBlock);
      expect((block as EffortBlock).config.targetReps).toBe(10);
    });

    it('should attach HistoryBehavior during compilation', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-9'),
        fragments: [
          { fragmentType: FragmentType.Effort, value: 'Push-ups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      };

      const block = strategy.compile([statement], harness.runtime);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
      expect((historyBehavior as any).label).toBe("Effort");
    });

    it('should handle missing fragments during compilation gracefully', () => {
      const statement: ICodeStatement = {
        id: new BlockKey('test-10'),
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      // Should not crash even if fragments are missing
      const block = strategy.compile([statement], harness.runtime);
      expect(block.blockType).toBe('Effort');
    });
  });
});
