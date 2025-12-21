import { IEvent } from './IEvent';
import { IScriptRuntime } from './IScriptRuntime';
import { IEventHandler } from './IEventHandler';

export interface IEventBus {
    register(
        eventName: string,
        handler: IEventHandler,
        ownerId: string,
        priority?: number
    ): () => void;
    unregisterById(handlerId: string): void;
    unregisterByOwner(ownerId: string): void;
    dispatch(event: IEvent, runtime: IScriptRuntime): void;
}
