import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { MockBlock } from '@/testing/harness/MockBlock';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';
import { IRuntimeBehavior, IRuntimeBlock, IRuntimeClock, IRuntimeAction } from '@/runtime/contracts';

class TriggerNextBehavior implements IRuntimeBehavior {
    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [new PopBlockAction()];
    }
}

describe('Next Lifecycle', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should execute behavior onNext when next() is called', () => {
        const behavior = new TriggerNextBehavior();
        const block = new MockBlock('next-test', [behavior]);

        harness.push(block);
        harness.mount();

        const actions = harness.next();

        expect(actions).toHaveLength(1);
        expect(actions[0]).toBeInstanceOf(PopBlockAction);
        expect(harness.findActions(PopBlockAction)).toHaveLength(1);
    });
});
