import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '../../../../tests/harness';
import { IntervalStrategy } from '../IntervalStrategy';
import { FragmentType } from '../../../core/models/CodeFragment';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { LoopCoordinatorBehavior, LoopType } from '../../behaviors/LoopCoordinatorBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { SoundBehavior } from '../../behaviors/SoundBehavior';
import { HistoryBehavior } from '../../behaviors/HistoryBehavior';

/**
 * IntervalStrategy Contract Tests (Migrated to Test Harness)
 * 
 * Tests matching and compilation of interval-based blocks (e.g., EMOM).
 */
describe('IntervalStrategy', () => {
  let harness: BehaviorTestHarness;
  const strategy = new IntervalStrategy();

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  it('should match statements with Timer and behavior.repeating_interval hint', () => {
    const validStatement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      // Hints are set by DialectRegistry before strategy matching
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    expect(strategy.match([validStatement], harness.runtime)).toBe(true);
  });

  it('should not match statements without Timer', () => {
    const invalidStatement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' }
      ],
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    expect(strategy.match([invalidStatement], harness.runtime)).toBe(false);
  });

  it('should not match statements without repeating_interval hint', () => {
    const noHintStatement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ]
      // No hints set
    } as any;

    expect(strategy.match([noHintStatement], harness.runtime)).toBe(false);
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
      children: [[2]], // Mock child group
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    const block = strategy.compile([statement], harness.runtime);

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
      children: [[2]], // Mock child group
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    const block = strategy.compile([statement], harness.runtime);
    const loopCoordinator = block.getBehavior(LoopCoordinatorBehavior);
    expect((loopCoordinator as any).config.totalRounds).toBe(10);
  });

  it('should attach SoundBehavior with countdown cues', () => {
    const statement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    const block = strategy.compile([statement], harness.runtime);
    const soundBehavior = block.getBehavior(SoundBehavior);

    expect(soundBehavior).toBeDefined();
    // Verify cues
    const config = (soundBehavior as any).config;
    expect(config.direction).toBe('down');
    expect(config.cues.length).toBeGreaterThan(0);
  });

  it('should attach HistoryBehavior', () => {
    const statement: ICodeStatement = {
      id: 1,
      type: 'statement',
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom'])
    } as any;

    const block = strategy.compile([statement], harness.runtime);
    const historyBehavior = block.getBehavior(HistoryBehavior);

    expect(historyBehavior).toBeDefined();
    expect((historyBehavior as any).label).toBe("EMOM");
  });
});
