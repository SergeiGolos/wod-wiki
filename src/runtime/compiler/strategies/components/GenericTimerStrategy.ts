import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { MetricType } from "@/core/models/Metric";
import { DurationMetric } from "../../metrics/DurationMetric";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughMetricDistributor } from "../../../impl/PassthroughMetricDistributor";
import { MetricContainer } from "@/core/models/MetricContainer";
import { LabelComposer } from "../../utils/LabelComposer";

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

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;

        // Match if duration metrics exists in ANY statement, ignoring runtime-generated ones
        return statements.some(s => s.metrics.some(
            f => f.type === MetricType.Duration && f.origin !== 'runtime'
        ));
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
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
        
        // Use LabelComposer for a standardized, descriptive label
        const label = LabelComposer.build(statements, {
            defaultLabel: direction === 'down' ? 'Countdown' : 'For Time'
        });

        // Block metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatementWithTimer.exerciseId || '');

        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Timer")
            .setLabel(label)
            .setSourceIds(statements.map(s => s.id));

        const metricGroups = statements.flatMap(s => 
            distribute(MetricContainer.from(s.metrics), "Timer")
        ).filter(group => group.length > 0);
        
        builder.setFragments(metricGroups);

        // =====================================================================
        // Specific Behaviors - Added BEFORE aspects to ensure correct execution order
        // (LeafExit before Timer ensures Pop comes before Rest Push onNext)
        // =====================================================================

        // Check for required-timer hint (user cannot skip with * prefix)
        const isRequired = statements.some(s => s.hints?.has('behavior.required_timer'));

        // Completion Aspect
        // For required timers, only exit when the timer:complete event fires (not on user next).
        // For normal timers, user can still advance manually (skip or acknowledge completion).
        // For parent blocks with children, ChildrenStrategy removes ExitBehavior since children manage advancement.
        if (isRequired && durationMs && direction === 'down') {
            builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: false, onEvents: ['timer:complete'] }));
        } else {
            builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true }));
        }

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Check for inject-rest hint
        const injectRest = statements.some(s => s.hints?.has('behavior.inject_rest'));

        // Timer Aspect - countdown or countup timer
        if (durationMs && direction === 'down') {
            // Countdown timer with completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: true,  // Timer completion marks block as complete
                injectRest,
                required: isRequired,
            });
        } else {
            // Countup timer without completion
            builder.asTimer({
                direction,
                durationMs,
                label,
                role: 'primary',
                addCompletion: false,  // No timer completion - user must advance
                injectRest
            });
        }

        // =====================================================================
        // Display and Sound
        // =====================================================================

        // Sound Cues
        if (durationMs && direction === 'down') {
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

// Keep the logic-heavy metrics distribution local to the strategy
function distribute(metrics: MetricContainer, type: string): MetricContainer[] {
    const distributor = new PassthroughMetricDistributor();
    return distributor.distribute(metrics, type);
}
