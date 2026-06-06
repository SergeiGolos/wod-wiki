import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricType } from "@/core/models/Metric";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { LabelComposer } from "../../utils/LabelComposer";

// Specific behaviors not covered by aspect composers
import { ExitBehavior } from "../../../behaviors/ExitBehavior";

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
 *
 * Uses aspect composer methods:
 * - .asTimer() - Secondary countup timer for tracking elapsed time
 * Plus specific behaviors for completion and output.
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
        const label = LabelComposer.build(statements, { defaultLabel: 'Effort' });

        // Create block context
        const blockKey = new BlockKey();
        const firstStatement = statements[0];
        const context = new BlockContext(runtime, blockKey.toString(), firstStatement.exerciseId || '');

        // Configure block
        builder
            .setSourceIds(statements.map(s => s.id))
            .setContext(context)
            .setKey(blockKey)
            .setBlockType('effort')
            .setLabel(label);

        // Filter out runtime-generated metrics from all statements
        const metricPerStatement = statements.map(s => 
            s.metrics.filter(f => f.origin !== 'runtime')
        ).filter(group => group.length > 0);

        // Set metrics to ensure metrics:display memory is allocated
        if (metricPerStatement.length > 0) {
            builder.setFragments(metricPerStatement);
        }

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - track elapsed time with a secondary countup timer.
        // Role is 'secondary' so effort timers don't steal primary display from parent.
        builder.asTimer({
            direction: 'up',
            role: 'secondary',
            label,
            addCompletion: false  // No timer completion - user advances
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Completion Aspect: complete on user advance
        builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));
    }
}
