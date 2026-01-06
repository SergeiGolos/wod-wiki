import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { BehaviorTestHarness, CapturedAction } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { IRuntimeAction } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';

// Mock Action for testing
class TestAction implements IRuntimeAction {
  constructor(public name: string) {}
  do(_runtime: IScriptRuntime): void {
    // No-op
  }
}

describe('BehaviorTestHarness', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  describe('Initialization', () => {
    it('should initialize with default components', () => {
      expect(harness.clock).toBeDefined();
      expect(harness.runtime).toBeDefined();
      expect(harness.stackDepth).toBe(0);
    });

    it('should set clock time correctly', () => {
      const time = new Date('2025-01-01T10:00:00Z');
      harness.withClock(time);
      expect(harness.clock.now.getTime()).toBe(time.getTime());
    });
  });

  describe('Stack Operations', () => {
    it('should push block to stack', () => {
      const block = new MockBlock('test-block');
      harness.push(block);

      expect(harness.stackDepth).toBe(1);
      expect(harness.currentBlock).toBe(block);
    });

    it('should mount block and capture actions', () => {
      const action = new TestAction('mount-action');
      const block = new MockBlock('test-block');
      block.setMountActions([action]);

      harness.push(block);
      const actions = harness.mount();

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBe(action);

      const captured = harness.capturedActions.filter(c => c.phase === 'mount');
      expect(captured).toHaveLength(1);
      expect(captured[0].action).toBe(action);
    });

    it('should execute next on block and capture actions', () => {
      const action = new TestAction('next-action');
      const block = new MockBlock('test-block');
      block.setNextActions([action]);

      harness.push(block);
      harness.mount();

      const actions = harness.next();

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBe(action);

      const captured = harness.capturedActions.filter(c => c.phase === 'next');
      expect(captured).toHaveLength(1);
      expect(captured[0].action).toBe(action);
    });

    it('should unmount block, capture actions, and pop from stack', () => {
      const action = new TestAction('unmount-action');
      const block = new MockBlock('test-block');
      block.setUnmountActions([action]);

      harness.push(block);
      harness.mount();

      const actions = harness.unmount();

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBe(action);

      const captured = harness.capturedActions.filter(c => c.phase === 'unmount');
      expect(captured).toHaveLength(1);
      expect(captured[0].action).toBe(action);

      expect(harness.stackDepth).toBe(0);
    });
  });

  describe('Time Operations', () => {
    it('should advance clock', () => {
      const start = harness.clock.now.getTime();
      harness.advanceClock(5000);
      expect(harness.clock.now.getTime()).toBe(start + 5000);
    });

    it('should set clock to specific time', () => {
      const newTime = new Date('2026-01-01T00:00:00Z');
      harness.setClock(newTime);
      expect(harness.clock.now.getTime()).toBe(newTime.getTime());
    });
  });

  describe('Event Operations', () => {
    it('should capture emitted events', () => {
      const eventName = 'test:event';
      harness.simulateEvent(eventName, { foo: 'bar' });

      expect(harness.wasEventEmitted(eventName)).toBe(true);

      const events = harness.findEvents(eventName);
      expect(events).toHaveLength(1);
      expect(events[0].data.foo).toBe('bar');
    });

    it('should call handleSpy on event', () => {
      harness.simulateEvent('any:event');
      expect(harness.handleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Operations', () => {
    it('should pre-allocate memory', () => {
      harness.withMemory('test-type', 'test-owner', 123);
      const value = harness.getMemory<number>('test-type', 'test-owner');
      expect(value).toBe(123);
    });

    it('should allocate memory during test', () => {
      harness.allocateMemory('test-type', 'test-owner', 456);
      const value = harness.getMemory<number>('test-type', 'test-owner');
      expect(value).toBe(456);
    });
  });

  describe('Assertions API', () => {
    it('should find actions by type', () => {
      const action = new TestAction('test');
      const block = new MockBlock('test');
      block.setMountActions([action]);

      harness.push(block);
      harness.mount();

      const found = harness.findActions(TestAction);
      expect(found).toHaveLength(1);
      expect(found[0]).toBe(action);
    });

    it('should clear captures', () => {
      harness.simulateEvent('test');
      expect(harness.capturedEvents).toHaveLength(1);

      harness.clearCaptures();
      expect(harness.capturedEvents).toHaveLength(0);
      expect(harness.handleSpy).toHaveBeenCalledTimes(0);
    });
  });
});
