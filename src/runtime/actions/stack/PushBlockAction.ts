import { BlockLifecycleOptions, IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ActionPhase, IPhasedAction } from '../ActionPhase';

/**
 * Action that pushes a compiled block onto the runtime stack.
 * Used by behaviors to add child blocks for execution.
 * 
 * This action is in the STACK phase, meaning it will be executed
 * after all other phases complete, preventing mid-lifecycle mutations.
 */
export class PushBlockAction implements IPhasedAction {
    readonly phase = ActionPhase.STACK;
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
            // This handles wrapping, hooks, tracking, mount(), and stack updates
            runtime.pushBlock(this.block, lifecycle);

        } catch (error) {
            // Check if runtime has optional setError method
            const runtimeWithSetError = runtime as IScriptRuntime & { setError?: (error: unknown) => void };
            if (typeof runtimeWithSetError.setError === 'function') {
                runtimeWithSetError.setError(error);
            }
        }
    }
}
