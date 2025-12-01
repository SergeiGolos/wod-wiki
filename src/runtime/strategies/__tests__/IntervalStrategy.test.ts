
import { describe, it, expect, vi } from 'vitest';
import { IntervalStrategy } from '../IntervalStrategy';
import { IScriptRuntime } from '../../IScriptRuntime';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { LoopCoordinatorBehavior, LoopType } from '../../behaviors/LoopCoordinatorBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';

// Mock runtime
const mockRuntime = {
  fragmentCompiler: {
    compileStatementFragments: vi.fn().mockReturnValue({}),
  },
  memory: {
    allocate: vi.fn().mockReturnValue({ id: 'mem-1' }),
  },
  clock: {
      register: vi.fn(),
  }
} as unknown as IScriptRuntime;

describe('IntervalStrategy', () => {
  const strategy = new IntervalStrategy();

  it('should match statements with Timer and EMOM action', () => {
    const validStatement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ]
    } as any;

    expect(strategy.match([validStatement], mockRuntime)).toBe(true);
  });

  it('should not match statements without Timer', () => {
    const invalidStatement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' }
      ]
    } as any;

    expect(strategy.match([invalidStatement], mockRuntime)).toBe(false);
  });

  it('should compile into a RuntimeBlock with correct behaviors', () => {
    const statement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
      ],
      children: [[2]] // Mock child group
    } as any;

    const block = strategy.compile([statement], mockRuntime);

    expect(block).toBeDefined();

    // Check behaviors
    const timerBehavior = block.getBehavior(TimerBehavior);
    expect(timerBehavior).toBeDefined();
    expect((timerBehavior as any).durationMs).toBe(60000);

    const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);
    expect(loopCoordinator).toBeDefined();
    expect((loopCoordinator as any).config.loopType).toBe(LoopType.INTERVAL);
    expect((loopCoordinator as any).config.totalRounds).toBe(5);
  });

  it('should default to 10 rounds if no RoundsFragment provided', () => {
    const statement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      children: [[2]] // Mock child group
    } as any;

    const block = strategy.compile([statement], mockRuntime);
    const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);
    expect((loopCoordinator as any).config.totalRounds).toBe(10);
  });
});
