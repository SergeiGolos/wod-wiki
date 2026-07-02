import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import type { IRuntimeContext } from "../../../contracts/IRuntimeContext";
import { MetricType } from "@/core/models/Metric";
import { RoundsMetric } from "../../metrics/RoundsMetric";
import { compose } from "../../BlockTemplateComposer";
import type { BlockTemplate } from "../../BlockTemplate";

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

    match(statements: ICodeStatement[], _runtime: IRuntimeContext): boolean {
        if (!statements || statements.length === 0) return false;
        return statements.some(s => s.metrics.some(f => f.type === MetricType.Rounds));
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IRuntimeContext): void {
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
            s.metrics.filter(f => f.type === MetricType.Rep && typeof f.value === 'number')
        ).map(f => f.value as number);

        if (repFragments.length > 0) {
            repScheme = repFragments;
            // If rounds weren't explicitly set, infer from rep scheme length
            if (totalRounds <= 1) {
                totalRounds = repScheme.length;
            }
        }

        // Build the common chassis via the template composer.
        const template: BlockTemplate = {
            blockType: 'Rounds',
            defaultLabel: repScheme ? repScheme.join('-') : `${totalRounds} Rounds`,
            statements,
            runtime,
            repeater: {
                totalRounds,
                startRound: 1,
                addCompletion: true,
            },
            pickStatement: (stmts) => stmts.find(s => s.metrics.some(f => f.type === MetricType.Rounds)) || stmts[0],
            // Legacy `GenericLoopStrategy` dropped `Rep` metrics from the
            // distributed fragments — preserve that here.
            filterMetrics: (m) => m.type !== MetricType.Rep,
        };

        const label = compose(builder, template);

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