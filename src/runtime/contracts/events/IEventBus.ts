import { IEvent } from './events/IEvent';
import { IScriptRuntime } from './IScriptRuntime';
import { IEventHandler } from './events/IEventHandler';

/**
 * Simple callback type for UI event listeners that don't produce actions.
 */
export type EventCallback = (event: IEvent, runtime: IScriptRuntime) => void;

export interface IEventBus {
    /**
     * Register a full event handler that can produce runtime actions.
     * Used for runtime-internal event processing.
     */
    register(
        eventName: string,
        handler: IEventHandler,
        ownerId: string,
        priority?: number
    ): () => void;
    
    /**
     * Register a simple callback for event notifications.
     * Used for UI components that need to react to events without producing actions.
     * Returns an unsubscribe function.
     */
    on(eventName: string, callback: EventCallback, ownerId: string): () => void;
    
    unregisterById(handlerId: string): void;
    unregisterByOwner(ownerId: string): void;
    dispatch(event: IEvent, runtime: IScriptRuntime): void;
}
