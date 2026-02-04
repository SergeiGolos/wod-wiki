import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { OutputStatement } from '@/core/models/OutputStatement';
import { TimeSpan } from '../../models/TimeSpan';

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

        // Capture stack level before pop (0-indexed: root = 0)
        const stackLevelBeforePop = runtime.stack.count - 1;

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

        // Emit output statement for the popped block
        this.emitOutputStatement(runtime, popped, stackLevelBeforePop);

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

    /**
     * Emit an output statement for the completed block.
     */
    private emitOutputStatement(runtime: IScriptRuntime, block: IRuntimeBlock, stackLevel: number): void {
        // Build TimeSpan from execution timing
        const startTime = block.executionTiming?.startTime?.getTime() ?? Date.now();
        const endTime = block.executionTiming?.completedAt?.getTime() ?? Date.now();
        const timeSpan = new TimeSpan(startTime, endTime);

        // Get collected fragments from the block (if any)
        const fragments = block.fragments?.flat() ?? [];

        // Create the output statement
        const output = new OutputStatement({
            outputType: 'completion',
            timeSpan,
            sourceBlockKey: block.key.toString(),
            sourceStatementId: block.sourceIds?.[0],
            stackLevel,
            fragments,
            parent: undefined,
            children: [],
        });

        // Store and notify via addOutput
        runtime.addOutput(output);
    }
}
