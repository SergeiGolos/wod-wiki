import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior, ReEntryBehavior, TimerEndingBehavior } from '@/runtime/behaviors';

describe('AmrapBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should initialize timer and unbounded rounds on mount', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const timerCompletion = new TimerEndingBehavior();
    const reEntry = new ReEntryBehavior({ totalRounds: undefined }); // Unbounded

    const block = new MockBlock('amrap-test', [timerInit, timerTick, timerCompletion, reEntry], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized in memory with open span (signals timer started)
    const timerMemory = harness.getMemory('time');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('down');
    expect(timerMemory.durationMs).toBe(10000);
    expect(timerMemory.spans.length).toBe(1);
  });

  it('should allow infinite rounds until timer completes', () => {
    const timerInit = new TimerInitBehavior({ direction: 'down', durationMs: 10000 });
    const timerTick = new TimerTickBehavior();
    const reEntry = new ReEntryBehavior({ totalRounds: undefined }); // Unbounded

    const block = new MockBlock('amrap-test', [timerInit, timerTick, reEntry], { blockType: 'AMRAP' });

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
