/**
 * Strategy aggregation barrel.
 *
 * Prefer direct source imports for new code:
 *   import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
 *
 * This file is kept as a convenience aggregation but is NOT the primary
 * import path — explicit named imports from source files avoid exporting
 * internal helpers (e.g. buildChildGroupsWithContext) into callers.
 */

// Root / Direct-build strategies
export { IdleBlockStrategy, idleBlockStrategy } from './IdleBlockStrategy';
export type { IdleBlockConfig } from './IdleBlockStrategy';
export { SessionRootStrategy, sessionRootStrategy } from './SessionRootStrategy';
export { WaitingToStartStrategy } from './WaitingToStartStrategy';

// Logic strategies (Priority 90)
export { AmrapLogicStrategy } from './logic/AmrapLogicStrategy';
export { IntervalLogicStrategy } from './logic/IntervalLogicStrategy';

// Component strategies (Priority 50)
export { GenericTimerStrategy } from './components/GenericTimerStrategy';
export { GenericLoopStrategy } from './components/GenericLoopStrategy';
export { GenericGroupStrategy } from './components/GenericGroupStrategy';
export { RestBlockStrategy } from './components/RestBlockStrategy';

// Enhancement strategies (Priority 20-50)
export { ChildrenStrategy } from './enhancements/ChildrenStrategy';
export { SoundStrategy } from './enhancements/SoundStrategy';
export { ReportOutputStrategy } from './enhancements/ReportOutputStrategy';

// Fallback strategies (Priority 0)
export { EffortFallbackStrategy } from './fallback/EffortFallbackStrategy';
