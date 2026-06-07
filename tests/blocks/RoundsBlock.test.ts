import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { ReEntryBehavior, RoundsEndBehavior } from '@/runtime/behaviors';
import { CurrentRoundMetric } from '@/runtime/compiler/metrics/CurrentRoundMetric';

describe('RoundsBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should initialize round state on mount', () => {
    const totalRounds = 3;
    const reEntry = new ReEntryBehavior({ totalRounds, startRound: 1 });
    const roundsEnd = new RoundsEndBehavior();

    const block = new MockBlock('rounds-test', [
      reEntry,
      roundsEnd
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();

    // Block should not be complete on mount
    expect(block.isComplete).toBe(false);

    // Round state should be initialized
    const roundMemory = harness.getMemory('round');
    expect(roundMemory).toBeDefined();
    expect(roundMemory.current).toBe(1);
    expect(roundMemory.total).toBe(3);
  });

  it('should complete when rounds are exhausted', () => {
    const totalRounds = 3;
    const reEntry = new ReEntryBehavior({ totalRounds, startRound: 1 });
    const roundsEnd = new RoundsEndBehavior();

    const block = new MockBlock('rounds-test', [
      reEntry,
      roundsEnd
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();
    // Manually advance round memory past total to simulate round exhaustion
    // (In production, ChildSelectionBehavior handles round advancement)
    block.behaviorContext!.updateMemory('round', [
      new CurrentRoundMetric(4, totalRounds, block.key.toString(), harness.clock.currentDate)
    ]);

    // RoundsEndBehavior safety net should catch the overshoot
    harness.next();
    expect(block.isComplete).toBe(true);
  });
});
