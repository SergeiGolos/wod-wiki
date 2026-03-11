import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricPromotionBehavior } from "../../../behaviors/MetricPromotionBehavior";

// Specific behaviors not covered by aspect composers
import {
    ChildSelectionBehavior,
    CountdownTimerBehavior,
    ExitBehavior,
} from "../../../behaviors";

/**
 * ChildrenStrategy handles blocks with child statements.
 *
 * Uses aspect composer methods:
 * - .asRepeater() - Stores round config for ChildSelectionBehavior
 * - .asContainer() - Child execution with optional looping (consumes round config)
 * Plus ExitBehavior in deferred mode for container completion pop.
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

        // Check if rounds were already set up by another strategy (e.g., GenericLoopStrategy)
        // This indicates multi-round blocks like Annie (50-40-30-20-10) that need child looping
        const hasRoundsFromStrategy = builder.hasRoundConfig();
        // Check if a countdown timer controls completion (AMRAP/EMOM pattern)
        const countdown = builder.getBehavior(CountdownTimerBehavior);
        const hasCountdownCompletion = !!countdown;

        // Remove ExitBehavior if present — children manage advancement,
        // not simple leaf exit. (Was: removeBehavior(LeafExitBehavior))
        if (builder.hasBehavior(ExitBehavior)) {
            builder.removeBehavior(ExitBehavior);
        }

        // =====================================================================
        // Round config — must be stored BEFORE asContainer() consumes it
        // =====================================================================
        if (!hasRoundsFromStrategy) {
            if (hasCountdownCompletion) {
                // Countdown timer (AMRAP pattern): unbounded rounds, timer controls completion
                builder.asRepeater({ totalRounds: undefined, startRound: 1, addCompletion: false });
            } else {
                // Single pass through children (no timer, or countup "for time" timer)
                builder.asRepeater({ totalRounds: 1, startRound: 1, addCompletion: true });
            }
        }

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Container Aspect - Child execution with optional looping/rest.
        // asContainer() picks up the pending round config from asRepeater() above
        // and injects startRound/totalRounds into ChildSelectionBehavior.
        const shouldAddLoop = (hasCountdownCompletion || hasRoundsFromStrategy);
        const loopCondition = hasRoundsFromStrategy ? 'rounds-remaining' : 'timer-active';

        // Only inject rest for interval-based countdowns (EMOM).
        // For block-capping countdowns (AMRAP), rounds should restart immediately.
        const shouldInjectRest = hasCountdownCompletion && countdown?.config.mode === 'reset-interval';

        builder.asContainer({
            childGroups,
            addLoop: shouldAddLoop,
            loopConfig: shouldAddLoop ? { condition: loopCondition } : undefined,
            injectRest: shouldInjectRest,
        });

        // =====================================================================
        // Completion Aspect — deferred exit for all container blocks.
        // Fires on next() only once block.isComplete is set externally
        // (timer expiry, rounds exhausted). Replaces CompletedBlockPopBehavior.
        // =====================================================================
        builder.addBehavior(new ExitBehavior({ mode: 'deferred' }));

        // =====================================================================
        // Promotion ordering fix — MetricPromotionBehavior must run AFTER
        // ChildSelectionBehavior in onNext so it sees the round that
        // ChildSelectionBehavior just advanced via advanceRound().
        //
        // GenericLoopStrategy adds MetricPromotionBehavior before this strategy
        // runs, so it would execute before ChildSelectionBehavior.onNext. We
        // remove and re-add it here to move it to the end of the Map (Map
        // preserves insertion order; delete + re-add puts the key last).
        // =====================================================================
        const promotionBehavior = builder.getBehavior(MetricPromotionBehavior);
        if (promotionBehavior) {
            builder.removeBehavior(MetricPromotionBehavior);
            builder.addBehavior(promotionBehavior);
        }
    }
}
