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

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if children already handled
        if (builder.hasBehavior(ChildSelectionBehavior)) {
            return;
        }

        // children is already number[][] (grouped child statement IDs)
        const children = statements[0].children!;

        // Filter out empty groups
        let childGroups = children.filter(group => group.length > 0);

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

        // For non-interval blocks (no injectRest), filter out child groups whose
        // statement IDs are already covered as grandchildren of other child groups.
        // Example: "21-15-9 For Time\n  3:00 AMRAP\n    10 Pushups" parses the
        // AMRAP (id=2) and Pushups (id=3) both as children of the For Time, but
        // Pushups is also a child of the AMRAP.  Without filtering, the For Time
        // dispatches the Pushups block directly after the AMRAP expires instead of
        // launching a fresh AMRAP for the next round.
        // EMOM blocks keep all groups because the interval-timer subscription
        // (timer:complete/bubble) drives round advancement independently.
        if (!shouldInjectRest) {
            const grandchildIds = new Set<number>();
            for (const group of childGroups) {
                for (const id of group) {
                    const stmt = runtime.script.getId(id);
                    if (stmt?.children) {
                        for (const childGroup of stmt.children) {
                            for (const childId of childGroup) {
                                grandchildIds.add(childId);
                            }
                        }
                    }
                }
            }
            if (grandchildIds.size > 0) {
                childGroups = childGroups.filter(
                    group => !group.every(id => grandchildIds.has(id))
                );
            }
        }

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
