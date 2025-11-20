/**
 * Core Entry Point for WOD Wiki
 * 
 * Exports the parser, runtime engine, fragments, and core utilities.
 * This is the minimal import for parsing and executing workout scripts.
 * 
 * @example
 * ```typescript
 * import { WodScript, ScriptRuntime, JitCompiler } from 'wod-wiki/core';
 * ```
 */

// Core classes
export { WodScript } from './parser/WodScript';
export { BlockKey } from './core/models/BlockKey';
export { Duration, SpanDuration } from './core/models/Duration';
export { CodeStatement } from './core/models/CodeStatement';
export type { CodeMetadata } from './core/models/CodeMetadata';
export { CollectionSpan } from './core/models/CollectionSpan';
export type { TimeSpan, Metric, MetricValue } from './core/models/CollectionSpan';

// Parser
export * from './parser/timer.parser';
export * from './parser/timer.tokens';
export * from './parser/timer.visitor';

// Runtime engine
export { ScriptRuntime } from './runtime/ScriptRuntime';
export { JitCompiler } from './runtime/JitCompiler';
export { RuntimeStack } from './runtime/RuntimeStack';
export { RuntimeMemory } from './runtime/RuntimeMemory';
export { RuntimeBlock } from './runtime/RuntimeBlock';
export { BlockContext } from './runtime/BlockContext';

// Runtime interfaces
export type { IScriptRuntime } from './runtime/IScriptRuntime';
export type { IRuntimeBlock } from './runtime/IRuntimeBlock';
export type { IRuntimeAction } from './runtime/IRuntimeAction';
export type { IRuntimeMemory } from './runtime/IRuntimeMemory';
export type { IRuntimeBlockStrategy } from './runtime/IRuntimeBlockStrategy';
export type { IMemoryReference, TypedMemoryReference } from './runtime/IMemoryReference';
export type { IEvent } from './runtime/IEvent';
export type { IEventHandler } from './runtime/IEventHandler';
// export type { IBehavior } from './runtime/IBehavior';
export type { IBlockContext } from './runtime/IBlockContext';

// Runtime actions
export * from './runtime/PushBlockAction';
export * from './runtime/PopBlockAction';
export * from './runtime/actions/ErrorAction';
export * from './runtime/actions/EmitMetricAction';
export * from './runtime/actions/EmitEventAction';
export * from './runtime/actions/RegisterEventHandlerAction';
export * from './runtime/actions/UnregisterEventHandlerAction';
export * from './runtime/actions/StartTimerAction';
export * from './runtime/actions/StopTimerAction';

// Runtime behaviors
export * from './runtime/behaviors/TimerBehavior';
export * from './runtime/behaviors/CompletionBehavior';
export * from './runtime/behaviors/LoopCoordinatorBehavior';

// Runtime blocks
export * from './runtime/blocks/TimerBlock';
export * from './runtime/blocks/RoundsBlock';
export * from './runtime/blocks/EffortBlock';

// Strategies
export * from './runtime/strategies';

// Fragments
export * from './fragments/TimerFragment';
export * from './fragments/RoundsFragment';
export * from './fragments/RepFragment';
export * from './fragments/EffortFragment';
export * from './fragments/DistanceFragment';
export * from './fragments/ResistanceFragment';
export * from './fragments/ActionFragment';
export * from './fragments/IncrementFragment';
export * from './fragments/LapFragment';
export * from './fragments/TextFragment';

// Fragment types
export { FragmentType } from './core/models/CodeFragment';
export type { ICodeFragment } from './core/models/CodeFragment';

// Utility exports
export { MetricCollector } from './runtime/MetricCollector';
export type { IMetricCollector } from './runtime/MetricCollector';

