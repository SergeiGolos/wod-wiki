import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { CompletionBehavior } from '../CompletionBehavior';

/**
 * CompletionBehavior Contract Tests (Migrated to Test Harness)
 */
describe('CompletionBehavior Contract', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  describe('Constructor', () => {
    it('should accept a condition function', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition);
      expect(behavior).toBeDefined();
    });

    it('should accept trigger events', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      expect(behavior).toBeDefined();
    });
  });

  describe('onNext()', () => {
    it('should check completion condition', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.next();

      expect(condition).toHaveBeenCalled();
    });

    it('should emit block:complete when condition returns true', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.next();

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });

    it('should NOT emit when condition returns false', () => {
      const condition = () => false;
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      const actions = harness.next();

      expect(harness.wasEventEmitted('block:complete')).toBe(false);
      expect(actions).toEqual([]);
    });

    it('should pass block and now to condition function', () => {
      const condition = vi.fn((blk, now) => {
        expect(blk).toBeDefined();
        expect(now).toBeInstanceOf(Date);
        return false;
      });
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.next();

      expect(condition).toHaveBeenCalled();
    });
  });

  describe('Event-Triggered Completion', () => {
    it('should check condition when trigger event received', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Simulate timer:complete event
      behavior.onEvent({ name: 'timer:complete', timestamp: new Date() }, block);

      expect(condition).toHaveBeenCalled();
    });

    it('should support multiple trigger events', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition, [
        'timer:complete',
        'rounds:complete'
      ]);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      behavior.onEvent({ name: 'timer:complete', timestamp: new Date() }, block);
      behavior.onEvent({ name: 'rounds:complete', timestamp: new Date() }, block);

      expect(condition).toHaveBeenCalledTimes(2);
    });
  });

  describe('Completion Detection Patterns', () => {
    it('should work with reps-based completion', () => {
      const behavior = new CompletionBehavior((blk: any) => {
        const reps = blk.state?.currentReps || 0;
        const target = blk.state?.targetReps || 10;
        return reps >= target;
      });
      const block = new MockBlock('test-block', [behavior], {
        state: { currentReps: 10, targetReps: 10 }
      });

      harness.push(block);
      harness.mount();
      harness.next();

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });

    it('should work with timer-based completion', () => {
      let timerDone = false;
      const behavior = new CompletionBehavior(() => timerDone, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      timerDone = true;
      const actions = behavior.onEvent({ name: 'timer:complete', timestamp: new Date() }, block);
      for (const action of actions) {
        action.do(harness.runtime);
      }

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });
  });
});
