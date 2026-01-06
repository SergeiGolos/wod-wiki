import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { EmitEventAction } from '@/runtime/actions/events/EmitEventAction';

describe('TimerBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should run a count-up timer', () => {
    const timerBehavior = new TimerBehavior('up', 10000, 'Timer');
    const block = new MockBlock('timer-up', [timerBehavior], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    expect(timerBehavior.isRunning()).toBe(true);
    expect(harness.wasEventEmitted('timer:started')).toBe(true);

    harness.advanceClock(5000);
    expect(timerBehavior.getElapsedMs(harness.clock.now)).toBe(5000);
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(false);

    harness.advanceClock(5000);
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(true);
  });

  it('should run a count-down timer', () => {
    const timerBehavior = new TimerBehavior('down', 10000, 'Timer');
    const block = new MockBlock('timer-down', [timerBehavior], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    expect(timerBehavior.isRunning()).toBe(true);
    expect(timerBehavior.getRemainingMs(harness.clock.now)).toBe(10000);

    harness.advanceClock(5000);
    expect(timerBehavior.getRemainingMs(harness.clock.now)).toBe(5000);
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(false);

    harness.advanceClock(5000);
    expect(timerBehavior.isComplete(harness.clock.now)).toBe(true);
    expect(timerBehavior.getRemainingMs(harness.clock.now)).toBe(0);
  });

  it('should emit timer:complete when unmounted', () => {
     const timerBehavior = new TimerBehavior('up', 10000, 'Timer');
     const block = new MockBlock('timer-test', [timerBehavior], { blockType: 'Timer' });

     harness.push(block);
     harness.mount();

     harness.advanceClock(10000);
     harness.unmount();

     expect(harness.wasEventEmitted('timer:complete')).toBe(true);
     const completeEvent = harness.findEvents('timer:complete')[0];
     expect(completeEvent.data.elapsedMs).toBe(10000);
  });
});
