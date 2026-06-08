import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { CountupTimerBehavior } from '@/runtime/behaviors';

describe('Unmount Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    afterEach(() => {
        harness?.dispose();
    });

    it('should execute behavior onUnmount and remove from stack when unmounted', () => {
        const timer = new CountupTimerBehavior({ label: 'Test' });
        const block = new MockBlock('unmount-test', [timer]);

        harness.push(block);
        harness.mount();

        // Timer should be initialized in memory
        const timerMemory = harness.getMemory('time');
        expect(timerMemory).toBeDefined();

        // Unmount
        harness.unmount();

        // Expect block removed from stack
        expect(harness.stackDepth).toBe(0);

        // Expect block timing completed
        expect(block.executionTiming.completedAt).toBeDefined();
    });
});
