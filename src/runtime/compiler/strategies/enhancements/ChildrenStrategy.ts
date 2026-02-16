import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";

// Specific behaviors not covered by aspect composers
import {
    ChildSelectionBehavior,
    ReEntryBehavior,
    RoundsEndBehavior,
    TimerBehavior,
    TimerEndingBehavior,
    LeafExitBehavior,
    CompletedBlockPopBehavior,
    FragmentPromotionBehavior
} from "../../../behaviors";

/**
 * ChildrenStrategy handles blocks with child statements.
 *
 * Uses aspect composer methods:
 * - .asContainer() - Child execution with optional looping
 * Plus specific behaviors for round management (for single-pass default).
 */
export class ChildrenStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0 &&
            statements[0].children &&
            statements[0].children.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // Skip if children already handled
        if (builder.hasBehavior(ChildSelectionBehavior)) {
            return;
        }

        // children is already number[][] (grouped child statement IDs)
        const children = statements[0].children!;

        // Filter out empty groups
        const childGroups = children.filter(group => group.length > 0);

        // Check if we have a timer (for AMRAP-style unbounded looping)
        const hasTimer = builder.hasBehavior(TimerBehavior);
        // Check if rounds were already set up by another strategy (e.g., GenericLoopStrategy)
        // This indicates multi-round blocks like Annie (50-40-30-20-10) that need child looping
        const hasRoundsFromStrategy = builder.hasBehavior(ReEntryBehavior);
        // Check if a countdown timer controls completion (AMRAP pattern)
        // TimerEndingBehavior is only added for countdown timers with a duration
        const hasCountdownCompletion = builder.hasBehavior(TimerEndingBehavior);

        // Remove LeafExitBehavior if present — children manage advancement,
        // not simple leaf exit.
        if (builder.hasBehavior(LeafExitBehavior)) {
            builder.removeBehavior(LeafExitBehavior);
        }

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Container Aspect - Child execution with optional looping/rest
        const shouldAddLoop = (hasCountdownCompletion || hasRoundsFromStrategy);
        const loopCondition = hasRoundsFromStrategy ? 'rounds-remaining' : 'timer-active';
        const shouldInjectRest = hasCountdownCompletion;

        builder.asContainer({
            childGroups,
            addLoop: shouldAddLoop,
            loopConfig: shouldAddLoop ? { condition: loopCondition } : undefined,
            injectRest: shouldInjectRest,
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // For timer-controlled blocks (AMRAP, EMOM), add CompletedBlockPopBehavior
        // AFTER ChildRunner. When the timer expires and all active children finish,
        // this behavior pops the block. ChildRunner's isComplete check prevents
        // new children from being pushed after timer expiry.
        if (hasCountdownCompletion) {
            builder.addBehavior(new CompletedBlockPopBehavior());
        }

        // Add default round handling if not already present
        if (!builder.hasBehavior(ReEntryBehavior)) {
            if (hasCountdownCompletion) {
                // Countdown timer (AMRAP pattern): unbounded rounds, timer controls completion
                builder.addBehavior(new ReEntryBehavior({
                    totalRounds: undefined, // Unbounded
                    startRound: 1
                }));
                // No RoundsEndBehavior - timer controls completion
            } else {
                // Single pass through children (no timer, or countup "for time" timer)
                builder.addBehavior(new ReEntryBehavior({
                    totalRounds: 1,
                    startRound: 1
                }));
                builder.addBehavior(new RoundsEndBehavior());
            }

            // Promote current round fragment to children (e.g. for display)
            // Explicitly target 'round' tag to get the runtime value, avoiding
            // ambiguity with other fragments (like total rounds or parser hints)
            builder.addBehavior(new FragmentPromotionBehavior({
                promotions: [{
                    fragmentType: FragmentType.CurrentRound,
                    origin: 'execution',
                    enableDynamicUpdates: true,
                    sourceTag: 'round'
                }]
            }));
        }
    }
}
