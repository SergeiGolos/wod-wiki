import { ICodeStatement } from "@/core/models/CodeStatement";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BlockBuilder } from "../compiler/BlockBuilder";

export interface IRuntimeBlockStrategy {
    /**
     * Execution priority. Higher values run first.
     * Suggested ranges:
     * - Logic/Drivers: 90-100 (e.g. Interval, AMRAP)
     * - Components: 50-80 (e.g. Timer, Loop)
     * - Enhancements: 20-40 (e.g. Sound, History)
     * - Fallback: 0 (e.g. Effort)
     */
    priority: number;

    /**
     * Checks if this strategy applies to the given statement.
     */
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;

    /**
     * Applies this strategy to the block builder.
     * Note: This replaces `compile`. The builder accumulates state.
     */
    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void;

    /**
     * Legacy method for backward compatibility during migration.
     * @deprecated
     */
    compile?(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock;
}
