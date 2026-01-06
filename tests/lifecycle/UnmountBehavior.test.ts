import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { EmitEventAction } from '@/runtime/actions/events/EmitEventAction';

describe('Unmount Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should execute behavior onPop and dispose when unmounted', () => {
        const timerBehavior = new TimerBehavior('up');
        // Spy on dispose
        let disposed = false;
        // Hack to spy on dispose since TimerBehavior.dispose stops timer
        const originalDispose = timerBehavior.onDispose.bind(timerBehavior);
        (timerBehavior as any).onDispose = (block: any) => {
            disposed = true;
            originalDispose(block);
        };

        const block = new MockBlock('unmount-test', [timerBehavior]);

        harness.push(block);
        harness.mount();

        // Unmount
        harness.unmount();

        // Expect timer to emit complete event (onPop)
        expect(harness.wasEventEmitted('timer:complete')).toBe(true);

        // Expect disposed
        expect(disposed).toBe(true);

        // Expect block removed from stack
        expect(harness.stackDepth).toBe(0);

        // Expect block timing completed
        expect(block.executionTiming.completedAt).toBeDefined();
    });
});
