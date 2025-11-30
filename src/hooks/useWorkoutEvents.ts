/**
 * useWorkoutEvents - React hook for subscribing to workout events
 * 
 * This hook simplifies subscribing to the WorkoutEventBus from React components.
 * It handles subscription lifecycle automatically, cleaning up on unmount.
 * 
 * @example
 * ```tsx
 * // Subscribe to all events
 * useWorkoutEvents((event) => {
 *   switch (event.type) {
 *     case 'start-workout':
 *       console.log('Starting workout for block:', event.block.id);
 *       break;
 *     case 'stop-workout':
 *       console.log('Workout stopped with results:', event.results);
 *       break;
 *   }
 * });
 * 
 * // Subscribe to specific event type
 * useWorkoutEvents((event) => {
 *   if (event.type === 'start-workout') {
 *     initializeRuntime(event.block);
 *   }
 * });
 * ```
 */

import { useEffect, useCallback } from 'react';
import { workoutEventBus, WorkoutEvent, WorkoutEventSubscriber } from '../services/WorkoutEventBus';

/**
 * Hook to subscribe to workout events
 * 
 * @param handler - Function to call when an event is received
 * @param deps - Optional dependency array for memoizing the handler
 */
export function useWorkoutEvents(
  handler: WorkoutEventSubscriber,
  deps: React.DependencyList = []
): void {
  // Memoize the handler to prevent unnecessary re-subscriptions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    // Subscribe and get unsubscribe function
    const unsubscribe = workoutEventBus.subscribe(memoizedHandler);
    
    // Cleanup on unmount or when handler changes
    return unsubscribe;
  }, [memoizedHandler]);
}

/**
 * Hook to emit workout events
 * Returns a stable emit function
 * 
 * @example
 * ```tsx
 * const emit = useWorkoutEmit();
 * 
 * const handleStartClick = () => {
 *   emit({ type: 'start-workout', block: selectedBlock });
 * };
 * ```
 */
export function useWorkoutEmit(): (event: WorkoutEvent) => void {
  return useCallback((event: WorkoutEvent) => {
    workoutEventBus.emit(event);
  }, []);
}

/**
 * Combined hook for both subscribing and emitting
 * 
 * @example
 * ```tsx
 * const { emit } = useWorkoutEventBus((event) => {
 *   // Handle events
 * });
 * 
 * // Later, emit an event
 * emit({ type: 'pause-workout' });
 * ```
 */
export function useWorkoutEventBus(
  handler?: WorkoutEventSubscriber,
  deps: React.DependencyList = []
): { emit: (event: WorkoutEvent) => void } {
  // Subscribe if handler is provided
  if (handler) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWorkoutEvents(handler, deps);
  }

  const emit = useWorkoutEmit();
  
  return { emit };
}

export default useWorkoutEvents;
