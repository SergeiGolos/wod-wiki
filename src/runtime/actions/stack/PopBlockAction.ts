import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { NextAction } from './NextAction';
import { RuntimeLogger } from '../../RuntimeLogger';
import { EmitSystemOutputAction } from './EmitSystemOutputAction';

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

        // Forced-pop: if block was NOT marked complete before pop, mark it now.
        // This distinguishes a "clean pop" (next → markComplete → pop) from a
        // "forced pop" (direct pop on an incomplete block, e.g., parent timer expiry).
        // Forced pops still run the full unmount lifecycle so behaviors can report
        // their fragments via onUnmount.
        if (!current.isComplete && typeof current.markComplete === 'function') {
            current.markComplete('forced-pop');
            RuntimeLogger.logPop(current, 'forced-pop (incomplete block popped without next)');
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

        // Log the pop (skip if already logged as forced-pop above)
        if ((popped as any).completionReason !== 'forced-pop') {
            RuntimeLogger.logPop(popped, (popped as any).completionReason);
        }

        // Output statements are emitted by block behaviors (e.g., SegmentOutputBehavior)
        // during onUnmount. PopBlockAction does NOT emit its own
        // output to avoid duplicate 'completion' entries.

        // If a parent block exists, queue a NextAction to notify it of child completion.
        // This decouples the pop and next steps into separate actions, ensuring each
        // lifecycle phase (unmount → next → push) is a distinct action in the ExecutionContext.
        const parent = runtime.stack.current;

        // Emit system output for pop lifecycle event
        const completionReason = (popped as any).completionReason ?? 'normal';
        const systemOutput = new EmitSystemOutputAction(
            `pop: ${popped.label ?? popped.blockType ?? 'Block'} [${popped.key.toString().slice(0, 8)}] reason=${completionReason}`,
            'pop',
            popped.key.toString(),
            popped.label,
            runtime.stack.count,
            { completionReason }
        );

        // Return system output first, then unmount actions, then NextAction for parent.
        // ExecutionContext processes first element first (reverse-push LIFO).
        return parent
            ? [systemOutput, ...unmountActions, new NextAction(lifecycleOptions)]
            : [systemOutput, ...unmountActions];
    }
}
