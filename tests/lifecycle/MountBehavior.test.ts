import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior } from '@/runtime/behaviors';

// Using TimerInitBehavior as a proxy to test lifecycle mounting because it has clear side effects
// and emits events.

describe('Mount Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should initialize behaviors and emit events on mount', () => {
        const timerInit = new TimerInitBehavior({ direction: 'up' });
        const timerTick = new TimerTickBehavior();
        const block = new MockBlock('mount-test', [timerInit, timerTick]);

        harness.push(block);

        // Check event NOT emitted yet
        expect(harness.wasEventEmitted('timer:started')).toBe(false);

        // Mount
        harness.mount();

        // After mount - timer:started should be emitted
        expect(harness.wasEventEmitted('timer:started')).toBe(true);
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
