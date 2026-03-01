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
// Each of the three behaviors covers the complete timer lifecycle.
// Strategies assign exactly ONE directly rather than composing the old quartet.
// ============================================================================
/** Span-only tracking — no tick, no display, no completion signal */
export { SpanTrackingBehavior } from './SpanTrackingBehavior';
/** Count-up timer with pause/resume — no fixed duration */
export { CountupTimerBehavior } from './CountupTimerBehavior';
export type { CountupTimerConfig } from './CountupTimerBehavior';
/** Count-down timer with tick monitoring, pause/resume, and expiry handling */
export { CountdownTimerBehavior } from './CountdownTimerBehavior';
export type { CountdownTimerConfig, CountdownMode } from './CountdownTimerBehavior';

// ============================================================================
// Iteration Aspect
// ============================================================================
/** @deprecated Round init is now handled by ChildSelectionBehavior (startRound/totalRounds config) */
export { ReEntryBehavior } from './ReEntryBehavior';
/** @deprecated Use the startRound/totalRounds fields on ChildSelectionBehavior */
export type { ReEntryConfig } from './ReEntryBehavior';
/** @deprecated Safety net is now built into ChildSelectionBehavior */
export { RoundsEndBehavior } from './RoundsEndBehavior';
export { FragmentPromotionBehavior } from './FragmentPromotionBehavior';
export type { FragmentPromotionConfig, PromotionRule } from './FragmentPromotionBehavior';

// ============================================================================
// Completion Aspect
// ============================================================================
/**
 * ExitBehavior — unified replacement for LeafExitBehavior + CompletedBlockPopBehavior.
 * Use `mode: 'immediate'` for leaf blocks, `mode: 'deferred'` for containers.
 */
export { ExitBehavior } from './ExitBehavior';
export type { ExitConfig } from './ExitBehavior';
/** @deprecated Use ExitBehavior({ mode: 'immediate' }) */
export { LeafExitBehavior } from './LeafExitBehavior';
/** @deprecated Use ExitBehavior({ mode: 'immediate' }) */
export type { LeafExitConfig } from './LeafExitBehavior';
/** @deprecated Use ExitBehavior({ mode: 'deferred' }) */
export { CompletedBlockPopBehavior } from './CompletedBlockPopBehavior';
// RoundsEndBehavior is also a completion behavior

// ============================================================================
// Display Aspect
// ============================================================================
export { LabelingBehavior } from './LabelingBehavior';
export type { LabelingConfig } from './LabelingBehavior';

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
