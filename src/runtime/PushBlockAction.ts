import { IRuntimeAction } from './IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';

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

    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        if (!runtime.stack) {
            return;
        }

        try {
            const blockKey = this.block.key.toString();
            const depthBefore = runtime.stack.blocks.length;

            // Block push timing rules:
            // If startTime is explicitly provided in options, use it (preserves existing behavior)
            // Otherwise apply new timing rules:
            // 1. If clock running → create start time automatically
            // 2. If clock not running AND block has startTime → start clock
            // 3. If clock not running AND no startTime → leave clock stopped, no startTime
            
            const capture = (runtime as any)?.clock?.captureTimestamp;
            let startTime: any;
            
            if (this.options.startTime) {
                // Explicit startTime provided - use it as-is (backward compatibility)
                startTime = typeof capture === 'function'
                    ? capture.call(runtime.clock, this.options.startTime)
                    : this.options.startTime;
            } else {
                // No explicit startTime - apply timing rules
                const isClockRunning = runtime.clock?.isRunning ?? false;
                
                if (isClockRunning) {
                    // Clock running → create startTime automatically
                    startTime = typeof capture === 'function'
                        ? capture.call(runtime.clock)
                        : { wallTimeMs: Date.now(), monotonicTimeMs: typeof performance !== 'undefined' ? performance.now() : Date.now() };
                } else {
                    // Clock not running, no startTime provided → don't create startTime
                    startTime = undefined;
                }
            }
            
            const lifecycle: BlockLifecycleOptions = startTime ? { ...this.options, startTime } : { ...this.options };

            const target = this.block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
            if (startTime) {
                target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
            }

            // Push the block onto the stack
            runtime.stack.push(this.block, lifecycle);
            
            // Call the block's mount() method to get any initial actions
            const mountActions = this.block.mount(runtime, lifecycle);
            
            // Execute any returned actions
            for (const action of mountActions) {
                action.do(runtime);
            }
            
            const depthAfter = runtime.stack.blocks.length;
        } catch (error) {
            if (typeof (runtime as any).setError === 'function') {
                (runtime as any).setError(error);
            }
        }
    }
}
