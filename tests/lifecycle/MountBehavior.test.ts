import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerInitBehavior, TimerTickBehavior } from '@/runtime/behaviors';

// Using TimerInitBehavior as a proxy to test lifecycle mounting because it has clear side effects
// (memory allocation).

describe('Mount Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    afterEach(() => {
        harness?.dispose();
    });

    it('should initialize behaviors and set memory on mount', () => {
        const timerInit = new TimerInitBehavior({ direction: 'up' });
        const timerTick = new TimerTickBehavior();
        const block = new MockBlock('mount-test', [timerInit, timerTick]);

        harness.push(block);

        // Check timer memory NOT set yet
        expect(harness.getMemory('time')).toBeUndefined();

        // Mount
        harness.mount();

        // After mount - timer memory should be set with open span
        const timerMemory = harness.getMemory('time');
        expect(timerMemory).toBeDefined();
        expect(timerMemory.direction).toBe('up');
        expect(timerMemory.spans.length).toBe(1);
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
