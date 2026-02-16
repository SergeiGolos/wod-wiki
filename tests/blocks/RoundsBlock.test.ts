import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { ReEntryBehavior, RoundCompletionBehavior } from '@/runtime/behaviors';

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
    const roundCompletion = new RoundCompletionBehavior();

    const block = new MockBlock('rounds-test', [
      reEntry,
      roundCompletion
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();

    // Block should not be complete on mount
    expect(block.isComplete).toBe(false);
  });

  it('should advance rounds and eventually complete', () => {
    const totalRounds = 3;
    const reEntry = new ReEntryBehavior({ totalRounds, startRound: 1 });
    const roundCompletion = new RoundCompletionBehavior();

    const block = new MockBlock('rounds-test', [
      reEntry,
      roundCompletion
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();

    // Round 1 -> 2
    harness.next();
    expect(block.isComplete).toBe(false);

    // Round 2 -> 3
    harness.next();
    expect(block.isComplete).toBe(false);

    // Round 3 -> 4 (exceeds total, marks complete)
    harness.next();
    expect(block.isComplete).toBe(true);
  });
});
