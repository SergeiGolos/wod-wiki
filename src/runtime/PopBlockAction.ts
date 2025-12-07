import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';
import { NextBlockLogger } from './NextBlockLogger';

/**
 * Action that pops the current block from the runtime stack.
 * RuntimeStack.pop() now orchestrates unmount → dispose → context.release → unregister → parent.next.
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
            const blockKey = currentBlock.key.toString();
            NextBlockLogger.logError('pop-block-action', new Error('Pop starting'), {
                blockKey,
                stackDepth: runtime.stack.blocks.length
            });

            runtime.stack.pop();
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
