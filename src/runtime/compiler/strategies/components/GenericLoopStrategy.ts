import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// New aspect-based behaviors
import {
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior,
    RoundOutputBehavior,
    DisplayInitBehavior,
    HistoryRecordBehavior
} from "../../../behaviors";

/**
 * GenericLoopStrategy handles blocks with round/iteration fragments.
 * 
 * Uses aspect-based behaviors:
 * - Iteration: RoundInit, RoundAdvance, RoundCompletion, RoundDisplay
 * - Display: DisplayInit
 * - Output: RoundOutput, HistoryRecord
 */
export class GenericLoopStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        return statements[0].hasFragment(FragmentType.Rounds);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if round behaviors already added by higher-priority strategy
        if (builder.hasBehavior(RoundInitBehavior)) {
            return;
        }

        const statement = statements[0];
        const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);

        if (!roundsFragment) return;

        // Parse rounds value
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
            repScheme = roundsFragment.value as number[];
            totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;
        }

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');
        const label = repScheme ? repScheme.join('-') : `${totalRounds} Rounds`;

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Rounds")
            .setLabel(label)
            .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Rounds");
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Iteration Aspect
        // =====================================================================
        builder.addBehavior(new RoundInitBehavior({
            totalRounds,
            startRound: 1
        }));
        builder.addBehavior(new RoundAdvanceBehavior());
        builder.addBehavior(new RoundCompletionBehavior());

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new DisplayInitBehavior({
            mode: 'clock',
            label
        }));
        builder.addBehavior(new RoundDisplayBehavior());

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new RoundOutputBehavior());
        builder.addBehavior(new HistoryRecordBehavior());
    }
}
