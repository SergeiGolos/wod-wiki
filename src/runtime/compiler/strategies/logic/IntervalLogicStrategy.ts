import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricType } from "@/core/models/Metric";
import { MetricContainer } from "@/core/models/MetricContainer";
import { DurationMetric } from "../../metrics/DurationMetric";
import { RoundsMetric } from "../../metrics/RoundsMetric";
import { hasHint } from "@/core/metrics/hints";
import { compose } from "../../BlockTemplateComposer";
import type { BlockTemplate } from "../../BlockTemplate";
// Specific behaviors not covered by aspect composers
import {
    LabelingBehavior,
    MetricPromotionBehavior,
    SoundCueBehavior,
} from "../../../behaviors";

/**
 * IntervalLogicStrategy handles EMOM (Every Minute On the Minute) blocks.
 *
 * Pattern: Repeating interval timer + Rounds
 * Each interval resets the timer.
 *
 * Uses aspect composer methods:
 * - .asTimer() - Countdown per interval (completesBlock: false)
 * - .asRepeater() - Fixed rounds with completion
 * Plus specific behaviors for display, output, rest, and sound.
 */
export class IntervalLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90; // High priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        
        // Match if ANY statement has timer and (hint or EMOM keyword)
        const hasTimer = statements.some(s => s.metrics.some(f => f.type === MetricType.Duration));
        const isInterval = statements.some(s => hasHint(s, 'behavior.repeating_interval'));

        // EMOM can be parsed as 'Action' OR 'Effort' depending on parser version
        const hasEmomAction = statements.some(s => s.metrics.some(
            f => (f.type === MetricType.Action || f.type === MetricType.Effort)
                && typeof f.value === 'string'
                && f.value.toLowerCase() === 'emom'
        ));
        return hasTimer && (isInterval || hasEmomAction);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const firstStatementWithTimer = statements.find(s => s.metrics.some(
            f => f.type === MetricType.Duration
        )) || statements[0];

        const timerFragment = firstStatementWithTimer.metrics.find(
            f => f.type === MetricType.Duration
        ) as DurationMetric | undefined;

        const roundsFragment = statements.flatMap(s => MetricContainer.from(s.metrics).toArray()).find(
            f => f.type === MetricType.Rounds
        ) as RoundsMetric | undefined;

        const intervalMs = timerFragment?.value || 60000; // Default 1 minute
        const totalRounds = typeof roundsFragment?.value === 'number'
            ? roundsFragment.value
            : 10; // Default 10 rounds if not specified

        // Build the common chassis via the template composer.
        const template: BlockTemplate = {
            blockType: 'EMOM',
            defaultLabel: `EMOM ${totalRounds}`,
            statements,
            runtime,
            // EMOM uses countdown timer per interval. Timer expiry does NOT
            // mark block complete — it's a per-round pacing signal.
            timer: {
                direction: 'down',
                durationMs: intervalMs,
                label: 'Interval',
                role: 'primary',
                mode: 'reset-interval', // Timer resets for next round
                injectRest: true,
            },
            // EMOM has fixed rounds, block completes when exhausted.
            repeater: {
                totalRounds,
                startRound: 1,
                addCompletion: true,
            },
            pickStatement: (stmts) => stmts.find(s => s.hasMetric(MetricType.Duration)) || stmts[0],
            metricDistributorType: 'EMOM',
        };

        const label = compose(builder, template);

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new LabelingBehavior({
            mode: 'countdown',
            label
        }));

        // Sound Cues
        builder.addBehavior(new SoundCueBehavior({
            cues: [
                { sound: 'interval-start', trigger: 'mount' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                { sound: 'interval-complete', trigger: 'complete' }
            ]
        }));

        // Promotion Aspect - cascade resistance/distance to child blocks
        const hasResistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Resistance));
        const hasDistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Distance));
        const promotions = [
            ...(hasResistance ? [{ metricType: MetricType.Resistance, origin: 'compiler' as const }] : []),
            ...(hasDistance ? [{ metricType: MetricType.Distance, origin: 'compiler' as const }] : []),
        ];
        if (promotions.length > 0) {
            builder.addBehavior(new MetricPromotionBehavior({ promotions }));
        }
    }
}
