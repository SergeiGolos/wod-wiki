import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RecordMetricAction } from '../actions/display/SegmentActions';

/**
 * TransitionTimingBehavior - Tracks time spent in transition/idle blocks.
 * 
 * This behavior records the start time when a block is pushed and emits
 * a timing metric when the block is popped. Useful for analytics on
 * how long users spend in idle states.
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

        // Use RecordMetricAction (Fragment-based) instead of legacy RuntimeMetric
        return [new RecordMetricAction(
            'time',
            duration,
            'ms',
            block.label || 'Transition'
        )];
    }

    onDispose(_block: IRuntimeBlock): void {
        // Reset state
        this.startTime = 0;
    }
}
