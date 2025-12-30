import { IEvent } from './IEvent';
import { IScriptRuntime } from '../IScriptRuntime';
import { IEventHandler } from './IEventHandler';

/**
 * Simple callback type for UI event listeners that don't produce actions.
 */
export type EventCallback = (event: IEvent, runtime: IScriptRuntime) => void;

/**
 * Handler scope determines when a handler receives events.
 * 
 * - 'active' (default): Only fires when the owner block is the current/active block on the stack.
 * - 'bubble': Fires when the owner block is anywhere on the stack (allows parent listening).
 * - 'global': Always fires regardless of stack state (for runtime-level handlers).
 */
export type HandlerScope = 'active' | 'bubble' | 'global';

/**
 * Options for registering an event handler.
 */
export interface EventHandlerOptions {
    /** Handler priority (higher priority handlers execute first). Default: 0 */
    priority?: number;
    /** Handler scope determining when it receives events. Default: 'active' */
    scope?: HandlerScope;
}

export interface IEventBus {
    /**
     * Register a full event handler that can produce runtime actions.
     * Used for runtime-internal event processing.
     * 
     * @param eventName - The event name to listen for ('*' for all events)
     * @param handler - The event handler
     * @param ownerId - The owner block ID (used for scope filtering and cleanup)
     * @param options - Handler options including priority and scope
     * @returns Unsubscribe function
     */
    register(
        eventName: string,
        handler: IEventHandler,
        ownerId: string,
        options?: EventHandlerOptions
    ): () => void;

    /**
     * Register a simple callback for event notifications.
     * Used for UI components that need to react to events without producing actions.
     * Returns an unsubscribe function.
     */
    on(eventName: string, callback: EventCallback, ownerId: string): () => void;

    unregisterById(handlerId: string): void;
    unregisterByOwner(ownerId: string): void;
    dispatch(event: IEvent, runtime: IScriptRuntime): import('../IRuntimeAction').IRuntimeAction[];
}
