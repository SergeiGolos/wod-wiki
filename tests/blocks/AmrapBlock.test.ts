import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, RoundInitBehavior, RoundAdvanceBehavior, TimerCompletionBehavior } from '@/runtime/behaviors';

describe('AmrapBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should initialize timer and unbounded rounds on mount', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const timerCompletion = new TimerCompletionBehavior();
    const roundInit = new RoundInitBehavior({ totalRounds: undefined }); // Unbounded
    const roundAdvance = new RoundAdvanceBehavior();

    const block = new MockBlock('amrap-test', [timerInit, timerTick, timerCompletion, roundInit, roundAdvance], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized and running
    expect(harness.wasEventEmitted('timer:started')).toBe(true);
    
    const startedEvent = harness.findEvents('timer:started')[0];
    expect(startedEvent.data.direction).toBe('down');
    expect(startedEvent.data.durationMs).toBe(10000);
  });

  it('should allow infinite rounds until timer completes', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const roundInit = new RoundInitBehavior({ totalRounds: undefined }); // Unbounded
    const roundAdvance = new RoundAdvanceBehavior();

    const block = new MockBlock('amrap-test', [timerInit, timerTick, roundInit, roundAdvance], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    // Simulate rounds - AMRAP should not complete from rounds
    harness.next(); // Round 1 done
    harness.next(); // Round 2 done
    harness.next(); // Round 3 done

    // Block should not be complete - unbounded rounds don't mark complete
    expect(block.isComplete).toBe(false);
  });
});
