import { IEvent } from '../contracts/events/IEvent';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEventHandler } from '../contracts/events/IEventHandler';

export type EventHandlerRegistration = {
  handler: IEventHandler;
  ownerId: string;
  priority: number;
};

import { IEventBus, EventCallback } from '../contracts/events/IEventBus';

type CallbackRegistration = {
  id: string;
  callback: EventCallback;
  ownerId: string;
};

/**
 * Simple in-memory event bus for runtime events.
 * - Handlers are registered per event name with optional priority.
 * - Dispatch does not depend on stack state; handlers self-filter as needed.
 * - Supports owner-based cleanup and unregister by handler id.
 */
export class EventBus implements IEventBus {
  private handlersByEvent: Map<string, EventHandlerRegistration[]> = new Map();
  private callbacksByEvent: Map<string, CallbackRegistration[]> = new Map();

  register(
    eventName: string,
    handler: IEventHandler,
    ownerId: string,
    priority: number = 0
  ): () => void {
    const list = this.handlersByEvent.get(eventName) ?? [];
    const updated = [...list, { handler, ownerId, priority }];
    // Keep deterministic order: higher priority first, then insertion
    updated.sort((a, b) => b.priority - a.priority);
    this.handlersByEvent.set(eventName, updated);

    return () => this.unregisterById(handler.id);
  }

  on(eventName: string, callback: EventCallback, ownerId: string): () => void {
    const id = crypto.randomUUID();
    const list = this.callbacksByEvent.get(eventName) ?? [];
    list.push({ id, callback, ownerId });
    this.callbacksByEvent.set(eventName, list);

    return () => this.unregisterById(id);
  }

  unregisterById(handlerId: string): void {
    // Unregister from handlers
    for (const [eventName, list] of this.handlersByEvent.entries()) {
      const filtered = list.filter(entry => entry.handler.id !== handlerId);
      if (filtered.length === 0) {
        this.handlersByEvent.delete(eventName);
      } else {
        this.handlersByEvent.set(eventName, filtered);
      }
    }

    // Unregister from callbacks
    for (const [eventName, list] of this.callbacksByEvent.entries()) {
      const filtered = list.filter(entry => entry.id !== handlerId);
      if (filtered.length === 0) {
        this.callbacksByEvent.delete(eventName);
      } else {
        this.callbacksByEvent.set(eventName, filtered);
      }
    }
  }

  unregisterByOwner(ownerId: string): void {
    // Unregister handlers by owner
    for (const [eventName, list] of this.handlersByEvent.entries()) {
      const filtered = list.filter(entry => entry.ownerId !== ownerId);
      if (filtered.length === 0) {
        this.handlersByEvent.delete(eventName);
      } else {
        this.handlersByEvent.set(eventName, filtered);
      }
    }

    // Unregister callbacks by owner
    for (const [eventName, list] of this.callbacksByEvent.entries()) {
      const filtered = list.filter(entry => entry.ownerId !== ownerId);
      if (filtered.length === 0) {
        this.callbacksByEvent.delete(eventName);
      } else {
        this.callbacksByEvent.set(eventName, filtered);
      }
    }
  }

  dispatch(event: IEvent, runtime: IScriptRuntime): import('../contracts/IRuntimeAction').IRuntimeAction[] {
    // First, invoke simple callbacks (no actions)
    const callbacks = [
      ...(this.callbacksByEvent.get('*') ?? []),
      ...(this.callbacksByEvent.get(event.name) ?? [])
    ];

    for (const entry of callbacks) {
      try {
        entry.callback(event, runtime);
      } catch (error) {
        console.error(`EventBus callback error for ${event.name}:`, error);
      }
    }

    // Then, invoke action-producing handlers
    const list = [
      ...(this.handlersByEvent.get('*') ?? []),
      ...(this.handlersByEvent.get(event.name) ?? [])
    ];
    const actions = [] as import('../contracts/IRuntimeAction').IRuntimeAction[];

    for (const entry of list) {
      try {
        const result = entry.handler.handler(event, runtime);
        if (result && result.length > 0) {
          actions.push(...result);
        }
        if (runtime.errors && runtime.errors.length > 0) {
          break;
        }
      } catch (error) {
        console.error(`EventBus handler error for ${event.name}:`, error);
      }
    }

    return actions;
  }
}
