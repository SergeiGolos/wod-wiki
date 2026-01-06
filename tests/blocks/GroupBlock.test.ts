import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { SinglePassBehavior } from '@/runtime/behaviors/SinglePassBehavior';
import { RoundPerNextBehavior } from '@/runtime/behaviors/RoundPerNextBehavior';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';

describe('GroupBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should run children in sequence once', () => {
    // GroupBlock typically uses SinglePassBehavior + RoundPerNextBehavior
    const passBehavior = new SinglePassBehavior();
    const roundBehavior = new RoundPerNextBehavior();
    const block = new MockBlock('group-test', [passBehavior, roundBehavior], { blockType: 'Group' });

    harness.push(block);
    harness.mount(); // Round initialized to 1

    expect(roundBehavior.getRound()).toBe(1);

    // MockBlock behaviors are executed in order.
    // If [passBehavior, roundBehavior]:
    // 1. passBehavior.onNext() runs. Check round. Round is 1. (1 < 2). Returns [].
    // 2. roundBehavior.onNext() runs. Round becomes 2. Returns [].

    // next() returns combined actions.

    harness.next(); // First next
    expect(roundBehavior.getRound()).toBe(2);
    expect(harness.findActions(PopBlockAction)).toHaveLength(0); // Because PassBehavior ran BEFORE Round update

    // harness.next() again?
    harness.clearCaptures();
    harness.next(); // Second next
    // 1. passBehavior.onNext() runs. Check round. Round is 2. (2 >= 2). Returns [PopBlockAction].
    // 2. roundBehavior.onNext() runs. Round becomes 3.

    expect(harness.findActions(PopBlockAction)).toHaveLength(1);
  });

  it('should pop immediately if behaviors are ordered correctly', () => {
      // If we put RoundBehavior FIRST, it might work in one next?
      // [roundBehavior, passBehavior]
      // 1. roundBehavior.onNext(). Round -> 2.
      // 2. passBehavior.onNext(). Check round. 2 >= 2. Returns Pop.

    const passBehavior = new SinglePassBehavior();
    const roundBehavior = new RoundPerNextBehavior();
    const block = new MockBlock('group-test-ordered', [roundBehavior, passBehavior], { blockType: 'Group' });

    harness.push(block);
    harness.mount();

    harness.next();

    expect(harness.findActions(PopBlockAction)).toHaveLength(1);
  });
});
