/**
 * Typed Block Hierarchy — Hybrid Architecture
 *
 * This module exports the typed block system that replaces
 * behavior-composed RuntimeBlocks with explicit block subclasses.
 *
 * Typed blocks own their lifecycle and completion policy.
 * Cross-cutting concerns (analytics, sound, history) are handled
 * by FragmentProcessors, not by the blocks themselves.
 *
 * @module runtime/typed-blocks
 */

// ============================================================================
// Foundation
// ============================================================================
export { FragmentBucket } from './FragmentBucket';
export type { FragmentChangeListener } from './FragmentBucket';

export { TypedBlock } from './TypedBlock';
export type { TypedBlockConfig } from './TypedBlock';

export { TimerCapability } from './TimerCapability';

// ============================================================================
// Abstract Base Classes
// ============================================================================
export { LeafBlock } from './LeafBlock';

export { ContainerBlock } from './ContainerBlock';
export type { ContainerBlockConfig, LoopCondition } from './ContainerBlock';

// ============================================================================
// Concrete Leaf Blocks
// ============================================================================
export { GateBlock } from './GateBlock';
export type { GateBlockConfig } from './GateBlock';

export { TimerLeafBlock } from './TimerLeafBlock';
export type { TimerLeafBlockConfig } from './TimerLeafBlock';

export { EffortLeafBlock } from './EffortLeafBlock';
export type { EffortLeafBlockConfig } from './EffortLeafBlock';

// ============================================================================
// Concrete Container Blocks
// ============================================================================
export { SequentialContainerBlock } from './SequentialContainerBlock';
export type { SequentialContainerBlockConfig } from './SequentialContainerBlock';

export { RoundLoopBlock } from './RoundLoopBlock';
export type { RoundLoopBlockConfig } from './RoundLoopBlock';

export { AmrapBlock } from './AmrapBlock';
export type { AmrapBlockConfig } from './AmrapBlock';

export { EmomBlock } from './EmomBlock';
export type { EmomBlockConfig } from './EmomBlock';

export { WorkoutRootBlock } from './WorkoutRootBlock';
export type { WorkoutRootBlockConfig } from './WorkoutRootBlock';

// ============================================================================
// Processor System
// ============================================================================
export { ProcessorRegistry } from './IFragmentProcessor';
export type { IFragmentProcessor } from './IFragmentProcessor';
