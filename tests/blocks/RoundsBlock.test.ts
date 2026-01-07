import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { BoundLoopBehavior } from '@/runtime/behaviors/BoundLoopBehavior';
import { RoundPerNextBehavior } from '@/runtime/behaviors/RoundPerNextBehavior';
import { TrackRoundAction } from '@/runtime/actions/tracking/TrackRoundAction';

describe('RoundsBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should execute for specified number of rounds', () => {
    const totalRounds = 3;
    const roundBehavior = new RoundPerNextBehavior();
    const loopBehavior = new BoundLoopBehavior(totalRounds);

    // Typically Rounds block needs both behaviors
    const block = new MockBlock('rounds-test', [
      roundBehavior, // Updates round count
      loopBehavior   // Checks round count and marks complete
    ], { blockType: 'Rounds' });

    harness.push(block);
    harness.mount();

    // Round 1
    expect(roundBehavior.getRound()).toBe(1);

    // Simulate next() - End of Round 1
    // RoundPerNext increments to 2
    // BoundLoop checks round 2. 2 <= 3. Continues.
    let actions = harness.next();
    expect(roundBehavior.getRound()).toBe(2);
    expect(block.isComplete).toBe(false);
    expect(harness.findActions(TrackRoundAction)).toHaveLength(1); // Tracks round 2
    harness.clearCaptures();

    // Simulate next() - End of Round 2
    // RoundPerNext increments to 3
    // BoundLoop checks round 3. 3 <= 3. Continues.
    actions = harness.next();
    expect(roundBehavior.getRound()).toBe(3);
    expect(block.isComplete).toBe(false);
    harness.clearCaptures();

    // Simulate next() - End of Round 3
    // RoundPerNext increments to 4
    // BoundLoop checks round 4. 4 > 3. Marks complete.
    actions = harness.next();
    expect(roundBehavior.getRound()).toBe(4);

    expect(block.isComplete).toBe(true);
  });
});
