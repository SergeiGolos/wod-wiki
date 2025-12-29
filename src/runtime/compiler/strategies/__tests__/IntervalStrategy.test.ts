import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness';
import { IntervalStrategy } from '../IntervalStrategy';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { BoundTimerBehavior } from '@/runtime/behaviors/BoundTimerBehavior';
import { BoundLoopBehavior } from '@/runtime/behaviors/BoundLoopBehavior';
import { IntervalWaitingBehavior } from '@/runtime/behaviors/IntervalWaitingBehavior';
import { SoundBehavior } from '@/runtime/behaviors/SoundBehavior';
import { HistoryBehavior } from '@/runtime/behaviors/HistoryBehavior';
import { ParsedCodeStatement } from '@/core/models/CodeStatement';

/**
 * IntervalStrategy Contract Tests (Migrated to Test Harness)
 */
describe('IntervalStrategy', () => {
  let harness: BehaviorTestHarness;
  const strategy = new IntervalStrategy();

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  it('should match statements with Timer and behavior.repeating_interval hint', () => {
    const validStatement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      hints: new Set(['behavior.repeating_interval', 'workout.emom']),
      meta: { line: 1, offset: 0, column: 0 } as any
    });

    expect(strategy.match([validStatement], harness.runtime)).toBe(true);
  });

  it('should compile into a RuntimeBlock with correct behaviors', () => {
    const statement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom']),
      meta: { line: 1, offset: 0, column: 0 } as any
    });

    const block = strategy.compile([statement], harness.runtime);

    expect(block).toBeDefined();

    // Check behaviors
    const timerBehavior = block.getBehavior(BoundTimerBehavior);
    expect(timerBehavior).toBeDefined();
    expect((timerBehavior as any).durationMs).toBe(60000);

    const loopBehavior = block.getBehavior(BoundLoopBehavior);
    expect(loopBehavior).toBeDefined();
    expect((loopBehavior as any).totalRounds).toBe(5);

    expect(block.getBehavior(IntervalWaitingBehavior)).toBeDefined();
  });

  it('should default to 10 rounds if no RoundsFragment provided', () => {
    const statement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom']),
      meta: { line: 1, offset: 0, column: 0 } as any
    });

    const block = strategy.compile([statement], harness.runtime);
    const loopBehavior = block.getBehavior(BoundLoopBehavior);
    expect((loopBehavior as any).totalRounds).toBe(10);
  });

  it('should attach SoundBehavior with countdown cues', () => {
    const statement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom']),
      meta: { line: 1, offset: 0, column: 0 } as any
    });

    const block = strategy.compile([statement], harness.runtime);
    const soundBehavior = block.getBehavior(SoundBehavior);

    expect(soundBehavior).toBeDefined();
    const config = (soundBehavior as any).config;
    expect(config.direction).toBe('down');
  });

  it('should attach HistoryBehavior', () => {
    const statement = new ParsedCodeStatement({
      id: 1,
      fragments: [
        { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
        { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' },
        { fragmentType: FragmentType.Rounds, value: 5, type: 'rounds' }
      ],
      children: [[2]],
      hints: new Set(['behavior.repeating_interval', 'workout.emom']),
      meta: { line: 1, offset: 0, column: 0 } as any
    });

    const block = strategy.compile([statement], harness.runtime);
    const historyBehavior = block.getBehavior(HistoryBehavior);

    expect(historyBehavior).toBeDefined();
    expect((historyBehavior as any).label).toBe("EMOM");
  });
});
