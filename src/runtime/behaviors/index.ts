/**
 * Aspect-based behaviors using IBehaviorContext pattern.
 * 
 * These behaviors are stateless (or minimally stateful) and operate on block memory.
 * Strategies compose blocks by adding these behaviors.
 * 
 * @module runtime/behaviors
 */

// ============================================================================
// Time Aspect
// ============================================================================
export { TimerInitBehavior } from './TimerInitBehavior';
export type { TimerInitConfig } from './TimerInitBehavior';
export { TimerTickBehavior } from './TimerTickBehavior';
export { TimerCompletionBehavior } from './TimerCompletionBehavior';
export { TimerPauseBehavior } from './TimerPauseBehavior';
export { TimerOutputBehavior } from './TimerOutputBehavior';

// ============================================================================
// Iteration Aspect
// ============================================================================
export { RoundInitBehavior } from './RoundInitBehavior';
export type { RoundInitConfig } from './RoundInitBehavior';
export { RoundAdvanceBehavior } from './RoundAdvanceBehavior';
export { RoundCompletionBehavior } from './RoundCompletionBehavior';
export { RoundOutputBehavior } from './RoundOutputBehavior';
export { RoundDisplayBehavior } from './RoundDisplayBehavior';

// ============================================================================
// Completion Aspect
// ============================================================================
export { PopOnNextBehavior } from './PopOnNextBehavior';
export { PopOnEventBehavior } from './PopOnEventBehavior';
// TimerCompletionBehavior and RoundCompletionBehavior are also completion behaviors

// ============================================================================
// Display Aspect
// ============================================================================
export { DisplayInitBehavior } from './DisplayInitBehavior';
export type { DisplayInitConfig } from './DisplayInitBehavior';
// RoundDisplayBehavior is also a display behavior (exported under Iteration)

// ============================================================================
// Children Aspect
// ============================================================================
export { ChildRunnerBehavior } from './ChildRunnerBehavior';
export type { ChildRunnerConfig } from './ChildRunnerBehavior';

// ============================================================================
// Output Aspect
// ============================================================================
export { SegmentOutputBehavior } from './SegmentOutputBehavior';
export { HistoryRecordBehavior } from './HistoryRecordBehavior';
export { SoundCueBehavior } from './SoundCueBehavior';
export type { SoundCue, SoundCueConfig } from './SoundCueBehavior';
// TimerOutputBehavior and RoundOutputBehavior are also output behaviors

// ============================================================================
// Controls Aspect
// ============================================================================
export { ControlsInitBehavior } from './ControlsInitBehavior';
export type { ControlsConfig, ButtonConfig, ControlsState } from './ControlsInitBehavior';

// ============================================================================
// Lifecycle Aspect
// ============================================================================
export { IdleInjectionBehavior } from './IdleInjectionBehavior';
export type { IdleConfig } from './IdleInjectionBehavior';

// ============================================================================
// Legacy Behaviors (Deprecated - Maintained for Backward Compatibility)
// ============================================================================
/** @deprecated Use HistoryRecordBehavior instead */
export { HistoryBehavior } from './HistoryBehavior';
/** @deprecated Use ControlsInitBehavior and DisplayInitBehavior instead */
export { ActionLayerBehavior } from './ActionLayerBehavior';
/** @deprecated Use ControlsInitBehavior with event-based patterns instead */
export { RuntimeControlsBehavior } from './RuntimeControlsBehavior';
/** @deprecated Use PopOnNextBehavior instead */
export { SinglePassBehavior } from './SinglePassBehavior';
/** @deprecated Use TimerInitBehavior, TimerTickBehavior, etc. instead */
export { TimerBehavior, type TimerDirection } from './TimerBehavior';
export { TimeSpan } from '../models/TimeSpan';
/** @deprecated Use SoundCueBehavior instead */
export { SoundBehavior, SOUND_MEMORY_TYPE } from './SoundBehavior';
/** @deprecated Use TimerInitBehavior with direction 'up' instead */
export { UnboundTimerBehavior } from './UnboundTimerBehavior';
/** @deprecated Use TimerInitBehavior with direction 'down' and durationMs instead */
export { BoundTimerBehavior } from './BoundTimerBehavior';
/** @deprecated Use RoundInitBehavior, RoundAdvanceBehavior, RoundCompletionBehavior instead */
export { BoundLoopBehavior } from './BoundLoopBehavior';
/** @deprecated Use RoundInitBehavior without total instead */
export { UnboundLoopBehavior } from './UnboundLoopBehavior';
