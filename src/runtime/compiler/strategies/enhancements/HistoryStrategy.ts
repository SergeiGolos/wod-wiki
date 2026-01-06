import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../../../utils/metadata";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";

export class HistoryStrategy implements IRuntimeBlockStrategy {
    priority = 20;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        if (builder.hasBehavior(HistoryBehavior)) {
            return;
        }

        const statement = statements[0];
        const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
        const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);

        // We assume Logic strategies have already added a specific HistoryBehavior.
        // If not, we add a generic one.
        // Most blocks should have history.

        // But what label?
        // Let's use the label from the builder if available, but Builder.label is private.
        // BlockBuilder doesn't expose getLabel().
        // We can inspect the fragments.

        let label = "Block";
        const meta: any = { strategyUsed: 'HistoryStrategy' };

        if (timerFragment) {
            label = timerFragment.direction === 'down' ? 'Timer' : 'For Time';
            meta.timerDuration = timerFragment.value;
        }

        if (roundsFragment) {
            label = "Rounds";
            meta.rounds = roundsFragment.value;
        }

        builder.addBehavior(new HistoryBehavior({
            label,
            debugMetadata: createSpanMetadata(
                ['generic_block'],
                meta
            )
        }));
    }
}
