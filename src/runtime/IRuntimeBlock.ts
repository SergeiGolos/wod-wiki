import { BlockKey } from "../BlockKey";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "./EventHandler";
import { IMetricInheritance } from "./IMetricInheritance";
import { IScriptRuntime } from "./IScriptRuntime";
import { IResultSpanBuilder } from "./ResultSpanBuilder";
import { RuntimeMetric } from "./RuntimeMetric";

export interface IRuntimeBlock {
    // Block identity
    readonly key: BlockKey;

    readonly spans: IResultSpanBuilder;

    handlers: EventHandler[];
    metrics: RuntimeMetric[];
    parent?: IRuntimeBlock | undefined;

    // Block implementation
    /**
     * Executes the block logic and returns a list of actions to perform.
     * @param runtime The runtime context in which the block is executed
     * @returns An array of actions to be performed by the runtime
     */
    tick(): IRuntimeEvent[];

    isDone(): boolean;

    reset(): void;
    
    // Metric inheritance
    inherit(): IMetricInheritance[];
}
