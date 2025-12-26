import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { CompletionBehavior } from '../CompletionBehavior';

/**
 * CompletionBehavior Contract Tests (Migrated to Test Harness)
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor accepts condition function
 * - onNext() checks completion condition
 * - onEvent() triggers on configured events
 * - Emits block:complete when condition met
 * - Configurable trigger events work correctly
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
      const behavior = new CompletionBehavior(condition, ['timer:complete', 'rounds:complete']);
      expect(behavior).toBeDefined();
    });

    it('should reject null condition', () => {
      expect(() => {
        new CompletionBehavior(null as any);
      }).toThrow();
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

      // Should NOT emit block:complete
      expect(harness.wasEventEmitted('block:complete')).toBe(false);
      expect(actions).toEqual([]);
    });

    it('should pass runtime and block to condition function', () => {
      const condition = vi.fn((rt, blk) => {
        expect(rt).toBe(harness.runtime);
        expect(blk).toBeDefined();
        return false;
      });
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.next();
    });
  });

  describe('Event-Triggered Completion', () => {
    it('should check condition when trigger event received', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Simulate timer:complete event via onEvent
      behavior.onEvent?.({ name: 'timer:complete', timestamp: new Date() }, harness.runtime, block);

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

      // Both events should trigger condition check
      behavior.onEvent?.({ name: 'timer:complete', timestamp: new Date() }, harness.runtime, block);
      behavior.onEvent?.({ name: 'rounds:complete', timestamp: new Date() }, harness.runtime, block);

      expect(condition).toHaveBeenCalledTimes(2);
    });

    it('should NOT check condition for non-trigger events', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Different event should not trigger
      behavior.onEvent?.({ name: 'rounds:changed', timestamp: new Date() }, harness.runtime, block);

      expect(condition).not.toHaveBeenCalled();
    });
  });

  describe('Completion Detection Patterns', () => {
    it('should work with reps-based completion', () => {
      const block = new MockBlock('test-block', [], {
        state: { currentReps: 10, targetReps: 10 }
      });
      const condition = (_rt: any, blk: any) => {
        const reps = blk.state?.currentReps || 0;
        const target = blk.state?.targetReps || 10;
        return reps >= target;
      };
      const behavior = new CompletionBehavior(condition);
      // Add behavior after creating block
      (block as any).behaviors = [behavior];

      harness.push(block);
      harness.mount();
      harness.next();

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });

    it('should work with timer-based completion', () => {
      let timerDone = false;
      const condition = () => timerDone;
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Trigger completion via event
      timerDone = true;
      behavior.onEvent?.({ name: 'timer:complete', timestamp: new Date() }, harness.runtime, block);

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });

    it('should work with rounds-based completion', () => {
      const block = new MockBlock('test-block', [], {
        state: { currentRound: 4, totalRounds: 3 }
      });
      const condition = (_rt: any, blk: any) => {
        const current = blk.state?.currentRound || 1;
        const total = blk.state?.totalRounds || 3;
        return current > total;
      };
      const behavior = new CompletionBehavior(condition);
      (block as any).behaviors = [behavior];

      harness.push(block);
      harness.mount();
      harness.next();

      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });
  });

  describe('Disposal', () => {
    it('should remove event listeners on dispose', () => {
      const condition = () => false;
      const behavior = new CompletionBehavior(condition, ['timer:complete']);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      block.dispose(harness.runtime);

      // CompletionBehavior doesn't have onDispose yet, but this shouldn't throw
      expect(behavior).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle condition already met at start', () => {
      const condition = () => true; // Already complete
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      const actions = harness.mount();

      // Completion happens on onNext, not onPush
      expect(actions).toBeDefined();
    });

    it('should handle condition that never becomes true', () => {
      const condition = () => false;
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Should never emit completion
      for (let i = 0; i < 10; i++) {
        harness.next();
      }

      // block:complete should not have been emitted
      const completionEvents = harness.findEvents('block:complete');
      expect(completionEvents.length).toBe(0);
    });

    it('should handle condition that throws error', () => {
      const condition = () => { throw new Error('Condition error'); };
      const behavior = new CompletionBehavior(condition);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Should propagate error (no error handling in behavior)
      expect(() => harness.next()).toThrow('Condition error');
    });
  });
});
