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
export { OutputStatement } from './core/models/OutputStatement';
export type { IOutputStatement } from './core/models/OutputStatement';
export type { CodeMetadata } from './core/models/CodeMetadata';

// Parser
export * from './parser/timer.parser';
export * from './parser/timer.tokens';
export * from './parser/timer.visitor';

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
export type { IMemoryReference, TypedMemoryReference } from './runtime/contracts/IMemoryReference';
export type { IEvent } from './runtime/contracts/events/IEvent';
export type { IEventHandler } from './runtime/contracts/events/IEventHandler';

export type { IBlockContext } from './runtime/contracts/IBlockContext';

// Runtime actions
export * from './runtime/actions/stack/PushBlockAction';
export * from './runtime/actions/ErrorAction';

// Runtime behaviors - export new aspect-based behaviors
export * from './runtime/behaviors';

// Runtime blocks
export * from './runtime/blocks/EffortBlock';

// Strategies
export * from './runtime/compiler/strategies';

// Fragments
export * from './runtime/compiler/fragments/TimerFragment';
export * from './runtime/compiler/fragments/RoundsFragment';
export * from './runtime/compiler/fragments/RepFragment';
export * from './runtime/compiler/fragments/EffortFragment';
export * from './runtime/compiler/fragments/DistanceFragment';
export * from './runtime/compiler/fragments/ResistanceFragment';
export * from './runtime/compiler/fragments/ActionFragment';
export * from './runtime/compiler/fragments/IncrementFragment';
export * from './runtime/compiler/fragments/GroupFragment';
export * from './runtime/compiler/fragments/TextFragment';

// Fragment types
export { FragmentType } from './core/models/CodeFragment';
export type { ICodeFragment } from './core/models/CodeFragment';

// Fragment contracts & utilities
export type { IFragmentSource, FragmentFilter } from './core/contracts/IFragmentSource';
export { resolveFragmentPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from './core/utils/fragmentPrecedence';

// Fragment memory
export { DisplayFragmentMemory } from './runtime/memory/DisplayFragmentMemory';
export type { FragmentDisplayState } from './runtime/memory/MemoryTypes';
