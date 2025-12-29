import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { IdleBehavior, IdleBehaviorConfig } from '../../behaviors/IdleBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { PushBlockAction } from './PushBlockAction';

export class PushIdleBlockAction implements IRuntimeAction {
    private _type = 'push-idle-block';

    constructor(
        private id: string,
        private label: string,
        private config: IdleBehaviorConfig,
        private options?: BlockLifecycleOptions
    ) { }

    get type(): string {
        return this._type;
    }

    /* istanbul ignore next */
    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        const blockKey = new BlockKey(this.id);
        const context = new BlockContext(runtime, blockKey.toString(), 'Idle');

        const behaviors = [
            new IdleBehavior({
                label: this.label,
                popOnNext: this.config.popOnNext,
                popOnEvents: this.config.popOnEvents,
                buttonLabel: this.config.buttonLabel,
                buttonAction: this.config.buttonAction
            }),
            // Add TimerBehavior so this block appears in the timer stack
            new TimerBehavior('up', undefined, this.label, 'secondary')
        ];

        const block = new RuntimeBlock(
            runtime,
            [], // No source IDs for idle block
            behaviors,
            context,
            blockKey,
            'Idle',
            this.label
        );

        // Delegate to PushBlockAction to handle the actual push and mount
        new PushBlockAction(block, this.options).do(runtime);
    }
}
