import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// Specific behaviors not covered by aspect composers
import {
    ReEntryBehavior,
    FragmentPromotionBehavior,
    LabelingBehavior,
    HistoryRecordBehavior,
    ReportOutputBehavior
} from "../../../behaviors";

/**
 * GenericLoopStrategy handles blocks with round/iteration fragments.
 *
 * Uses aspect composer methods:
 * - .asRepeater() - Iteration/round management with completion
 * Plus specific behaviors for display, output, and history.
 */
export class GenericLoopStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        return statements[0].fragments.some(f => f.fragmentType === FragmentType.Rounds);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if round behaviors already added by higher-priority strategy
        if (builder.hasBehavior(ReEntryBehavior)) {
            return;
        }

        const statement = statements[0];
        const roundsFragment = statement.fragments.find(
            f => f.fragmentType === FragmentType.Rounds
        ) as RoundsFragment | undefined;

        if (!roundsFragment) return;

        // Parse rounds value
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;
        }

        // Collect individual RepFragments from the statement to build a rep scheme.
        // The parser creates separate RepFragment instances (e.g., 21-15-9 becomes
        // three RepFragments with values 21, 15, 9) alongside a RoundsFragment.
        const repFragments = statement.fragments
            .filter(f => f.fragmentType === FragmentType.Rep && typeof f.value === 'number')
            .map(f => f.value as number);

        if (repFragments.length > 0) {
            repScheme = repFragments;
            // If rounds weren't explicitly set, infer from rep scheme length
            if (totalRounds <= 1) {
                totalRounds = repScheme.length;
            }
        }

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), (statement as any).exerciseId || '');
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
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Repeater Aspect - rounds with completion
        builder.asRepeater({
            totalRounds,
            startRound: 1,
            addCompletion: true  // Complete when all rounds done
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================
        builder.addBehavior(new LabelingBehavior({
            mode: 'clock',
            label
        }));

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new ReportOutputBehavior({ label }));
        builder.addBehavior(new HistoryRecordBehavior());

        // Promotion Aspect - Share internal state with children
        // Use execution origin to override parser-based text fragments
        builder.addBehavior(new FragmentPromotionBehavior({
            repScheme,
            promotions: [{
                fragmentType: FragmentType.CurrentRound,
                enableDynamicUpdates: true,
                origin: 'execution',
                sourceTag: 'round'
            }]
        }));
    }
}
