import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { IEventHandler } from '../../contracts/events/IEventHandler';
import { IEvent } from '../../contracts/events/IEvent';
import { HandlerScope } from '../../contracts/events/IEventBus';

export class SubscribeEventAction implements IRuntimeAction {
    private _type = 'subscribe-event';

    constructor(
        private eventName: string,
        private handlerId: string,
        private ownerId: string,
        private handlerFn: (event: IEvent, runtime: IScriptRuntime) => IRuntimeAction[],
        /** Handler scope. Default: 'active' (only fires when owner is current block) */
        private scope: HandlerScope = 'active'
    ) { }

    get type(): string {
        return this._type;
    }

    /* istanbul ignore next */
    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        const handler: IEventHandler = {
            id: this.handlerId,
            name: `Subscription-${this.eventName}`,
            handler: this.handlerFn
        };
        runtime.eventBus.register(this.eventName, handler, this.ownerId, { scope: this.scope });
    }
}

export class UnsubscribeEventAction implements IRuntimeAction {
    private _type = 'unsubscribe-event';

    constructor(
        private handlerId: string
    ) { }

    get type(): string {
        return this._type;
    }

    /* istanbul ignore next */
    set type(_value: string) {
        throw new Error('Cannot modify readonly property type');
    }

    do(runtime: IScriptRuntime): void {
        runtime.eventBus.unregisterById(this.handlerId);
    }
}
