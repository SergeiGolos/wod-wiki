/**
 * Hooks Module
 * 
 * This module provides reusable React hooks for the WOD Wiki application.
 */

export { 
  useWorkoutEvents, 
  useWorkoutEmit, 
  useWorkoutEventBus 
} from './useWorkoutEvents';

export { 
  useWakeLock,
  type UseWakeLockOptions,
  type UseWakeLockResult 
} from './useWakeLock';
