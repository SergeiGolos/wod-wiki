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
export type { TypedMemoryReference } from './runtime/impl/TypedMemoryReference';
export type { IEvent } from './runtime/contracts/events/IEvent';
export type { IEventHandler } from './runtime/contracts/events/IEventHandler';

export type { IBlockContext } from './runtime/contracts/IBlockContext';

// Runtime actions
export * from './runtime/actions/stack/PushBlockAction';
export * from './runtime/actions/ErrorAction';

// Runtime behaviors — explicit named exports (avoid exporting deprecated symbols via wildcard)
export { CompletionTimestampBehavior } from './runtime/behaviors/CompletionTimestampBehavior';
export { SpanTrackingBehavior } from './runtime/behaviors/SpanTrackingBehavior';
export { CountupTimerBehavior } from './runtime/behaviors/CountupTimerBehavior';
export type { CountupTimerConfig } from './runtime/behaviors/CountupTimerBehavior';
export { CountdownTimerBehavior } from './runtime/behaviors/CountdownTimerBehavior';
export type { CountdownTimerConfig, CountdownMode } from './runtime/behaviors/CountdownTimerBehavior';
export { ExitBehavior } from './runtime/behaviors/ExitBehavior';
export type { ExitConfig } from './runtime/behaviors/ExitBehavior';
export { LabelingBehavior } from './runtime/behaviors/LabelingBehavior';
export type { LabelingConfig } from './runtime/behaviors/LabelingBehavior';
export { ChildSelectionBehavior } from './runtime/behaviors/ChildSelectionBehavior';
export type { ChildSelectionConfig, ChildSelectionLoopCondition } from './runtime/behaviors/ChildSelectionBehavior';
export { ReportOutputBehavior } from './runtime/behaviors/ReportOutputBehavior';
export type { ReportOutputConfig } from './runtime/behaviors/ReportOutputBehavior';
export { SoundCueBehavior } from './runtime/behaviors/SoundCueBehavior';
export type { SoundCue, SoundCueConfig } from './runtime/behaviors/SoundCueBehavior';
export { ButtonBehavior } from './runtime/behaviors/ButtonBehavior';
export type { ControlsConfig, ButtonConfig } from './runtime/behaviors/ButtonBehavior';
export { WaitingToStartInjectorBehavior } from './runtime/behaviors/WaitingToStartInjectorBehavior';
export { MetricPromotionBehavior } from './runtime/behaviors/MetricPromotionBehavior';
export type { MetricPromotionConfig, PromotionRule } from './runtime/behaviors/MetricPromotionBehavior';
// @deprecated behaviors — preserved for backward-compat but not part of new designs
export { ReEntryBehavior } from './runtime/behaviors/ReEntryBehavior';
export type { ReEntryConfig } from './runtime/behaviors/ReEntryBehavior';
export { RoundsEndBehavior } from './runtime/behaviors/RoundsEndBehavior';
export { LeafExitBehavior } from './runtime/behaviors/LeafExitBehavior';
export type { LeafExitConfig } from './runtime/behaviors/LeafExitBehavior';
export { CompletedBlockPopBehavior } from './runtime/behaviors/CompletedBlockPopBehavior';

// Runtime blocks
export * from './runtime/blocks/EffortBlock';
export * from './runtime/blocks/SessionRootBlock';
export * from './runtime/blocks/WaitingToStartBlock';
export * from './runtime/blocks/RestBlock';

// Strategies — explicit named exports so only the public-facing strategy classes
// appear in the library surface; internal helpers stay in their source files.
export { IdleBlockStrategy } from './runtime/compiler/strategies/IdleBlockStrategy';
export { SessionRootStrategy } from './runtime/compiler/strategies/SessionRootStrategy';
export { WaitingToStartStrategy } from './runtime/compiler/strategies/WaitingToStartStrategy';
export { AmrapLogicStrategy } from './runtime/compiler/strategies/logic/AmrapLogicStrategy';
export { IntervalLogicStrategy } from './runtime/compiler/strategies/logic/IntervalLogicStrategy';
export { GenericTimerStrategy } from './runtime/compiler/strategies/components/GenericTimerStrategy';
export { GenericLoopStrategy } from './runtime/compiler/strategies/components/GenericLoopStrategy';
export { GenericGroupStrategy } from './runtime/compiler/strategies/components/GenericGroupStrategy';
export { RestBlockStrategy } from './runtime/compiler/strategies/components/RestBlockStrategy';
export { ChildrenStrategy } from './runtime/compiler/strategies/enhancements/ChildrenStrategy';
export { SoundStrategy } from './runtime/compiler/strategies/enhancements/SoundStrategy';
export { ReportOutputStrategy } from './runtime/compiler/strategies/enhancements/ReportOutputStrategy';
export { EffortFallbackStrategy } from './runtime/compiler/strategies/fallback/EffortFallbackStrategy';

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
export { resolveMetricPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from './core/utils/metricPrecedence';
