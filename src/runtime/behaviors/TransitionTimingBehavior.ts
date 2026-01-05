import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { RuntimeMetric, MetricValueType } from '../models/RuntimeMetric';

/**
 * TransitionTimingBehavior - Tracks time spent in transition/idle blocks.
 * 
 * This behavior records the start time when a block is pushed and emits
 * a timing metric when the block is popped. Useful for analytics on
 * how long users spend in idle states.
 * 
 * @example
 * ```typescript
 * // Track timing for this idle block
 * new TransitionTimingBehavior()
 * ```
 */
export class TransitionTimingBehavior implements IRuntimeBehavior {
    private startTime: number = 0;

    onPush(_block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        this.startTime = clock.now.getTime();
        return [];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const endTime = clock.now.getTime();
        const duration = endTime - this.startTime;

        const metric: RuntimeMetric = {
            exerciseId: block.label || 'Transition',
            values: [{
                type: MetricValueType.Time,
                value: duration,
                unit: 'ms'
            }],
            timeSpans: [{
                start: new Date(this.startTime),
                stop: new Date(endTime)
            }]
        };

        return [new EmitEventAction('metric:collect', metric)];
    }

    onDispose(_block: IRuntimeBlock): void {
        // Reset state
        this.startTime = 0;
    }
}
