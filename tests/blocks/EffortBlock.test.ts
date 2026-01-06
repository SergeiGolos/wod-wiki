import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { EmitEventAction } from '@/runtime/actions/events/EmitEventAction';

describe('EffortBlock (simulated with MockBlock)', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  // Effort blocks typically have a CountUp timer and run once
  it('should start a count-up timer on mount', () => {
    const timerBehavior = new TimerBehavior('up', undefined, 'Effort');
    const block = new MockBlock('effort-test', [timerBehavior], { blockType: 'Effort' });

    harness.push(block);
    harness.mount();

    expect(timerBehavior.isRunning()).toBe(true);
    expect(harness.wasEventEmitted('timer:started')).toBe(true);

    // Timer should be counting up
    harness.advanceClock(5000);
    expect(timerBehavior.getElapsedMs(harness.clock.now)).toBeGreaterThanOrEqual(5000);
  });

  it('should stop timer and record completion on unmount', () => {
    const timerBehavior = new TimerBehavior('up', undefined, 'Effort');
    const block = new MockBlock('effort-test', [timerBehavior], { blockType: 'Effort' });

    harness.push(block);
    harness.mount();

    harness.advanceClock(10000);

    harness.unmount();

    // Timer should be stopped
    expect(timerBehavior.isRunning()).toBe(false);

    // Completion event should be emitted
    const completionEvents = harness.findEvents('timer:complete');
    expect(completionEvents).toHaveLength(1);
    expect(completionEvents[0].data.elapsedMs).toBeGreaterThanOrEqual(10000);
  });
});
