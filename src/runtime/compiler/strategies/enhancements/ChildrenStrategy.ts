import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";

// Specific behaviors not covered by aspect composers
import {
    ChildRunnerBehavior,
    ChildLoopBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    TimerInitBehavior,
    TimerCompletionBehavior,
    PopOnNextBehavior,
    CompletedBlockPopBehavior,
    PromoteFragmentBehavior
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
        if (builder.hasBehavior(ChildRunnerBehavior)) {
            return;
        }

        // children is already number[][] (grouped child statement IDs)
        const children = statements[0].children!;

        // Filter out empty groups
        const childGroups = children.filter(group => group.length > 0);

        // Check if we have a timer (for AMRAP-style unbounded looping)
        const hasTimer = builder.hasBehavior(TimerInitBehavior);
        // Check if rounds were already set up by another strategy (e.g., GenericLoopStrategy)
        // This indicates multi-round blocks like Annie (50-40-30-20-10) that need child looping
        const hasRoundsFromStrategy = builder.hasBehavior(RoundInitBehavior);
        // Check if a countdown timer controls completion (AMRAP pattern)
        // TimerCompletionBehavior is only added for countdown timers with a duration
        const hasCountdownCompletion = builder.hasBehavior(TimerCompletionBehavior);

        // Remove PopOnNextBehavior if present — children manage advancement,
        // not simple pop-on-next. GenericTimerStrategy adds PopOnNextBehavior
        // for countup timers, but when children exist, ChildRunnerBehavior
        // and RoundCompletionBehavior handle completion instead.
        if (builder.hasBehavior(PopOnNextBehavior)) {
            builder.removeBehavior(PopOnNextBehavior);
        }

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Container Aspect - Child execution with optional looping
        // For timer-based OR multi-round blocks, add loop behavior
        const shouldAddLoop = (hasCountdownCompletion || hasRoundsFromStrategy);

        builder.asContainer({
            childGroups,
            addLoop: shouldAddLoop,
            loopConfig: shouldAddLoop ? { childGroups } : undefined
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
        if (!builder.hasBehavior(RoundInitBehavior)) {
            if (hasCountdownCompletion) {
                // Countdown timer (AMRAP pattern): unbounded rounds, timer controls completion
                builder.addBehavior(new RoundInitBehavior({
                    totalRounds: undefined, // Unbounded
                    startRound: 1
                }));
                builder.addBehavior(new RoundAdvanceBehavior());
                // No RoundCompletionBehavior - timer controls completion
            } else {
                // Single pass through children (no timer, or countup "for time" timer)
                builder.addBehavior(new RoundInitBehavior({
                    totalRounds: 1,
                    startRound: 1
                }));
                builder.addBehavior(new RoundAdvanceBehavior());
                builder.addBehavior(new RoundCompletionBehavior());
            }

            // Promote current round fragment to children (e.g. for display)
            // Explicitly target 'round' tag to get the runtime value, avoiding
            // ambiguity with other fragments (like total rounds or parser hints)
            builder.addBehavior(new PromoteFragmentBehavior({
                fragmentType: FragmentType.Rounds,
                origin: 'execution',
                enableDynamicUpdates: true,
                sourceTag: 'round'
            }));
        }
    }
}
