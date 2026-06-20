/**
 * WorkoutEventBus — service-layer event channel for workout lifecycle events.
 *
 * Public surface is the {@link IServiceEventBus} interface (emit / subscribe).
 * Concrete adapter is {@link SimpleEventBus}.
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
 * workoutEventBus.emit({ type: 'start-workout', block: scriptBlock });
 *
 * // Subscribe (returns unsubscribe function)
 * useEffect(() => {
 *   return workoutEventBus.subscribe((event) => {
 *     if (event.type === 'start-workout') { ... }
 *   });
 * }, []);
 * ```
 */

import type { ScriptBlock, WorkoutResults } from '../components/Editor/types';
import { SimpleEventBus } from './events/SimpleEventBus';
import type { IServiceEventBus } from './events/IServiceEventBus';

/**
 * Union type for all workout-related events.
 *
 * Note: `next-segment` is a runtime-internal concern that leaked here.
 * It will be removed in a follow-up and routed via runtime.dispatch().
 */
export type WorkoutEvent =
  | { type: 'start-workout'; block: ScriptBlock }
  | { type: 'stop-workout'; results: WorkoutResults }
  | { type: 'pause-workout' }
  | { type: 'resume-workout' }
  | { type: 'next-segment' };

export type WorkoutEventSubscriber = (event: WorkoutEvent) => void;

/**
 * Workout-event channel. This is a typed instance of {@link SimpleEventBus},
 * exposed as an {@link IServiceEventBus} so the surface area is identical
 * across the codebase. Tests can construct their own `SimpleEventBus<WorkoutEvent>`
 * without going through this module.
 */
export const workoutEventBus: IServiceEventBus<WorkoutEvent> = new SimpleEventBus<WorkoutEvent>();
