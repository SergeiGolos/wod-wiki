import { IEvent } from './IEvent';
import { IScriptRuntime } from './IScriptRuntime';
import { IEventHandler } from './IEventHandler';

export type EventHandlerRegistration = {
  handler: IEventHandler;
  ownerId: string;
  priority: number;
};

/**
 * Simple in-memory event bus for runtime events.
 * - Handlers are registered per event name with optional priority.
 * - Dispatch does not depend on stack state; handlers self-filter as needed.
 * - Supports owner-based cleanup and unregister by handler id.
 */
export class EventBus {
  private handlersByEvent: Map<string, EventHandlerRegistration[]> = new Map();

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

  unregisterById(handlerId: string): void {
    for (const [eventName, list] of this.handlersByEvent.entries()) {
      const filtered = list.filter(entry => entry.handler.id !== handlerId);
      if (filtered.length === 0) {
        this.handlersByEvent.delete(eventName);
      } else {
        this.handlersByEvent.set(eventName, filtered);
      }
    }
  }

  unregisterByOwner(ownerId: string): void {
    for (const [eventName, list] of this.handlersByEvent.entries()) {
      const filtered = list.filter(entry => entry.ownerId !== ownerId);
      if (filtered.length === 0) {
        this.handlersByEvent.delete(eventName);
      } else {
        this.handlersByEvent.set(eventName, filtered);
      }
    }
  }

  dispatch(event: IEvent, runtime: IScriptRuntime): void {
    const list = [
      ...(this.handlersByEvent.get('*') ?? []),
      ...(this.handlersByEvent.get(event.name) ?? [])
    ];
    const actions = [] as ReturnType<IEventHandler['handler']>;

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

    for (const action of actions) {
      try {
        action.do(runtime);
      } catch (error) {
        console.error(`EventBus action error for ${event.name}:`, error);
      }
    }
  }
}
