import { describe, it, expect, vi } from 'vitest';
import { EffortStrategy } from '../EffortStrategy';
import { IScriptRuntime } from '../../IScriptRuntime';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { HistoryBehavior } from '../../behaviors/HistoryBehavior';
import { EffortBlock } from '../../blocks/EffortBlock';

// Mock runtime
const mockRuntime = {
  fragmentCompiler: {
    compileStatementFragments: vi.fn().mockReturnValue({ values: [] }),
  },
  memory: {
    allocate: vi.fn().mockReturnValue({ id: 'mem-1' }),
    search: vi.fn().mockReturnValue([]),
  },
  clock: {
    register: vi.fn(),
  }
} as unknown as IScriptRuntime;

describe('EffortStrategy', () => {
  const strategy = new EffortStrategy();

  describe('match()', () => {
    it('should match statements without Timer or Rounds (fallback)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with behavior.effort hint (explicit effort)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.effort'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match with effort hint even when Timer is present', () => {
      // This allows forcing effort behavior via dialect
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.effort'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match with effort hint even when Rounds is present', () => {
      // This allows forcing effort behavior via dialect
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.effort'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should NOT match statements with Timer (without effort hint)', () => {
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

    it('should NOT match statements with Rounds (without effort hint)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
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

    it('should handle empty hints set', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '5 Burpees', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set()
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });
  });

  describe('compile()', () => {
    it('should compile statement into RuntimeBlock with blockType Effort', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Effort');
    });

    it('should configure reps when RepFragment is present', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Rep, value: 10, type: 'reps' },
          { fragmentType: FragmentType.Effort, value: 'Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      expect(block).toBeInstanceOf(EffortBlock);
      expect((block as any).config.targetReps).toBe(10);
    });

    it('should attach HistoryBehavior', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
      expect((historyBehavior as any).label).toBe("Effort");
    });
  });
});
