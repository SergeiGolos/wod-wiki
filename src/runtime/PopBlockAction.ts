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
            const blockKey = currentBlock.key.toString();
            const depthBefore = runtime.stack.blocks.length;

            // Log pop start
            NextBlockLogger.logError('pop-block-action', new Error('Pop starting'), {
                blockKey,
                depthBefore
            });

            // 1. Call block's pop() method to get any final actions
            const popActions = currentBlock.pop();

            // 2. Pop the block from the stack
            const poppedBlock = runtime.stack.pop();

            if (poppedBlock) {
                // 3. Call dispose() for behavior cleanup
                poppedBlock.dispose();

                // 4. Call context.release() for memory cleanup
                if (poppedBlock.context && typeof poppedBlock.context.release === 'function') {
                    poppedBlock.context.release();
                }

                const depthAfter = runtime.stack.blocks.length;

                // Log pop completion
                console.log(`✅ PopBlockAction: Popped ${blockKey}, depth ${depthBefore} → ${depthAfter}`);

                // 5. Execute any pop actions returned
                for (const action of popActions) {
                    action.do(runtime);
                }

                // 6. Call parent block's next() if there's a parent
                const parentBlock = runtime.stack.current;
                if (parentBlock) {
                    const nextActions = parentBlock.next();
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
