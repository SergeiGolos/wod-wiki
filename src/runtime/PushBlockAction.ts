import { IRuntimeAction } from './IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';
import { NextBlockLogger } from './NextBlockLogger';

/**
 * Action that pushes a compiled block onto the runtime stack.
 * Used by behaviors to add child blocks for execution.
 */
export class PushBlockAction implements IRuntimeAction {
    private _type = 'push-block';

    constructor(public readonly block: IRuntimeBlock, private readonly options: BlockLifecycleOptions = {}) {}

    get type(): string {
        return this._type;
    }

    set type(value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        if (!runtime.stack) {
            NextBlockLogger.logValidationFailure('No stack available in runtime');
            return;
        }

        try {
            const blockKey = this.block.key.toString();
            const depthBefore = runtime.stack.blocks.length;

            const capture = (runtime as any)?.clock?.captureTimestamp;
            const startTime = typeof capture === 'function'
                ? capture(this.options.startTime)
                : (this.options.startTime ?? { wallTimeMs: Date.now(), monotonicTimeMs: typeof performance !== 'undefined' ? performance.now() : Date.now() });
            const lifecycle: BlockLifecycleOptions = { ...this.options, startTime };

            const target = this.block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
            target.executionTiming = { ...(target.executionTiming ?? {}), startTime };

            // Log push start
            NextBlockLogger.logPushBlockStart(blockKey, depthBefore);
            
            // Push the block onto the stack
            runtime.stack.push(this.block, lifecycle);
            
            // Call the block's mount() method to get any initial actions
            const mountActions = this.block.mount(runtime, lifecycle);
            
            // Execute any returned actions
            for (const action of mountActions) {
                action.do(runtime);
            }
            
            const depthAfter = runtime.stack.blocks.length;

            // Log push completion
            NextBlockLogger.logPushBlockComplete(blockKey, depthAfter, mountActions.length);
        } catch (error) {
            NextBlockLogger.logError('push-block-action', error as Error, {
                blockKey: this.block.key.toString(),
            });
            if (typeof (runtime as any).setError === 'function') {
                (runtime as any).setError(error);
            }
        }
    }
}
