import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { PopOnNextBehavior, DisplayInitBehavior, HistoryRecordBehavior } from '@/runtime/behaviors';

describe('GroupBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should initialize display state on mount', () => {
    const displayInit = new DisplayInitBehavior({ mode: 'clock', label: 'Group' });
    const historyRecord = new HistoryRecordBehavior();
    const block = new MockBlock('group-test', [displayInit, historyRecord], { blockType: 'Group' });

    harness.push(block);
    harness.mount();

    // Group blocks typically just set up display state
    expect(block.isComplete).toBe(false);
  });

  it('should mark complete on next with PopOnNextBehavior', () => {
    const popOnNext = new PopOnNextBehavior();
    const displayInit = new DisplayInitBehavior({ mode: 'clock', label: 'Group' });
    const block = new MockBlock('group-test-single', [displayInit, popOnNext], { blockType: 'Group' });

    harness.push(block);
    harness.mount();

    // next() should mark block complete via PopOnNextBehavior
    harness.next();

    expect(block.isComplete).toBe(true);
  });
});
