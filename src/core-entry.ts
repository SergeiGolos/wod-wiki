/**
 * Core Entry Point for WOD Wiki
 * 
 * Exports the parser, runtime engine, metrics, and core utilities.
 * This is the minimal import for parsing and executing workout scripts.
 * 
 * @example
 * ```typescript
 * import { WhiteboardScript, ScriptRuntime, JitCompiler } from 'wod-wiki/core';
 * ```
 */

// Core classes
export { WhiteboardScript } from './parser/WhiteboardScript';
export { BlockKey } from './core/models/BlockKey';
export { Duration, SpanDuration } from './core/models/Duration';
export { CodeStatement } from './core/models/CodeStatement';
export { OutputStatement } from './core/models/OutputStatement';
export type { IOutputStatement } from './core/models/OutputStatement';
export type { CodeMetadata } from './core/models/CodeMetadata';

// Parser
export { sharedParser } from './parser/parserInstance';

// Runtime engine
export { ScriptRuntime } from './runtime/ScriptRuntime';
export { JitCompiler } from './runtime/compiler/JitCompiler';
export { RuntimeStack } from './runtime/RuntimeStack';
export { RuntimeMemory } from './runtime/RuntimeMemory';
export { RuntimeBlock } from './runtime/RuntimeBlock';
export { BlockContext } from './runtime/BlockContext';

// Runtime interfaces
export type { IScriptRuntime } from './runtime/contracts/IScriptRuntime';
export type { IRuntimeBlock } from './runtime/contracts/IRuntimeBlock';
export type { IRuntimeAction } from './runtime/contracts/IRuntimeAction';
export type { IRuntimeMemory } from './runtime/contracts/IRuntimeMemory';
export type { IRuntimeBlockStrategy } from './runtime/contracts/IRuntimeBlockStrategy';
export type { IMemoryReference } from './runtime/contracts/IMemoryReference';
export { TypedMemoryReference } from './runtime/impl/TypedMemoryReference';
export type { IEvent } from './runtime/contracts/events/IEvent';
export type { IEventHandler } from './runtime/contracts/events/IEventHandler';

export type { IBlockContext } from './runtime/contracts/IBlockContext';

// Runtime actions
export * from './runtime/actions/stack/PushBlockAction';
export { ErrorAction } from './runtime/actions/ErrorAction';
export type { RuntimeError } from './runtime/actions/ErrorAction';

// Runtime behaviors - export new aspect-based behaviors
export * from './runtime/behaviors';

// Runtime blocks
export * from './runtime/blocks/EffortBlock';
export * from './runtime/blocks/SessionRootBlock';
export * from './runtime/blocks/WaitingToStartBlock';
export * from './runtime/blocks/RestBlock';

// Strategies
export * from './runtime/compiler/strategies';

// Fragments
export * from './runtime/compiler/metrics/TimerMetric';
export * from './runtime/compiler/metrics/RoundsMetric';
export * from './runtime/compiler/metrics/RepMetric';
export * from './runtime/compiler/metrics/EffortMetric';
export * from './runtime/compiler/metrics/DistanceMetric';
export * from './runtime/compiler/metrics/ResistanceMetric';
export * from './runtime/compiler/metrics/ActionMetric';
export * from './runtime/compiler/metrics/IncrementMetric';
export * from './runtime/compiler/metrics/GroupMetric';
export * from './runtime/compiler/metrics/TextMetric';

// Fragment types
export { MetricType } from './core/models/Metric';
export type { IMetric } from './core/models/Metric';

// Fragment contracts & utilities
export type { IMetricSource, MetricFilter } from './core/contracts/IMetricSource';
export type {
  MetricOwnershipLayer,
  MetricOwnershipLedger,
  MetricOwnershipPromotionCandidate,
  MetricOwnershipQuery,
  MetricOwnershipResolvedContribution,
  MetricOwnershipTypeExplanation,
} from './core/metrics/ownership';
export {
  METRIC_OWNERSHIP_LAYER_CHAIN,
  LEGACY_ORIGIN_TO_OWNERSHIP_LAYER,
  createMetricOwnershipLedger,
  getMetricOwnershipLayer,
} from './core/metrics/ownership';
export { resolveMetricPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from './core/utils/metricPrecedence';
