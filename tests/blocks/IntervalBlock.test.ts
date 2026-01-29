import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, RoundInitBehavior, RoundAdvanceBehavior } from '@/runtime/behaviors';

describe('IntervalBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should initialize interval timer and rounds on mount (EMOM behavior)', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 60000 });
    const timerTick = new TimerTickBehavior();
    const roundInit = new RoundInitBehavior({ totalRounds: 10 });
    const roundAdvance = new RoundAdvanceBehavior();

    const block = new MockBlock('interval-test', [timerInit, timerTick, roundInit, roundAdvance], { blockType: 'Interval' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized
    expect(harness.wasEventEmitted('timer:started')).toBe(true);
    
    // Verify timer started with correct duration
    const startedEvent = harness.findEvents('timer:started')[0];
    expect(startedEvent.data.durationMs).toBe(60000);
    expect(startedEvent.data.direction).toBe('down');
  });
});
