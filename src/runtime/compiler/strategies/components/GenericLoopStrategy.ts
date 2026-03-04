import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricType } from "@/core/models/Metric";
import { RoundsMetric } from "../../metrics/RoundsMetric";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughMetricDistributor } from "../../../contracts/IDistributedMetrics";
import { LabelComposer } from "../../utils/LabelComposer";

// Specific behaviors not covered by aspect composers
import {
    MetricPromotionBehavior,
    LabelingBehavior
} from "../../../behaviors";

/**
 * GenericLoopStrategy handles blocks with round/iteration metrics.
 *
 * Uses aspect composer methods:
 * - .asRepeater() - Iteration/round management with completion
 * Plus specific behaviors for display, output, and history.
 */
export class GenericLoopStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        return statements.some(s => s.metrics.some(f => f.metricType === MetricType.Rounds));
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if round behaviors already added by higher-priority strategy
        if (builder.hasRoundConfig()) {
            return;
        }

        const firstStatementWithRounds = statements.find(s => s.metrics.some(
            f => f.metricType === MetricType.Rounds
        )) || statements[0];

        const roundsFragment = firstStatementWithRounds.metrics.find(
            f => f.metricType === MetricType.Rounds
        ) as RoundsMetric | undefined;

        if (!roundsFragment) return;

        // Parse rounds value
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;
        }

        // Collect individual RepMetrics from ALL statements to build a rep scheme.
        // The parser creates separate RepMetric instances (e.g., 21-15-9 becomes
        // three RepMetrics with values 21, 15, 9) alongside a RoundsMetric.
        const repFragments = statements.flatMap(s => 
            s.metrics.filter(f => f.metricType === MetricType.Rep && typeof f.value === 'number')
        ).map(f => f.value as number);

        if (repFragments.length > 0) {
            repScheme = repFragments;
            // If rounds weren't explicitly set, infer from rep scheme length
            if (totalRounds <= 1) {
                totalRounds = repScheme.length;
            }
        }

        // Use LabelComposer for a standardized, descriptive label
        const label = LabelComposer.build(statements, {
            defaultLabel: repScheme ? repScheme.join('-') : `${totalRounds} Rounds`
        });

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatementWithRounds.exerciseId || '');

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Rounds")
            .setLabel(label)
            .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughMetricDistributor();
        const metricGroups = statements.flatMap(s => 
            distributor.distribute(s.metrics || [], "Rounds")
        ).filter(group => group.length > 0);
        
        builder.setFragments(metricGroups);

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
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new LabelingBehavior({
            mode: 'clock',
            label
        }));

        // Promotion Aspect - Share internal state with children
        // Use execution origin to override parser-based text metrics
        builder.addBehavior(new MetricPromotionBehavior({
            repScheme,
            promotions: []
        }));
    }
}
