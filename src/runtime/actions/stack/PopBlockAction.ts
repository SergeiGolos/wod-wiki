import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';

/**
 * Action that pops the current block from the runtime stack.
 * Handles the full lifecycle: unmount, pop, dispose, emit output.
 * 
 * Used by the runtime to properly manage block lifecycle when completing
 * or transitioning between blocks.
 */
export class PopBlockAction implements IRuntimeAction {
    readonly type = 'pop-block';

    constructor(private readonly options: BlockLifecycleOptions = {}) { }

    do(runtime: IScriptRuntime): void {
        const current = runtime.stack.current;
        if (!current) {
            return;
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
            return;
        }

        // Execute unmount actions
        for (const action of unmountActions) {
            runtime.do(action);
        }

        // Dispose and cleanup
        popped.dispose(runtime);
        popped.context?.release?.();

        // Output statements are emitted by block behaviors (e.g., TimerOutputBehavior,
        // SegmentOutputBehavior) during onUnmount. PopBlockAction does NOT emit its own
        // output to avoid duplicate 'completion' entries.

        // Notify parent of child completion via next() with the lifecycle options
        // This passes completedAt to the parent so it can track child completion times
        const parent = runtime.stack.current;
        if (parent) {
            const nextActions = parent.next(runtime, lifecycleOptions);
            for (const action of nextActions) {
                runtime.do(action);
            }
        }
    }
}
