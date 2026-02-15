import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";

// New aspect-based behaviors
import { HistoryRecordBehavior } from "../../../behaviors";

/**
 * HistoryStrategy adds history recording behavior to blocks.
 * 
 * Uses aspect-based behaviors:
 * - Output: HistoryRecordBehavior
 * 
 * This is a low-priority enhancement that adds history tracking
 * if not already added by a higher-priority strategy.
 */
export class HistoryStrategy implements IRuntimeBlockStrategy {
    priority = 20;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // Skip if history already added by Logic strategy
        if (builder.hasBehavior(HistoryRecordBehavior)) {
            return;
        }

        const statement = statements[0];
        const timerFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Timer
        ) as TimerFragment | undefined;
        const roundsFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Rounds
        ) as RoundsFragment | undefined;

        // Determine block type for history context
        // (label derivation moved to fragment-based system)
        // These checks are retained for reference but no longer assign a local label.
        // The block's label is now derived from its Label fragment.

        // Add history recording behavior
        builder.addBehavior(new HistoryRecordBehavior());
    }
}
