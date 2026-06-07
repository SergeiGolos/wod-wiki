import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { CountdownTimerBehavior, ReEntryBehavior } from '@/runtime/behaviors';

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
    const timer = new CountdownTimerBehavior({ direction: 'down', durationMs: 60000, mode: 'reset-interval' });
    const reEntry = new ReEntryBehavior({ totalRounds: 10, startRound: 1 });

    const block = new MockBlock('interval-test', [timer, reEntry], { blockType: 'Interval' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized in memory
    const timerMemory = harness.getMemory('time');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.durationMs).toBe(60000);
    expect(timerMemory.direction).toBe('down');

    // Round state should be initialized
    const roundMemory = harness.getMemory('round');
    expect(roundMemory).toBeDefined();
    expect(roundMemory.current).toBe(1);
    expect(roundMemory.total).toBe(10);
  });
});
