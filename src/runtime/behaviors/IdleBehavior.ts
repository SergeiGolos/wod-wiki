import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IEvent } from '../IEvent';
import { PopBlockAction } from '../PopBlockAction';
import { RuntimeMetric } from '../RuntimeMetric';
import { RuntimeControls, RuntimeButton } from '../models/MemoryModels';
import { TypedMemoryReference } from '../IMemoryReference';

export interface IdleBehaviorConfig {
    label?: string;
    popOnNext?: boolean;
    popOnEvents?: string[];
    buttonLabel?: string;
    buttonAction?: string;
}

export class IdleBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private readonly config: IdleBehaviorConfig;
    private controlsRef?: TypedMemoryReference<RuntimeControls>;

    constructor(config: IdleBehaviorConfig = {}) {
        this.config = {
            label: 'Idle',
            popOnNext: true,
            popOnEvents: [],
            buttonLabel: 'Next',
            buttonAction: 'timer:next',
            ...config
        };
    }

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        this.startTime = Date.now();
        
        // Allocate controls for this idle block
        // This allows the UI to show appropriate buttons (e.g. "Start" or "Next")
        const buttons: RuntimeButton[] = [];
        
        if (this.config.popOnNext) {
            buttons.push({
                id: 'btn-next',
                label: this.config.buttonLabel || 'Next',
                icon: this.config.buttonLabel?.toLowerCase().includes('start') ? 'play' : 'next',
                action: this.config.buttonAction || 'timer:next',
                variant: this.config.buttonLabel?.toLowerCase().includes('start') ? 'default' : 'secondary',
                size: 'lg'
            });
        }

        this.controlsRef = runtime.memory.allocate<RuntimeControls>(
            'runtime-controls',
            block.key.toString(),
            { 
                buttons,
                displayMode: 'timer' 
            },
            'public'
        );
        
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

        // Release controls
        if (this.controlsRef) {
            runtime.memory.release(this.controlsRef);
            this.controlsRef = undefined;
        }

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

        return [];
    }
}
