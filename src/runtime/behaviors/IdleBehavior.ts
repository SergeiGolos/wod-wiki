import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RuntimeMetric, MetricValueType } from '../models/RuntimeMetric';
import { RuntimeControls, RuntimeButton } from '../models/MemoryModels';
import { EmitEventAction } from '../actions/events/EmitEventAction';

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

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.startTime = (options?.startTime ?? new Date()).getTime();

        // Allocate controls for this idle block
        const buttons: RuntimeButton[] = [];

        // Add button if popOnNext is true OR if there are popOnEvents configured
        const hasPopTrigger = this.config.popOnNext || (this.config.popOnEvents && this.config.popOnEvents.length > 0);

        if (hasPopTrigger) {
            const labelLower = this.config.buttonLabel?.toLowerCase() || '';
            const actionLower = this.config.buttonAction?.toLowerCase() || '';

            // Derive button ID from action or label
            let buttonId = 'btn-next';
            let icon: any = 'next';
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

        block.context.allocate<RuntimeControls>(
            'runtime-controls',
            {
                buttons,
                displayMode: 'clock'
            },
            'public'
        );

        return [];
    }

    onNext(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (this.config.popOnNext) {
            return [new PopBlockAction()];
        }
        return [];
    }

    onEvent(event: IEvent, _block: IRuntimeBlock): IRuntimeAction[] {
        if (this.config.popOnEvents?.includes(event.name)) {
            return [new PopBlockAction()];
        }
        return [];
    }

    onPop(_block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const endTime = (options?.completedAt ?? new Date()).getTime();
        const duration = endTime - this.startTime;

        const metric: RuntimeMetric = {
            exerciseId: this.config.label || 'Idle',
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

        // Emit metric collection event
        return [
            new EmitEventAction('metric:collect', metric)
        ];
    }

    onDispose(_block: IRuntimeBlock): void {
        // No-op
    }
}
