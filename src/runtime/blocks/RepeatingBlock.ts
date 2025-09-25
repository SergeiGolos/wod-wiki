import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeBlock } from "../RuntimeBlock";
import { IRuntimeBlock } from "../IRuntimeBlock";
import type { TypedMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * Minimal legacy RepeatingBlock used only by tests to demonstrate child execution.
 * It identifies immediate child statements from the script via indentation, and
 * cycles through them for a fixed number of rounds.
 */

export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
    private readonly _loopStateRef?: TypedMemoryReference<{ remainingRounds: number; currentChildIndex: number; childStatements: any[]; }>

    constructor(runtime: IScriptRuntime, metrics: RuntimeMetric[]) {
        super(runtime, metrics);
        new 

    }

}
