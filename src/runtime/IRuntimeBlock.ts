import { BlockKey } from "../BlockKey";
import { EventHandler, IRuntimeEvent } from "./EventHandler";
import { IMetricInheritance } from "./IMetricInheritance";
import { IResultSpanBuilder } from "./ResultSpanBuilder";
import { RuntimeMetric } from "./RuntimeMetric";
import { IScriptRuntimeWithMemory } from "./IScriptRuntimeWithMemory";

export interface IRuntimeBlock {
    // Block identity
    readonly key: BlockKey;

    // Core implementation - all state is now stored in memory
    /**
     * Sets the runtime context for this block. Called when block is pushed to stack.
     * All blocks must now use memory for state storage instead of instance variables.
     */
    setRuntime(runtime: IScriptRuntimeWithMemory): void;

    /**
     * Gets the result spans builder from memory
     */
    getSpans(): IResultSpanBuilder;

    /**
     * Gets the event handlers from memory
     */
    getHandlers(): EventHandler[];

    /**
     * Gets the metrics (may still be passed during construction)
     */
    getMetrics(): RuntimeMetric[];

    /**
     * Gets the parent block reference from memory
     */
    getParent(): IRuntimeBlock | undefined;

    /**
     * Executes the block logic and returns a list of actions to perform.
     * @param runtime The runtime context in which the block is executed
     * @returns An array of actions to be performed by the runtime
     */
    tick(): IRuntimeEvent[];

    isDone(): boolean;

    reset(): void;
    
    /**
     * Clean up memory allocated by this block
     */
    cleanupMemory(): void;
    
    // Metric inheritance
    inherit(): IMetricInheritance[];
}
