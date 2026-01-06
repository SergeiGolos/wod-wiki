import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { IRuntimeAction } from '@/runtime/contracts';

// Using TimerBehavior as a proxy to test lifecycle mounting because it has clear side effects (isRunning)
// and emits events.

describe('Mount Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should initialize behaviors and emit events on mount', () => {
        // NOTE: TimerBehavior._isPaused defaults to false.
        // isRunning() returns !this._isPaused.
        // So a new TimerBehavior() is "Running" by default before mounting if it hasn't bound to state manager?
        // Let's check constructor: _isPaused = false.
        // isRunning checks stateManager.getTimerRef().
        // getTimerRef() tries to find memory in block.context.
        // Before mount (onPush), memory is not allocated.
        // So stateManager.getTimerRef() returns undefined.
        // So isRunning() returns !this._isPaused which is true.

        // This means TimerBehavior is technically "running" (internal state) but not legally bound until onPush.

        // To properly test "Before Mount", we should check if Memory is allocated or if events emitted.

        const timerBehavior = new TimerBehavior('up');
        const block = new MockBlock('mount-test', [timerBehavior]);

        harness.push(block);

        // Check event NOT emitted yet
        expect(harness.wasEventEmitted('timer:started')).toBe(false);

        // Mount
        harness.mount();

        // After mount
        expect(harness.wasEventEmitted('timer:started')).toBe(true);
        expect(timerBehavior.isRunning()).toBe(true);
    });

    it('should set execution start time', () => {
        const block = new MockBlock('mount-test', []);
        harness.push(block);

        const startTime = harness.clock.now;
        harness.mount();

        expect(block.executionTiming.startTime).toBeDefined();
        expect(block.executionTiming.startTime?.getTime()).toBe(startTime.getTime());
    });
});
