import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import type { IRuntimeContext } from '../../contracts/IRuntimeContext';

/**
 * Action that aborts the current session by force-popping all blocks from the stack.
 *
 * Unlike PopBlockAction (which pops one block and calls parent.next()), AbortSessionAction
 * drains the entire stack without triggering parent advancement or pushing new children.
 *
 * Each block receives the full lifecycle:
 *  1. markComplete('user-abort') — marks the block as intentionally terminated
 *  2. unmount() — runs behaviors (e.g. ReportOutputBehavior) which write result memory
 *  3. stack.pop() — triggers emitSegmentFromResultMemory in ScriptRuntime, the sole
 *     site that turns a pop into a 'segment' OutputStatement
 *  4. dispose() — releases block resources
 *
 * This ensures every aborted block still gets a well-formed 'segment' output
 * (checked by assertPairedOutputs() in tests).
 */
export class AbortSessionAction implements IRuntimeAction {
    readonly type = 'abort-session';

    do(runtime: IRuntimeContext): IRuntimeAction[] {
        const MAX_ITERATIONS = 100; // Safety limit to prevent infinite loops
        let iterations = 0;
        const collectedActions: IRuntimeAction[] = [];

        while (iterations < MAX_ITERATIONS && runtime.stack.count > 0) {
            const current = runtime.stack.current;
            if (!current) break;

            // Mark block as complete before unmounting so behaviors know it's intentionally ended
            if (!current.isComplete && typeof current.markComplete === 'function') {
                current.markComplete('user-abort');
            }

            // Unmount runs ReportOutputBehavior.onUnmount(), which writes result memory
            // (elapsed/spans/round) that the later stack.pop() reads to build the 'segment'
            // output. Filter out 'emit-event' actions to prevent cascading timer:complete /
            // timer:stop events from triggering further block transitions during the abort drain.
            const unmountActions = current.unmount(runtime, { createdAt: runtime.clock.currentDate }) ?? [];
            const safeActions = unmountActions.filter(a => a.type !== 'emit-event');
            collectedActions.push(...safeActions);

            // Pop from stack — triggers ScriptRuntime's stack subscription which calls
            // emitSegmentOutputFromResultMemory() to emit the 'segment' output.
            const popped = runtime.stack.pop();
            if (!popped) break;

            // Release resources
            popped.dispose(runtime);
            popped.context?.release?.();

            iterations++;
        }

        // Return safe cleanup actions (handler unregistrations, etc.) for the ExecutionContext
        // to process after the stack has been drained.
        return collectedActions;
    }
}
