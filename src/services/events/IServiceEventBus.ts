/**
 * IServiceEventBus — canonical interface for service-layer event buses.
 *
 * Used by WorkbenchEventBus and WorkoutEventBus. The runtime EventBus
 * (src/runtime/events/EventBus.ts) implements IEventBus and is intentionally
 * separate — it handles scoped, owner-filtered action dispatch for the block
 * execution hierarchy.
 */
export interface IServiceEventBus<T> {
  /**
   * Emit an event to all current subscribers.
   */
  emit(event: T): void;

  /**
   * Subscribe to events.
   * @returns Unsubscribe function — call it to remove the listener.
   */
  subscribe(fn: (event: T) => void): () => void;
}
