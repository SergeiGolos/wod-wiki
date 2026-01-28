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
