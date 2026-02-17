import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, ReEntryBehavior } from '@/runtime/behaviors';

describe('IntervalBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should initialize interval timer and rounds on mount (EMOM behavior)', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 60000 });
    const timerTick = new TimerTickBehavior();
    const reEntry = new ReEntryBehavior({ totalRounds: 10 });

    const block = new MockBlock('interval-test', [timerInit, timerTick, reEntry], { blockType: 'Interval' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized in memory (no event emission)
    const timerMemory = harness.getMemory('time');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.durationMs).toBe(60000);
    expect(timerMemory.direction).toBe('down');
  });
});
