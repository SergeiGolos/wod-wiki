import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';
import { BlockLifecycleOptions } from './IRuntimeBlock';

/**
 * Action that pops the current block from the runtime stack.
 * RuntimeStack.pop() now orchestrates unmount → dispose → context.release → unregister → parent.next.
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
            const capture = (runtime as any)?.clock?.captureTimestamp;
            const completedAt = typeof capture === 'function'
                ? capture.call(runtime.clock)  // Fix: bind 'this' context
                : { wallTimeMs: Date.now(), monotonicTimeMs: typeof performance !== 'undefined' ? performance.now() : Date.now() };
            const lifecycle: BlockLifecycleOptions = { completedAt };

            runtime.stack.pop(lifecycle);
        } catch (error) {
            if (typeof (runtime as any).setError === 'function') {
                (runtime as any).setError(error);
            }
        }
    }
}
