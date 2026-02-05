import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";

// New aspect-based behaviors
import {
    ChildRunnerBehavior,
    ChildLoopBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    TimerInitBehavior
} from "../../../behaviors";

/**
 * ChildrenStrategy handles blocks with child statements.
 * 
 * Uses aspect-based behaviors:
 * - Children: ChildRunnerBehavior
 * - Iteration: RoundInit, RoundAdvance, RoundCompletion (for single-pass default)
 * 
 * This is a mid-priority enhancement that adds child execution
 * and default looping if not already configured.
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

        // Add child loop behavior FIRST for timer-based blocks
        // This behavior must run before ChildRunnerBehavior so it can
        // reset the child index before ChildRunner checks it
        if (hasTimer && !builder.hasBehavior(ChildLoopBehavior)) {
            builder.addBehavior(new ChildLoopBehavior({ childGroups }));
        }

        // Add child runner behavior (after ChildLoopBehavior)
        builder.addBehavior(new ChildRunnerBehavior({ childGroups }));

        // Add default round handling if not already present
        if (!builder.hasBehavior(RoundInitBehavior)) {
            if (hasTimer) {
                // Timer-based: unbounded rounds (AMRAP pattern)
                builder.addBehavior(new RoundInitBehavior({
                    totalRounds: undefined, // Unbounded
                    startRound: 1
                }));
                builder.addBehavior(new RoundAdvanceBehavior());
                // No RoundCompletionBehavior - timer controls completion
            } else {
                // No timer: single pass through children
                builder.addBehavior(new RoundInitBehavior({
                    totalRounds: 1,
                    startRound: 1
                }));
                builder.addBehavior(new RoundAdvanceBehavior());
                builder.addBehavior(new RoundCompletionBehavior());
            }
        }
    }
}
