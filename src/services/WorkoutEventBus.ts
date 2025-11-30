/**
 * WorkoutEventBus - Centralized event system for workout lifecycle events
 * 
 * This event bus decouples workout actions from component hierarchies.
 * Instead of passing callbacks through 4+ component layers, any component
 * can emit events and any component can subscribe to them.
 * 
 * Event Types:
 * - start-workout: User wants to start tracking a workout block
 * - stop-workout: User stopped/completed a workout
 * - pause-workout: User paused the workout
 * - resume-workout: User resumed the workout
 * 
 * @example
 * ```typescript
 * // Emitting an event (from any component)
 * import { workoutEventBus } from '@/services/WorkoutEventBus';
 * workoutEventBus.emit({ type: 'start-workout', block: wodBlock });
 * 
 * // Subscribing to events (usually in a hook or provider)
 * useEffect(() => {
 *   return workoutEventBus.subscribe((event) => {
 *     if (event.type === 'start-workout') {
 *       // Handle start workout
 *     }
 *   });
 * }, []);
 * ```
 */

import type { WodBlock, WorkoutResults } from '../markdown-editor/types';

/**
 * Union type for all workout-related events
 */
export type WorkoutEvent = 
  | { type: 'start-workout'; block: WodBlock }
  | { type: 'stop-workout'; results: WorkoutResults }
  | { type: 'pause-workout' }
  | { type: 'resume-workout' }
  | { type: 'next-segment' };

/**
 * Event subscriber function type
 */
export type WorkoutEventSubscriber = (event: WorkoutEvent) => void;

/**
 * WorkoutEventBus class - Simple pub/sub event bus
 * 
 * Thread-safe for React's concurrent mode.
 * Subscribers are called synchronously in registration order.
 */
class WorkoutEventBus {
  private subscribers = new Set<WorkoutEventSubscriber>();
  private debugMode = false;

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Subscribe to workout events
   * @param fn - Callback function to receive events
   * @returns Unsubscribe function
   */
  subscribe(fn: WorkoutEventSubscriber): () => void {
    this.subscribers.add(fn);
    
    if (this.debugMode) {

    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(fn);
      if (this.debugMode) {

      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param event - The workout event to emit
   */
  emit(event: WorkoutEvent): void {
    if (this.debugMode) {

    }
    
    this.subscribers.forEach(fn => {
      try {
        fn(event);
      } catch (error) {
        console.error('[WorkoutEventBus] Subscriber error:', error);
      }
    });
  }

  /**
   * Get the current subscriber count (for debugging)
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers (mainly for testing)
   */
  clear(): void {
    this.subscribers.clear();
    if (this.debugMode) {

    }
  }
}

/**
 * Singleton instance of the workout event bus
 * Import this from components that need to emit or subscribe to events
 */
export const workoutEventBus = new WorkoutEventBus();

// Enable debug mode in development
if (typeof window !== 'undefined' && (window as any).__WOD_WIKI_DEBUG__) {
  workoutEventBus.setDebugMode(true);
}
