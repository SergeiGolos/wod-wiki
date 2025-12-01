import { describe, it, expect, vi } from 'vitest';
import { GroupStrategy } from '../GroupStrategy';
import { IScriptRuntime } from '../../IScriptRuntime';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';

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

describe('GroupStrategy', () => {
  const strategy = new GroupStrategy();

  describe('match()', () => {
    it('should match statements with children (structural check)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [[2, 3]], // Has children
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with behavior.group hint (explicit group)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [], // No children
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.group'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with both children and hint', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [[2]],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.group'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should not match statements without children or hint', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Effort, value: '10 Pullups', type: 'effort' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });

    it('should not match empty statements array', () => {
      expect(strategy.match([], mockRuntime)).toBe(false);
    });

    it('should handle undefined children array', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });

    it('should handle empty children array without hint', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(false);
    });

    it('should match with hint even when children is empty', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.group'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });
  });

  describe('compile()', () => {
    it('should compile statement into RuntimeBlock with blockType Group', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [[2, 3]],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Group');
    });
  });
});
