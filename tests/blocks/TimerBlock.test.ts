import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, TimerCompletionBehavior } from '@/runtime/behaviors';

describe('TimerBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should initialize timer state on mount', () => {
    const timerInit = new TimerInitBehavior({ direction: 'up', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const block = new MockBlock('timer-up', [timerInit, timerTick], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    // Timer state should be initialized in memory
    expect(harness.wasEventEmitted('timer:started')).toBe(true);
  });

  it('should initialize countdown timer with durationMs', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const timerCompletion = new TimerCompletionBehavior();
    const block = new MockBlock('timer-down', [timerInit, timerTick, timerCompletion], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    expect(harness.wasEventEmitted('timer:started')).toBe(true);
    
    // Verify timer:started event contains correct data
    const startedEvent = harness.findEvents('timer:started')[0];
    expect(startedEvent.data.direction).toBe('down');
    expect(startedEvent.data.durationMs).toBe(10000);
  });

  it('should stop timer on unmount', () => {
     const timerInit = new TimerInitBehavior({ direction: 'up', durationMs: 10000 });
     const timerTick = new TimerTickBehavior();
     const block = new MockBlock('timer-test', [timerInit, timerTick], { blockType: 'Timer' });

     harness.push(block);
     harness.mount();

     harness.advanceClock(10000);
     harness.unmount();

     // After unmount, block should be removed from stack
     expect(harness.stackDepth).toBe(0);
     
     // Block should have completion timing set
     expect(block.executionTiming.completedAt).toBeDefined();
  });
});
