import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { UnboundLoopBehavior } from '@/runtime/behaviors/UnboundLoopBehavior';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';

describe('AmrapBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should run infinite rounds until timer expires', () => {
    const timerBehavior = new TimerBehavior('down', 10000, 'AMRAP');
    const loopBehavior = new UnboundLoopBehavior();

    // In a real AMRAP block, there is often a CompletionBehavior that forces Pop on timer:complete
    // But basic AMRAP logic is: Timer runs, Children loop infinitely.

    const block = new MockBlock('amrap-test', [timerBehavior, loopBehavior], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    expect(timerBehavior.isRunning()).toBe(true);

    // Simulate rounds
    // next() on UnboundLoopBehavior typically does nothing or logs round?
    // Let's check UnboundLoopBehavior implementation.
    // If it just allows infinite next calls without popping, that's the behavior we want.

    harness.next(); // Round 1 done
    harness.advanceClock(5000);
    harness.next(); // Round 2 done

    expect(harness.findActions(PopBlockAction)).toHaveLength(0); // Should continue looping

    harness.advanceClock(6000); // 11s total - Timer expired
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(true);

    // Note: To enforce the POP on timer complete, we usually need another behavior (CompletionBehavior)
    // or the TimerBehavior needs to emit an event that the Runtime/Other behaviors handle.
  });
});
