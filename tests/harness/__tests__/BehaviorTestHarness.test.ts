import { describe, it, expect } from 'bun:test';
import { BehaviorTestHarness } from '../index';
import { MockBlock } from '../index';
import { IRuntimeBehavior } from '@/runtime/contracts';
import { IRuntimeAction } from '@/runtime/contracts';
import { IScriptRuntime } from '@/runtime/contracts';

// Simple mock action for testing
class MockAction implements IRuntimeAction {
  constructor(public name: string) {}
  do(runtime: IScriptRuntime): void {
    // No-op
  }
}

describe('BehaviorTestHarness', () => {
  it('should initialize with default clock', () => {
    const harness = new BehaviorTestHarness();
    expect(harness.clock).toBeDefined();
    expect(harness.clock.now).toBeInstanceOf(Date);
  });

  it('should initialize with specific clock time', () => {
    const time = new Date('2024-01-01T10:00:00Z');
    const harness = new BehaviorTestHarness().withClock(time);
    expect(harness.clock.now.getTime()).toBe(time.getTime());
  });

  it('should push blocks to stack', () => {
    const harness = new BehaviorTestHarness();
    const block1 = new MockBlock('1');
    const block2 = new MockBlock('2');

    harness.push(block1);
    expect(harness.stackDepth).toBe(1);
    expect(harness.currentBlock).toBe(block1);

    harness.push(block2);
    expect(harness.stackDepth).toBe(2);
    expect(harness.currentBlock).toBe(block2);
  });

  it('should mount block and capture actions', () => {
    const action = new MockAction('test');
    const behavior: IRuntimeBehavior = {
      onPush: () => [action]
    };

    const harness = new BehaviorTestHarness();
    const block = new MockBlock('test', [behavior]);

    harness.push(block);
    harness.mount();

    expect(harness.capturedActions.length).toBe(1);
    expect(harness.capturedActions[0].action).toBe(action);
    expect(harness.capturedActions[0].phase).toBe('mount');
  });

  it('should unmount block and pop from stack', () => {
    const harness = new BehaviorTestHarness();
    const block = new MockBlock('test');

    harness.push(block);
    expect(harness.stackDepth).toBe(1);

    harness.unmount();
    expect(harness.stackDepth).toBe(0);
    expect(harness.currentBlock).toBeUndefined();
  });

  it('should advance clock', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const harness = new BehaviorTestHarness().withClock(start);

    harness.advanceClock(1000);
    expect(harness.clock.now.getTime()).toBe(start.getTime() + 1000);
  });

  it('should simulate events', () => {
    const harness = new BehaviorTestHarness();

    harness.simulateEvent('test-event', { foo: 'bar' });

    expect(harness.wasEventEmitted('test-event')).toBe(true);
    expect(harness.handleSpy).toHaveBeenCalled();

    const events = harness.findEvents('test-event');
    expect(events[0].data.foo).toBe('bar');
  });

  it('should manage memory', () => {
    const harness = new BehaviorTestHarness();

    harness.allocateMemory('metric', 'test-block', 42);

    const value = harness.getMemory<number>('metric', 'test-block');
    expect(value).toBe(42);

    const missing = harness.getMemory('metric', 'other-block');
    expect(missing).toBeUndefined();
  });

  it('should clear captures', () => {
    const harness = new BehaviorTestHarness();
    harness.simulateEvent('test');

    expect(harness.capturedEvents.length).toBe(1);

    harness.clearCaptures();
    expect(harness.capturedEvents.length).toBe(0);
  });
});
