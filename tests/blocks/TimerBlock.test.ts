import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, TimerCompletionBehavior } from '@/runtime/behaviors';

describe('TimerBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should initialize timer state on mount', () => {
    const timerInit = new TimerInitBehavior({ direction: 'up', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const block = new MockBlock('timer-up', [timerInit, timerTick], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    // Timer state should be initialized in memory with open span (signals timer started)
    const timerMemory = harness.getMemory('timer');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('up');
    expect(timerMemory.spans.length).toBe(1);
    expect(timerMemory.spans[0].ended).toBeUndefined(); // Open span = running
  });

  it('should initialize countdown timer with durationMs', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const timerCompletion = new TimerCompletionBehavior();
    const block = new MockBlock('timer-down', [timerInit, timerTick, timerCompletion], { blockType: 'Timer' });

    harness.push(block);
    harness.mount();

    // Verify timer memory contains correct data (no event emission)
    const timerMemory = harness.getMemory('timer');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('down');
    expect(timerMemory.durationMs).toBe(10000);
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
