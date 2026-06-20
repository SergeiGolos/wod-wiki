import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricType } from "@/core/models/Metric";

// Specific behaviors not covered by aspect composers
import { ExitBehavior } from "../../../behaviors/ExitBehavior";
import { compose } from "../../BlockTemplateComposer";

/**
 * EffortFallbackStrategy handles simple leaf effort blocks (e.g., "10 Push-ups").
 *
 * These blocks have no timer, no rounds, and no children — they complete when
 * the user advances. They track elapsed time via a secondary countup timer so
 * the stack display can show how long each effort takes.
 *
 * Blocks WITH children are excluded from this strategy and handled by
 * GenericGroupStrategy + ChildrenStrategy instead, which properly push child
 * blocks onto the stack via ChildRunnerBehavior.
 */
export class EffortFallbackStrategy implements IRuntimeBlockStrategy {
    priority = 0;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;

        // Check if ANY statement has timer, rounds, or children
        const hasTimer = statements.some(s => s.metrics.some(f => f.type === MetricType.Duration && f.origin !== 'runtime'));
        const hasRounds = statements.some(s => s.metrics.some(f => f.type === MetricType.Rounds && f.origin !== 'runtime'));
        const hasChildren = statements.some(s => s.children && s.children.length > 0);

        return !hasTimer && !hasRounds && !hasChildren;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Route through the shared chassis composer — key, context, label,
        // source IDs, fragments, and the timer aspect are all handled by
        // `compose()`. Only the exit behavior is the delta.
        compose(builder, {
            blockType: 'effort',
            defaultLabel: 'Effort',
            statements,
            runtime,
            // Secondary countup timer so the stack display shows how long
            // the effort took. Role 'secondary' prevents it from stealing
            // primary display from a parent timer. Mode 'reset-interval'
            // means no timer completion (the user advances manually).
            timer: {
                direction: 'up',
                role: 'secondary',
                mode: 'reset-interval',
            },
            filterMetrics: f => f.origin !== 'runtime',
        });

        // Completion Aspect: complete on user advance (no timer completion).
        builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));
    }
}
