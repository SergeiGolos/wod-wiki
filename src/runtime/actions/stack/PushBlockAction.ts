import { IRuntimeAction, IRuntimeBlock, IScriptRuntime } from "@/core";
import { BlockLifecycleOptions } from "@/runtime/contracts";

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

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        if (!runtime.stack) {
            return [];
        }

        try {
            // Block push timing rules:
            // If startTime is explicitly provided in options, use it
            // Otherwise: if clock running → create start time automatically
            // Note: Use options.clock if provided (e.g., SnapshotClock) to maintain timing consistency

            let startTime: Date | undefined = this.options.startTime;
            const clock = this.options.clock ?? runtime.clock;

            if (!startTime && clock?.isRunning) {
                // Clock running → create startTime automatically
                // Uses frozen clock if provided for timing consistency
                startTime = clock.now;
            }

            const lifecycle: BlockLifecycleOptions = startTime
                ? { ...this.options, startTime }
                : { ...this.options };

            const target = this.block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
            if (startTime) {
                target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
            }

            // Push the block onto the stack
            runtime.stack.push(this.block);
            
            // Mount the block with lifecycle options - returns actions to be executed
            return this.block.mount(runtime, lifecycle);

        } catch (error) {
            // Check if runtime has optional setError method
            const runtimeWithSetError = runtime as IScriptRuntime & { setError?: (error: unknown) => void };
            if (typeof runtimeWithSetError.setError === 'function') {
                runtimeWithSetError.setError(error);
            }
            return [];
        }
    }
}
