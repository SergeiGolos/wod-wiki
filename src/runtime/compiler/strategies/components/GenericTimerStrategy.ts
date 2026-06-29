import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import type { IRuntimeContext } from "../../../contracts/IRuntimeContext";
import { MetricType } from "@/core/models/Metric";
import { DurationMetric } from "../../metrics/DurationMetric";
import { hasHint } from "@/core/metrics/hints";
import { compose } from "../../BlockTemplateComposer";
import type { BlockTemplate } from "../../BlockTemplate";

// Specific behaviors not covered by aspect composers
import {
    LabelingBehavior,
    ExitBehavior,
    SoundCueBehavior
} from "../../../behaviors";

/**
 * GenericTimerStrategy handles blocks with timer metrics.
 *
 * Uses aspect composer methods:
 * - .asTimer() - Time tracking (countdown or countup)
 * Plus specific behaviors for display, output, completion, and sound.
 */
export class GenericTimerStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Mid priority

    match(statements: ICodeStatement[], _runtime: IRuntimeContext): boolean {
        if (!statements || statements.length === 0) return false;

        // Match if duration metrics exists in ANY statement, ignoring runtime-generated ones
        return statements.some(s => s.metrics.some(
            f => f.type === MetricType.Duration && f.origin !== 'runtime'
        ));
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IRuntimeContext): void {
        // Skip if a timer behavior was already added by a higher-priority strategy
        if (builder.hasTimerBehavior()) {
            return;
        }

        const firstStatementWithTimer = statements.find(s => s.metrics.some(
            f => f.type === MetricType.Duration && f.origin !== 'runtime'
        )) || statements[0];

        const timerFragment = firstStatementWithTimer.metrics.find(
            f => f.type === MetricType.Duration && f.origin !== 'runtime'
        ) as DurationMetric | undefined;

        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const isRequired = statements.some(s => hasHint(s, 'behavior.required_timer'));
        const injectRest = statements.some(s => hasHint(s, 'behavior.inject_rest'));
        const isCountdown = !!(durationMs && direction === 'down');

        // Build the common chassis via the template composer; strategy-specific
        // behaviors (ExitBehavior, SoundCue, Labeling) are added below.
        const template: BlockTemplate = {
            blockType: 'Timer',
            defaultLabel: direction === 'down' ? 'Countdown' : 'For Time',
            statements,
            runtime,
            timer: {
                direction,
                durationMs,
                label: durationMs ? 'Countdown' : 'For Time',
                role: 'primary',
                mode: isCountdown ? 'complete-block' : 'complete-block',
                injectRest,
                required: isRequired,
            },
            pickStatement: (stmts) => stmts.find(s =>
                s.metrics.some(f => f.type === MetricType.Duration && f.origin !== 'runtime')
            ) || stmts[0],
        };

        const label = compose(builder, template);

        // =====================================================================
        // Specific Behaviors - Added BEFORE aspects to ensure correct execution order
        // (LeafExit before Timer ensures Pop comes before Rest Push onNext)
        // =====================================================================

        // Completion Aspect
        // For required timers, only exit when the timer:complete event fires (not on user next).
        // For normal timers, user can still advance manually (skip or acknowledge completion).
        // For parent blocks with children, ChildrenStrategy removes ExitBehavior since children manage advancement.
        if (isRequired && isCountdown) {
            builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: false, onEvents: ['timer:complete'] }));
        } else {
            builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));
        }

        // =====================================================================
        // Display and Sound
        // =====================================================================

        // Sound Cues
        if (isCountdown) {
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'timer-complete', trigger: 'complete' }
                ]
            }));
        }

        // Display Aspect
        builder.addBehavior(new LabelingBehavior({
            mode: durationMs ? 'countdown' : 'clock',
            label
        }));
    }
}

