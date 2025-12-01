import { describe, it, expect, vi } from 'vitest';
import { TimerStrategy } from '../TimerStrategy';
import { IScriptRuntime } from '../../IScriptRuntime';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { TimerBehavior } from '../../behaviors/TimerBehavior';

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

describe('TimerStrategy', () => {
  const strategy = new TimerStrategy();

  describe('match()', () => {
    it('should match statements with Timer fragment', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with behavior.timer hint (explicit timer)', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.timer'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should match statements with both Timer fragment and hint', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 120000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 },
        hints: new Set(['behavior.timer'])
      } as any;

      expect(strategy.match([statement], mockRuntime)).toBe(true);
    });

    it('should not match statements without Timer fragment or hint', () => {
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
    it('should compile statement with Timer fragment into RuntimeBlock', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, direction: 'down', type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Timer');
      
      const timerBehavior = block.getBehavior(TimerBehavior);
      expect(timerBehavior).toBeDefined();
    });

    it('should create countdown timer when direction is down', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, direction: 'down', type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const timerBehavior = block.getBehavior(TimerBehavior);

      expect((timerBehavior as any).direction).toBe('down');
    });

    it('should create count-up timer when direction is up', () => {
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: undefined, direction: 'up', type: 'timer' }
        ],
        children: [],
        meta: { line: 1, offset: 0, column: 0 }
      } as any;

      const block = strategy.compile([statement], mockRuntime);
      const timerBehavior = block.getBehavior(TimerBehavior);

      expect((timerBehavior as any).direction).toBe('up');
    });
  });
});
