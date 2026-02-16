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
export { CompletionTimestampBehavior } from './CompletionTimestampBehavior';

// ============================================================================
// Time Aspect
// ============================================================================
export { TimerBehavior } from './TimerBehavior';
export type { TimerConfig } from './TimerBehavior';
export { TimerInitBehavior } from './TimerInitBehavior';
export type { TimerInitConfig } from './TimerInitBehavior';
export { TimerTickBehavior } from './TimerTickBehavior';
export { TimerEndingBehavior } from './TimerEndingBehavior';
export type { TimerEndingConfig, TimerEndingMode } from './TimerEndingBehavior';
export { TimerPauseBehavior } from './TimerPauseBehavior';

// ============================================================================
// Iteration Aspect
// ============================================================================
export { ReEntryBehavior } from './ReEntryBehavior';
export type { ReEntryConfig } from './ReEntryBehavior';
export { RoundsEndBehavior } from './RoundsEndBehavior';
export { RoundDisplayBehavior } from './RoundDisplayBehavior';
export { RepSchemeBehavior } from './RepSchemeBehavior';
export type { RepSchemeConfig } from './RepSchemeBehavior';
export { PromoteFragmentBehavior } from './PromoteFragmentBehavior';
export type { PromoteFragmentConfig } from './PromoteFragmentBehavior';

// ============================================================================
// Completion Aspect
// ============================================================================
export { LeafExitBehavior } from './LeafExitBehavior';
export type { LeafExitConfig } from './LeafExitBehavior';
export { CompletedBlockPopBehavior } from './CompletedBlockPopBehavior';
// TimerEndingBehavior and RoundsEndBehavior are also completion behaviors

// ============================================================================
// Display Aspect
// ============================================================================
export { DisplayInitBehavior } from './DisplayInitBehavior';
export type { DisplayInitConfig } from './DisplayInitBehavior';
// RoundDisplayBehavior is also a display behavior (exported under Iteration)

// ============================================================================
// Children Aspect
// ============================================================================
export { ChildSelectionBehavior } from './ChildSelectionBehavior';
export type { ChildSelectionConfig, ChildSelectionLoopCondition } from './ChildSelectionBehavior';

// ============================================================================
// Output Aspect
// ============================================================================
export { ReportOutputBehavior } from './ReportOutputBehavior';
export type { ReportOutputConfig } from './ReportOutputBehavior';
export { HistoryRecordBehavior } from './HistoryRecordBehavior';
export { SoundCueBehavior } from './SoundCueBehavior';
export type { SoundCue, SoundCueConfig } from './SoundCueBehavior';

// ============================================================================
// Controls Aspect
// ============================================================================
export { ButtonBehavior } from './ButtonBehavior';
export type { ControlsConfig, ButtonConfig } from './ButtonBehavior';

// ============================================================================
// Lifecycle Aspect
// ============================================================================
export { WaitingToStartInjectorBehavior } from './WaitingToStartInjectorBehavior';

// ============================================================================
// Utility Exports (not deprecated)
// ============================================================================
export { TimeSpan } from '../models/TimeSpan';
