import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { NextAction } from './NextAction';

/**
 * Action that pops the current block from the runtime stack.
 * Handles the full lifecycle: unmount, pop, dispose, emit output.
 * 
 * Returns unmount actions followed by a NextAction for the parent,
 * decoupling the pop and next phases into distinct actions processed
 * by the ExecutionContext.
 */
export class PopBlockAction implements IRuntimeAction {
    readonly type = 'pop-block';

    constructor(private readonly options: BlockLifecycleOptions = {}) { }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        const current = runtime.stack.current;
        if (!current) {
            return [];
        }

        // Set completedAt time if not provided
        const completedAt = this.options.completedAt ?? runtime.clock.now;
        const lifecycleOptions: BlockLifecycleOptions = { ...this.options, completedAt };

        // Update block's execution timing
        if (current.executionTiming) {
            current.executionTiming.completedAt = completedAt;
        }

        // Get unmount actions from the block
        const unmountActions = current.unmount(runtime, lifecycleOptions) ?? [];

        // Pop from stack
        const popped = runtime.stack.pop();
        if (!popped) {
            return [];
        }

        // Dispose and cleanup
        popped.dispose(runtime);
        popped.context?.release?.();

        // Output statements are emitted by block behaviors (e.g., TimerOutputBehavior,
        // SegmentOutputBehavior) during onUnmount. PopBlockAction does NOT emit its own
        // output to avoid duplicate 'completion' entries.

        // If a parent block exists, queue a NextAction to notify it of child completion.
        // This decouples the pop and next steps into separate actions, ensuring each
        // lifecycle phase (unmount → next → push) is a distinct action in the ExecutionContext.
        const parent = runtime.stack.current;

        // Return unmount actions first, then a NextAction for the parent (if any).
        // ExecutionContext reverse-pushes returned arrays so first element executes first:
        // unmount effects run before parent advancement.
        return parent
            ? [...unmountActions, new NextAction(lifecycleOptions)]
            : unmountActions;
    }
}
