import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

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

    do(runtime: IScriptRuntime): void {
        if (runtime.tracker) {
            runtime.tracker.recordMetric(this.blockId, this.metricKey, this.value, this.unit);
        }
    }
}
