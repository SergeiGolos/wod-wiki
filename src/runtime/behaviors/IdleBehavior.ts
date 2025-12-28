import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RuntimeMetric } from '../models/RuntimeMetric';
import { RuntimeControls, RuntimeButton } from '../models/MemoryModels';
import { TypedMemoryReference } from '../contracts/IMemoryReference';

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
        
        // Add button if popOnNext is true OR if there are popOnEvents configured
        const hasPopTrigger = this.config.popOnNext || (this.config.popOnEvents && this.config.popOnEvents.length > 0);
        
        if (hasPopTrigger) {
            const labelLower = this.config.buttonLabel?.toLowerCase() || '';
            const actionLower = this.config.buttonAction?.toLowerCase() || '';
            
            // Derive button ID from action or label
            let buttonId = 'btn-next';
            let icon = 'next';
            let variant: 'default' | 'secondary' = 'secondary';
            
            if (labelLower.includes('start') || actionLower.includes('start')) {
                buttonId = 'btn-start';
                icon = 'play';
                variant = 'default';
            } else if (labelLower.includes('analytics') || actionLower.includes('analytics')) {
                buttonId = 'btn-analytics';
                icon = 'analytics';
                variant = 'default';
            }
            
            buttons.push({
                id: buttonId,
                label: this.config.buttonLabel || 'Next',
                icon: icon,
                action: this.config.buttonAction || 'timer:next',
                variant: variant,
                size: 'lg'
            });
        }

        this.controlsRef = runtime.memory.allocate<RuntimeControls>(
            'runtime-controls',
            block.key.toString(),
            { 
                buttons,
                displayMode: 'clock' 
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
