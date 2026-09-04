// Hint vocabulary (Tier 3 §3.2)
export { CONSUMED_HINTS, CONSUMED_HINT_KEYS, hintMetric, hasHint, getHints, hintsToContainer } from '@bitcobblers/wod-wiki-engine';
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
export { WhiteboardScript } from '@bitcobblers/wod-wiki-engine';
export { BlockKey } from '@bitcobblers/wod-wiki-engine';
export { Duration, SpanDuration } from '@bitcobblers/wod-wiki-engine';
export { CodeStatement } from '@bitcobblers/wod-wiki-engine';
export { OutputStatement } from '@bitcobblers/wod-wiki-engine';
export type { IOutputStatement } from '@bitcobblers/wod-wiki-engine';
export type { CodeMetadata } from '@bitcobblers/wod-wiki-engine';

// Parser
export { createParser } from '@bitcobblers/wod-wiki-engine';

// Runtime engine
export { ScriptRuntime } from '@bitcobblers/wod-wiki-engine';
export { JitCompiler } from '@bitcobblers/wod-wiki-engine';
export { RuntimeStack } from '@bitcobblers/wod-wiki-engine';
export { RuntimeMemory } from '@bitcobblers/wod-wiki-engine';
export { RuntimeBlock } from '@bitcobblers/wod-wiki-engine';
export { BlockContext } from '@bitcobblers/wod-wiki-engine';

// Runtime interfaces
export type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeBlock } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeAction } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeMemory } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeBlockStrategy } from '@bitcobblers/wod-wiki-engine';
export type { IMemoryReference } from '@bitcobblers/wod-wiki-engine';
export { TypedMemoryReference } from '@bitcobblers/wod-wiki-engine';
export type { IEvent } from '@bitcobblers/wod-wiki-engine';
export type { IEventHandler } from '@bitcobblers/wod-wiki-engine';

export type { IBlockContext } from '@bitcobblers/wod-wiki-engine';

// Runtime actions
export * from '@bitcobblers/wod-wiki-engine';
export { ErrorAction } from '@bitcobblers/wod-wiki-engine';
export type { RuntimeError } from '@bitcobblers/wod-wiki-engine';

// Runtime behaviors - export new aspect-based behaviors
export * from '@bitcobblers/wod-wiki-engine';

// Runtime blocks
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';

// Extension registries (Tier 3 §3.4)
export { dialectRegistry } from '@bitcobblers/wod-wiki-engine';
export type { IDialect, DialectAnalysis } from '@bitcobblers/wod-wiki-engine';
export { strategyRegistry } from '@bitcobblers/wod-wiki-engine';
export { realtimeProcessorRegistry, summaryProcessorRegistry } from '@bitcobblers/wod-wiki-engine';
export type { IRealtimeProcessor } from '@bitcobblers/wod-wiki-engine';
export type { ISummaryProcessor } from '@bitcobblers/wod-wiki-engine';
export type { IAnalyticsProcessorDescriptor } from '@bitcobblers/wod-wiki-engine';

// Effort registry (Tier 3 §3.4)
export { CompositeEffortRegistry, InMemoryEffortRegistry } from '@bitcobblers/wod-wiki-lang';
export { EffortResolver } from '@bitcobblers/wod-wiki-lang';
export { getBundledEfforts as bundledEfforts, getBundledEffortCount as BUNDLED_EFFORT_COUNT } from './repositories/effort-markdown';
export type { IEffort, IEffortRegistry, IEffortResolver, ResolvedEffort } from '@bitcobblers/wod-wiki-lang';

// Registries
export { Registry } from '@bitcobblers/wod-wiki-engine';
// Fragments
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';
export * from '@bitcobblers/wod-wiki-engine';

// Fragment types
export { MetricType } from '@bitcobblers/wod-wiki-engine';
export type { IMetric } from '@bitcobblers/wod-wiki-engine';

// Fragment contracts & utilities
export type { IMetricSource, MetricFilter } from '@bitcobblers/wod-wiki-engine';
export type {
  MetricOwnershipLayer,
  MetricOwnershipLedger,
  MetricOwnershipPromotionCandidate,
  MetricOwnershipQuery,
  MetricOwnershipResolvedContribution,
  MetricOwnershipTypeExplanation,
} from '@bitcobblers/wod-wiki-engine';
export {
  METRIC_OWNERSHIP_LAYER_CHAIN,
  LEGACY_ORIGIN_TO_OWNERSHIP_LAYER,
  createMetricOwnershipLedger,
  getMetricOwnershipLayer,
  OwnershipResolver,
  ownershipRank,
} from '@bitcobblers/wod-wiki-engine';
export type { IMetricOwnershipResolver } from '@bitcobblers/wod-wiki-engine';
