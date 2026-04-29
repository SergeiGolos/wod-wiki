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

export {
  useSpatialNavigation,
  type SpatialNavigationOptions,
  type FocusProps,
} from './useSpatialNavigation';

export {
  useCastSignaling,
  type UseCastSignalingReturn,
} from './useCastSignaling';

export {
  useRuntimeParser,
  runtimeFactory,
  type UseRuntimeParserReturn,
} from './useRuntimeParser';

export {
  useRuntimeDebug,
  type UseRuntimeDebugReturn,
} from './useRuntimeDebug';

export {
  useWorkbenchServices,
  type UseWorkbenchServicesReturn,
} from './useWorkbenchServices';

