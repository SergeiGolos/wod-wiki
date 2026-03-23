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
    LabelingBehavior,
    ExitBehavior,
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
        // Match explicit rounds metric (e.g. "(3)" parentheses notation)
        if (statements.some(s => s.metrics.some(f => f.type === MetricType.Rounds))) return true;
        // Also match rep-scheme For Time (e.g. "21-15-9 For Time") which produces
        // multiple Rep metrics but no RoundsMetric. Two or more numeric Rep values
        // on the same statement indicate a rep scheme that defines the loop count.
        const repCount = statements[0]?.metrics.filter(
            f => f.type === MetricType.Rep && typeof f.value === 'number'
        ).length ?? 0;
        return repCount > 1;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Skip if round behaviors already added by higher-priority strategy
        if (builder.hasRoundConfig()) {
            return;
        }

        const firstStatementWithRounds = statements.find(s => s.metrics.some(
            f => f.type === MetricType.Rounds
        )) || statements[0];

        const roundsFragment = firstStatementWithRounds.metrics.find(
            f => f.type === MetricType.Rounds
        ) as RoundsMetric | undefined;

        // Parse rounds value
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (typeof roundsFragment?.value === 'number') {
            totalRounds = roundsFragment.value;
        }

        // Collect individual RepMetrics from ALL statements to build a rep scheme.
        // The parser creates separate RepMetric instances (e.g., 21-15-9 becomes
        // three RepMetrics with values 21, 15, 9) alongside a RoundsMetric.
        // For "21-15-9 For Time" there is no RoundsMetric, so repScheme drives rounds.
        const repFragments = statements.flatMap(s => 
            s.metrics.filter(f => f.type === MetricType.Rep && typeof f.value === 'number')
        ).map(f => f.value as number);

        if (repFragments.length > 0) {
            repScheme = repFragments;
            // If rounds weren't explicitly set, infer from rep scheme length
            if (totalRounds <= 1) {
                totalRounds = repScheme.length;
            }
        }

        // If neither a RoundsMetric nor a rep scheme is present, skip.
        // This guard keeps apply() a no-op for statements that matched only
        // via hasRoundsMetric=false but also have no rep scheme (shouldn't
        // happen, but guards against future match() widening).
        if (!roundsFragment && repScheme === undefined) return;


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
            distributor.distribute(
                s.metrics.filter(f => f.type !== MetricType.Rep),
                "Rounds"
            )
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
        const hasResistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Resistance));
        const hasDistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Distance));
        const promotions = [
            ...(hasResistance ? [{ metricType: MetricType.Resistance, origin: 'compiler' as const }] : []),
            ...(hasDistance ? [{ metricType: MetricType.Distance, origin: 'compiler' as const }] : []),
        ];
        builder.addBehavior(new MetricPromotionBehavior({
            repScheme,
            promotions
        }));

        // Leaf Exit Aspect - for round blocks with no children (e.g., "(3) Pullups"),
        // add an immediate exit so userNext completes the block.
        // ChildrenStrategy will remove this if the block has children, replacing it
        // with a deferred exit that fires after all child iterations complete.
        builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));
    }
}
