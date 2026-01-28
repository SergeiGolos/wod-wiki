import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";

// New aspect-based behaviors
import {
    ChildRunnerBehavior,
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

        const children = statements[0].children!;

        // Map children to statement ID groups
        // Each child statement becomes a group with one ID
        const childGroups = children.map(child =>
            child.id !== undefined ? [child.id] : []
        ).filter(group => group.length > 0);

        // Add child runner behavior
        builder.addBehavior(new ChildRunnerBehavior({ childGroups }));

        // Add default round handling if not already present
        if (!builder.hasBehavior(RoundInitBehavior)) {
            // Check if we have a timer (for AMRAP-style unbounded looping)
            const hasTimer = builder.hasBehavior(TimerInitBehavior);

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
