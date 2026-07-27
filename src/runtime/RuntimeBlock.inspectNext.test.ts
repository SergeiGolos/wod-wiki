import { describe, it, expect } from 'bun:test';
import { RuntimeBlock } from './RuntimeBlock';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { IBehaviorContext } from './contracts/IBehaviorContext';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';

/**
 * A behavior that marks its block complete during onNext with a fixed reason.
 */
class MarkCompleteBehavior implements IRuntimeBehavior {
    onMount(): IRuntimeAction[] { return []; }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.markComplete('test-reason');
        return [];
    }

    onUnmount(): IRuntimeAction[] { return []; }
}

describe('RuntimeBlock.inspectNext', () => {
    it('returns a deterministic completion decision without mutating block state', () => {
        const harness = new BehaviorTestHarness();
        const block = new RuntimeBlock({
            runtime: harness.runtime,
            behaviors: [new MarkCompleteBehavior()],
            blockType: 'TestBlock',
        });

        // Mount so _behaviorContext is available
        block.mount(harness.runtime);

        // Before inspect: block is not complete
        expect(block.isComplete).toBe(false);

        // Inspect what next() would do
        const decision = block.inspectNext(harness.runtime);

        // Decision reflects the behavior chain's intent
        expect(decision.complete).toBe(true);
        expect(decision.reason).toBe('test-reason');
        expect(decision.actions.some(a => a.type === 'pop-block')).toBe(true);

        // After inspect: block state is unchanged (pure read)
        expect(block.isComplete).toBe(false);

        // Dispatch via next() — this time state IS mutated
        block.next(harness.runtime);
        expect(block.isComplete).toBe(true);
    });

    it('returns an empty decision when called before mount', () => {
        const harness = new BehaviorTestHarness();
        const block = new RuntimeBlock({
            runtime: harness.runtime,
            behaviors: [new MarkCompleteBehavior()],
            blockType: 'TestBlock',
        });

        const decision = block.inspectNext(harness.runtime);

        expect(decision.complete).toBe(false);
        expect(decision.actions).toHaveLength(0);
    });
});
