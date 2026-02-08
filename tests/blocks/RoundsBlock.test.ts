import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { RoundInitBehavior, RoundAdvanceBehavior, RoundCompletionBehavior } from '@/runtime/behaviors';

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
    const roundInit = new RoundInitBehavior({ totalRounds, startRound: 1 });
    const roundAdvance = new RoundAdvanceBehavior();
    const roundCompletion = new RoundCompletionBehavior();

    const block = new MockBlock('rounds-test', [
      roundInit,
      roundAdvance,
      roundCompletion
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();

    // Block should not be complete on mount
    expect(block.isComplete).toBe(false);
  });

  it('should advance rounds and eventually complete', () => {
    const totalRounds = 3;
    const roundInit = new RoundInitBehavior({ totalRounds, startRound: 1 });
    const roundAdvance = new RoundAdvanceBehavior();
    const roundCompletion = new RoundCompletionBehavior();

    const block = new MockBlock('rounds-test', [
      roundInit,
      roundAdvance,
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
