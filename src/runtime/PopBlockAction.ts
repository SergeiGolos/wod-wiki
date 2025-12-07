import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';
import { NextBlockLogger } from './NextBlockLogger';

/**
 * Action that pops the current block from the runtime stack.
 * Triggers block lifecycle cleanup and allows parent to advance.
 * 
 * Lifecycle:
 * 1. Call block.pop() to get any final actions
 * 2. Pop block from stack
 * 3. Call block.dispose() for behavior cleanup
 * 4. Call block.context.release() for memory cleanup
 * 5. Execute any pop actions returned
 * 6. Call parent block's next() if available
 */
export class PopBlockAction implements IRuntimeAction {
    private _type = 'pop-block';

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

        const currentBlock = runtime.stack.current;
        if (!currentBlock) {
            NextBlockLogger.logValidationFailure('No block to pop from stack');
            return;
        }

        try {
            if (typeof (runtime.stack as any).popWithLifecycle === 'function') {
                (runtime.stack as any).popWithLifecycle();
                return;
            }

            // Fallback for stacks without lifecycle support
            const blockKey = currentBlock.key.toString();
            const depthBefore = runtime.stack.blocks.length;
            NextBlockLogger.logError('pop-block-action', new Error('Pop starting'), {
                blockKey,
                stackDepth: depthBefore
            });

            const unmountActions = currentBlock.unmount(runtime);
            const poppedBlock = runtime.stack.pop();

            if (poppedBlock) {
                poppedBlock.dispose(runtime);
                if (poppedBlock.context && typeof poppedBlock.context.release === 'function') {
                    poppedBlock.context.release();
                }
                for (const action of unmountActions) {
                    action.do(runtime);
                }
                const parentBlock = runtime.stack.current;
                if (parentBlock) {
                    const nextActions = parentBlock.next(runtime);
                    for (const action of nextActions) {
                        action.do(runtime);
                    }
                }
            }
        } catch (error) {
            NextBlockLogger.logError('pop-block-action', error as Error, {
                blockKey: currentBlock.key.toString(),
            });
            if (typeof (runtime as any).setError === 'function') {
                (runtime as any).setError(error);
            }
        }
    }
}
