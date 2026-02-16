/**
 * Aspect-based behaviors using IBehaviorContext pattern.
 *
 * These behaviors are stateless (or minimally stateful) and operate on block memory.
 * Strategies compose blocks by adding these behaviors.
 *
 * @module runtime/behaviors
 */

// ============================================================================
// Universal Invariants - Automatically added to ALL blocks
// ============================================================================
export { ReentryCounterBehavior } from './ReentryCounterBehavior';
export { CompletionTimestampBehavior } from './CompletionTimestampBehavior';

// ============================================================================
// Time Aspect
// ============================================================================
export { TimerBehavior } from './TimerBehavior';
export type { TimerConfig } from './TimerBehavior';
export { TimerInitBehavior } from './TimerInitBehavior';
export type { TimerInitConfig } from './TimerInitBehavior';
export { TimerTickBehavior } from './TimerTickBehavior';
export { TimerCompletionBehavior } from './TimerCompletionBehavior';
export type { TimerCompletionConfig } from './TimerCompletionBehavior';
export { TimerPauseBehavior } from './TimerPauseBehavior';

// TimerOutputBehavior is deprecated — elapsed computation is now
// consolidated into SegmentOutputBehavior (S5/S6/S10 resolution).

// ============================================================================
// Iteration Aspect
// ============================================================================
export { RoundInitBehavior } from './RoundInitBehavior';
export type { RoundInitConfig } from './RoundInitBehavior';
export { RoundAdvanceBehavior } from './RoundAdvanceBehavior';
export { RoundCompletionBehavior } from './RoundCompletionBehavior';
export { RoundOutputBehavior } from './RoundOutputBehavior';
export { RoundDisplayBehavior } from './RoundDisplayBehavior';
export { RepSchemeBehavior } from './RepSchemeBehavior';
export type { RepSchemeConfig } from './RepSchemeBehavior';
export { PromoteFragmentBehavior } from './PromoteFragmentBehavior';
export type { PromoteFragmentConfig } from './PromoteFragmentBehavior';

// ============================================================================
// Completion Aspect
// ============================================================================
export { PopOnNextBehavior } from './PopOnNextBehavior';
export { PopOnEventBehavior } from './PopOnEventBehavior';
export { CompletedBlockPopBehavior } from './CompletedBlockPopBehavior';
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
export { ChildLoopBehavior } from './ChildLoopBehavior';
export type { ChildLoopConfig } from './ChildLoopBehavior';
export { RestBlockBehavior } from './RestBlockBehavior';
export type { RestBlockBehaviorConfig } from './RestBlockBehavior';

// ============================================================================
// Output Aspect
// ============================================================================
export { SegmentOutputBehavior } from './SegmentOutputBehavior';
export { HistoryRecordBehavior } from './HistoryRecordBehavior';
export { SoundCueBehavior } from './SoundCueBehavior';
export type { SoundCue, SoundCueConfig } from './SoundCueBehavior';
// RoundOutputBehavior is also an output behavior

// ============================================================================
// Controls Aspect
// ============================================================================
export { ButtonBehavior } from './ButtonBehavior';
export type { ControlsConfig, ButtonConfig } from './ButtonBehavior';

// ============================================================================
// Lifecycle Aspect
// ============================================================================
export { WaitingToStartInjectorBehavior } from './WaitingToStartInjectorBehavior';
export { SessionCompletionBehavior } from './SessionCompletionBehavior';

// ============================================================================
// Utility Exports (not deprecated)
// ============================================================================
export { TimeSpan } from '../models/TimeSpan';
