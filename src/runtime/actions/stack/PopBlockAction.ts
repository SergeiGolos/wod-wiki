import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { ActionPhase, IPhasedAction } from '../ActionPhase';

/**
 * Action that pops the current block from the runtime stack.
 * Delegated to runtime.popBlock().
 * 
 * This action is in the STACK phase, meaning it will be executed
 * after all other phases complete, preventing mid-lifecycle mutations.
 */
export class PopBlockAction implements IPhasedAction {
    readonly phase = ActionPhase.STACK;
    private _type = 'pop-block';

    get type(): string {
        return this._type;
    }

    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        if (!runtime.stack) {
            return;
        }

        const currentBlock = runtime.stack.current;
        if (!currentBlock) {
            return;
        }

        try {
            const completedAt = runtime.clock.now;
            const lifecycle: BlockLifecycleOptions = { completedAt };

            runtime.popBlock(lifecycle);
        } catch (error) {
            // Check if runtime has optional setError method
            const runtimeWithSetError = runtime as IScriptRuntime & { setError?: (error: unknown) => void };
            if (typeof runtimeWithSetError.setError === 'function') {
                runtimeWithSetError.setError(error);
            }
        }
    }
}
