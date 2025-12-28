import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { BlockLifecycleOptions } from './contracts/IRuntimeBlock';

/**
 * Action that pops the current block from the runtime stack.
 * Delegated to runtime.popBlock().
 */
export class PopBlockAction implements IRuntimeAction {
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
