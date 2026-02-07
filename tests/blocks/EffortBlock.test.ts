import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, DisplayInitBehavior, PopOnNextBehavior } from '@/runtime/behaviors';

describe('EffortBlock (simulated with MockBlock)', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  // Effort blocks typically have a CountUp timer and complete on user advance
  it('should initialize timer state on mount', () => {
    const timerInit = new TimerInitBehavior({ direction: 'up', label: 'Effort' });
    const timerTick = new TimerTickBehavior();
    const displayInit = new DisplayInitBehavior({ mode: 'clock', label: 'Effort' });
    const popOnNext = new PopOnNextBehavior();
    const block = new MockBlock('effort-test', [timerInit, timerTick, displayInit, popOnNext], { blockType: 'Effort' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized in memory (no event emission)
    const timerMemory = harness.getMemory('timer');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('up');
  });

  it('should mark complete on next via PopOnNextBehavior', () => {
    const timerInit = new TimerInitBehavior({ direction: 'up', label: 'Effort' });
    const timerTick = new TimerTickBehavior();
    const popOnNext = new PopOnNextBehavior();
    const block = new MockBlock('effort-test', [timerInit, timerTick, popOnNext], { blockType: 'Effort' });

    harness.push(block);
    harness.mount();

    harness.advanceClock(10000);

    // next() should trigger PopOnNextBehavior to mark block complete
    harness.next();

    expect(block.isComplete).toBe(true);
  });
});
