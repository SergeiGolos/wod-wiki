import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { ReportOutputBehavior } from "../../../behaviors";

/**
 * ReportOutputStrategy adds output reporting behavior to blocks.
 *
 * Uses aspect-based behaviors:
 * - Output: ReportOutputBehavior
 *
 * This is a low-priority enhancement (Priority 15) that adds segment
 * and milestone reporting if not already added. By running with a low
 * priority, it ensures the behavior is added AFTER child selection and
 * round management behaviors, so that round advancement occurs before
 * milestone emission in the onNext chain.
 */
export class ReportOutputStrategy implements IRuntimeBlockStrategy {
    priority = 15;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0;
    }

    apply(builder: BlockBuilder, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // Skip if already added by a Logic strategy (for special config)
        if (builder.hasBehavior(ReportOutputBehavior)) {
            return;
        }

        // Add standard report output behavior. 
        // It will automatically pick up the block's label for output.
        builder.addBehavior(new ReportOutputBehavior());
    }
}
