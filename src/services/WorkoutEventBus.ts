/**
 * WorkoutEventBus - Centralized event system for workout lifecycle events.
 *
 * Backed by SimpleEventBus<WorkoutEvent>.  Public API is unchanged so all
 * existing callers continue to work without modification.
 *
 * Event Types:
 * - start-workout: User wants to start tracking a workout block
 * - stop-workout:  User stopped/completed a workout
 * - pause-workout: User paused the workout
 * - resume-workout: User resumed the workout
 * - next-segment:  (deprecated — will move to runtime.dispatch() per doctrine)
 *
 * @example
 * ```typescript
 * import { workoutEventBus } from '@/services/WorkoutEventBus';
 *
 * // Emit
 * workoutEventBus.emit({ type: 'start-workout', block: wodBlock });
 *
 * // Subscribe (returns unsubscribe function)
 * useEffect(() => {
 *   return workoutEventBus.subscribe((event) => {
 *     if (event.type === 'start-workout') { ... }
 *   });
 * }, []);
 * ```
 */

import type { WodBlock, WorkoutResults } from '../components/Editor/types';
import { SimpleEventBus } from './events/SimpleEventBus';

/**
 * Union type for all workout-related events.
 *
 * Note: `next-segment` is a runtime-internal concern that leaked here.
 * It will be removed in a follow-up and routed via runtime.dispatch().
 */
export type WorkoutEvent =
  | { type: 'start-workout'; block: WodBlock }
  | { type: 'stop-workout'; results: WorkoutResults }
  | { type: 'pause-workout' }
  | { type: 'resume-workout' }
  | { type: 'next-segment' };

/** @deprecated Use the unsubscribe function returned by subscribe() */
export type WorkoutEventSubscriber = (event: WorkoutEvent) => void;

class WorkoutEventBus {
  private bus = new SimpleEventBus<WorkoutEvent>();
  private debugMode = false;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  subscribe(fn: WorkoutEventSubscriber): () => void {
    return this.bus.subscribe(fn);
  }

  emit(event: WorkoutEvent): void {
    if (this.debugMode) {
      console.debug('[WorkoutEventBus] emit', event.type);
    }
    try {
      this.bus.emit(event);
    } catch (error) {
      console.error('[WorkoutEventBus] Subscriber error:', error);
    }
  }

  get subscriberCount(): number {
    return this.bus.size;
  }

  clear(): void {
    // Replace the underlying bus so all listeners are dropped atomically.
    this.bus = new SimpleEventBus<WorkoutEvent>();
  }
}

export const workoutEventBus = new WorkoutEventBus();

const windowWithDebug = typeof window !== 'undefined' ? window as Window & { __WOD_WIKI_DEBUG__?: boolean } : null;
if (windowWithDebug?.__WOD_WIKI_DEBUG__) {
  workoutEventBus.setDebugMode(true);
}
