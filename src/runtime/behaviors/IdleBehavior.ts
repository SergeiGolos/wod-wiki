import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IEvent } from '../IEvent';
import { PopBlockAction } from '../PopBlockAction';
import { RuntimeMetric } from '../RuntimeMetric';

export interface IdleBehaviorConfig {
    label?: string;
    popOnNext?: boolean;
    popOnEvents?: string[];
}

export class IdleBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private readonly config: IdleBehaviorConfig;

    constructor(config: IdleBehaviorConfig = {}) {
        this.config = {
            label: 'Idle',
            popOnNext: true,
            popOnEvents: [],
            ...config
        };
    }

    onPush(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
        this.startTime = Date.now();
        return [];
    }

    onNext(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
        if (this.config.popOnNext) {
            return [new PopBlockAction()];
        }
        return [];
    }

    onEvent(event: IEvent, _runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
        if (this.config.popOnEvents?.includes(event.name)) {
            return [new PopBlockAction()];
        }
        return [];
    }

    onPop(runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const metric: RuntimeMetric = {
            exerciseId: this.config.label || 'Idle',
            values: [{
                type: 'time',
                value: duration,
                unit: 'ms'
            }],
            timeSpans: [{
                start: new Date(this.startTime),
                stop: new Date(endTime)
            }]
        };

        if (runtime.metrics) {
            runtime.metrics.collect(metric);
        }
        console.log(`[IdleBehavior] Recorded idle duration: ${duration}ms`);

        return [];
    }
}
