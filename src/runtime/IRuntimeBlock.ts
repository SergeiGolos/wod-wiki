import { BlockKey } from "../BlockKey";
import { IRuntimeEvent } from "./EventHandler";
import { IRuntimeMemory } from "./memory/IRuntimeMemory";
import { IScriptRuntimeWithMemory } from "./IScriptRuntimeWithMemory";

export interface IRuntimeBlock {
    // Block identity
    readonly key: BlockKey;

    /**
     * Sets the runtime context for this block
     * @param runtime The script runtime with memory support
     */
    setRuntime?(runtime: IScriptRuntimeWithMemory): void;

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     * @param memory The runtime memory system
     * @returns Array of events to emit after push
     */
    push(memory: IRuntimeMemory): IRuntimeEvent[];

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     * @param memory The runtime memory system
     * @returns The next block to execute, or undefined if this block should pop
     */
    next(memory: IRuntimeMemory): IRuntimeBlock | undefined;

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     * @param memory The runtime memory system
     */
    pop(memory: IRuntimeMemory): void;
}
