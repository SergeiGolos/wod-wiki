import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { IRuntimeBehavior, IRuntimeBlock, IRuntimeClock, IRuntimeAction } from '@/runtime/contracts';

class TriggerCompleteBehavior implements IRuntimeBehavior {
    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Mark block as complete - stack will pop it during sweep
        block.markComplete('next-triggered');
        return [];
    }
}

describe('Next Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should execute behavior onNext when next() is called and mark block complete', () => {
        const behavior = new TriggerCompleteBehavior();
        const block = new MockBlock('next-test', [behavior]);

        harness.push(block);
        harness.mount();

        harness.next();

        // Block should be marked as complete
        expect(block.isComplete).toBe(true);
    });
});
