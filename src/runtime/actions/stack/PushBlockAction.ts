import { IRuntimeAction } from './contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IScriptRuntime } from './contracts/IScriptRuntime';

/**
 * Action that pushes a compiled block onto the runtime stack.
 * Used by behaviors to add child blocks for execution.
 */
export class PushBlockAction implements IRuntimeAction {
    private _type = 'push-block';

    constructor(public readonly block: IRuntimeBlock, private readonly options: BlockLifecycleOptions = {}) { }

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

        try {
            // Block push timing rules:
            // If startTime is explicitly provided in options, use it
            // Otherwise: if clock running → create start time automatically

            let startTime: Date | undefined = this.options.startTime;

            if (!startTime && runtime.clock?.isRunning) {
                // Clock running → create startTime automatically
                startTime = runtime.clock.now;
            }

            const lifecycle: BlockLifecycleOptions = startTime
                ? { ...this.options, startTime }
                : { ...this.options };

            const target = this.block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
            if (startTime) {
                target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
            }

            // Push the block onto the stack via runtime
            // This handles wrapping, hooks, tracking, and stack updates
            const pushedBlock = runtime.pushBlock(this.block, lifecycle);

            // Call the block's mount() method to get any initial actions
            // Use the pushedBlock to ensure we interact with any wrappers (e.g. spies)
            const mountActions = pushedBlock.mount(runtime, lifecycle);

            // Execute any returned actions
            for (const action of mountActions) {
                action.do(runtime);
            }

        } catch (error) {
            // Check if runtime has optional setError method
            const runtimeWithSetError = runtime as IScriptRuntime & { setError?: (error: unknown) => void };
            if (typeof runtimeWithSetError.setError === 'function') {
                runtimeWithSetError.setError(error);
            }
        }
    }
}
