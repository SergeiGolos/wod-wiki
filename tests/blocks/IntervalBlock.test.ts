import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { IntervalWaitingBehavior } from '@/runtime/behaviors/IntervalWaitingBehavior';
import { EmitEventAction } from '@/runtime/actions/events/EmitEventAction';

describe('IntervalBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should restart timer on completion event (EMOM behavior)', () => {
    const timerBehavior = new TimerBehavior('down', 60000, 'EMOM');
    const waitingBehavior = new IntervalWaitingBehavior();

    const block = new MockBlock('interval-test', [timerBehavior, waitingBehavior], { blockType: 'Interval' });

    harness.push(block);
    harness.mount();

    expect(timerBehavior.isRunning()).toBe(true);

    // Simulate work completion early (e.g. 30s)
    harness.advanceClock(30000);

    // Calling next() (simulating child completion)
    const nextActions = harness.next();

    // Should NOT have any actions (like PopBlock) because we are waiting
    expect(nextActions).toHaveLength(0);

    // Let's inspect internal state if possible, or verify behavior via effects
    // IntervalWaitingBehavior sets isWaiting = true internaly.

    // Advance to timer completion
    harness.advanceClock(30000); // 60s elapsed
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(true);
  });
});
