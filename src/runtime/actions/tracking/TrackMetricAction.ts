import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import type { IRuntimeContext } from '../../contracts/IRuntimeContext';

/**
 * TrackMetricAction - Updates a metric on the active span.
 */
export class TrackMetricAction implements IRuntimeAction {
    readonly type = 'track:metric';

    constructor(
        public readonly blockId: string,
        public readonly metricKey: string,
        public readonly value: any,
        public readonly unit: string
    ) { }

    do(runtime: IRuntimeContext): void {
        if (runtime.tracker?.recordMetric) {
            runtime.tracker.recordMetric(this.blockId, this.metricKey, this.value, this.unit);
        }
    }
}
