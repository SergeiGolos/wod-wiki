import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { PopBlockAction } from './PopBlockAction';
import { NextAction } from './NextAction';

/**
 * ClearChildrenAction pops all blocks above a target block on the stack.
 *
 * Used when a parent timer expires (AMRAP/EMOM) and active children must
 * be force-completed and removed. Each child is popped via PopBlockAction
 * so the full lifecycle runs:
 *
 * 1. PopBlockAction checks isComplete → marks 'forced-pop' if not yet complete
 * 2. Unmount fires → SegmentOutputBehavior emits 'completion' with fragments
 * 3. Block is disposed and cleaned up
 *
 * After all children are cleared, a NextAction is queued so the parent
 * block (now on top) receives its next() call, where CompletedBlockPopBehavior
 * can pop it cleanly.
 *
 * ## Example: AMRAP timer expires mid-exercise
 *
 * Stack: [Session, AMRAP, Pullups]
 * Timer fires → ClearChildrenAction(AMRAP.key)
 * → PopBlockAction pops Pullups (forced-pop, fragments reported)
 * → NextAction on AMRAP → CompletedBlockPopBehavior → PopBlockAction
 * → Session receives next(), advances to review
 */
export class ClearChildrenAction implements IRuntimeAction {
    readonly type = 'clear-children';

    constructor(private readonly targetBlockKey: string) { }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        const MAX_ITERATIONS = 20; // Safety limit matching ExecutionContext
        let iterations = 0;

        // Pop all blocks above the target block
        while (iterations < MAX_ITERATIONS) {
            const current = runtime.stack.current;
            if (!current) {
                break;
            }

            // Stop when we reach the target block (don't pop it)
            if (current.key.toString() === this.targetBlockKey) {
                break;
            }

            // Pop this child using standard PopBlockAction lifecycle.
            // PopBlockAction handles forced-pop marking for incomplete blocks.
            // We execute it inline rather than returning it to avoid LIFO
            // ordering issues — children must pop sequentially top-to-bottom.
            const popAction = new PopBlockAction();
            // Execute pop inline — the pop action will handle:
            // - marking incomplete blocks as forced-pop
            // - running unmount lifecycle (fragment emission)
            // - disposing the block
            // We collect any unmount side-effect actions but discard
            // the NextAction that PopBlockAction normally queues (we'll
            // queue our own single NextAction at the end).
            const popResults = popAction.do(runtime);

            // Filter: keep unmount side-effects, drop NextAction
            // (we queue a single NextAction after all children are cleared)
            for (const result of popResults) {
                if (result.type !== 'next') {
                    actions.push(result);
                }
            }

            iterations++;
        }

        if (iterations >= MAX_ITERATIONS) {
            console.error(`[ClearChildrenAction] Max iterations reached, possible infinite loop`);
        }

        // Queue a NextAction so the target block (now on top) gets its next() call.
        // For AMRAP/EMOM, CompletedBlockPopBehavior will fire and pop the parent.
        if (runtime.stack.current?.key.toString() === this.targetBlockKey) {
            actions.push(new NextAction());
        }

        return actions;
    }
}
