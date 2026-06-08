import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { CountdownTimerBehavior, ReEntryBehavior } from '@/runtime/behaviors';

describe('AmrapBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should initialize countdown timer and round state on mount', () => {
    const timer = new CountdownTimerBehavior({ direction: 'down', durationMs: 10000 });
    const reEntry = new ReEntryBehavior({ totalRounds: undefined, startRound: 1 });

    const block = new MockBlock('amrap-test', [timer, reEntry], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    // Timer should be initialized in memory with countdown direction
    const timerMemory = harness.getMemory('time');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('down');
    expect(timerMemory.durationMs).toBe(10000);
    expect(timerMemory.spans.length).toBe(1);

    // Round state should be initialized (unbounded)
    const roundMemory = harness.getMemory('round');
    expect(roundMemory).toBeDefined();
    expect(roundMemory.current).toBe(1);
    expect(roundMemory.total).toBeUndefined();
  });

  it('should not auto-complete on next() — timer controls completion', () => {
    const timer = new CountdownTimerBehavior({ direction: 'down', durationMs: 10000 });
    const reEntry = new ReEntryBehavior({ totalRounds: undefined, startRound: 1 });

    const block = new MockBlock('amrap-test', [timer, reEntry], { blockType: 'AMRAP' });

    harness.push(block);
    harness.mount();

    // Simulate rounds - AMRAP should not complete from next()
    harness.next();
    harness.next();
    harness.next();

    // Block should not be complete - timer controls completion, not rounds
    expect(block.isComplete).toBe(false);
  });
});
