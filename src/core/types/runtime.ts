/**
 * Runtime types for WOD Wiki
 * 
 * These types define the runtime execution engine interfaces including
 * script runtime, blocks, actions, memory, and compilation strategies.
 * 
 * Note: All types are re-exported from src/runtime/ which is the canonical source.
 * Import from here for convenience, but the definitions live in src/runtime/.
 */

// NOTE
// `core/` must not depend on `runtime/`.
// This file intentionally exports only placeholders so older import sites
// still type-check, while `runtime` remains the canonical source.
//
// If you need these types, import from `@/runtime/contracts` instead.

export type IScriptRuntime = unknown;
export type IRuntimeBlock = unknown;
export type BlockLifecycleOptions = unknown;
export type IRuntimeAction = unknown;
export type IRuntimeMemory = unknown;
export type MemorySearchCriteria = unknown;
export type IMemoryReference = unknown;
export type TypedMemoryReference<T = unknown> = unknown;
export type IRuntimeBlockStrategy = unknown;
export type IRuntimeBehavior = unknown;
export type IBlockContext = unknown;
export type IRuntimeStack = unknown;
export type IRuntimeClock = unknown;
export type IEvent = unknown;
export type IEventBus = unknown;
export type IEventHandler = unknown;

export type RuntimeStack = unknown;
export type JitCompiler = unknown;
export type ScriptRuntime = unknown;
export type RuntimeBlock = unknown;
export type RuntimeMemory = unknown;
export type BlockContext = unknown;

export type ScriptRuntimeInterface = IScriptRuntime;
export type RuntimeBlockInterface = IRuntimeBlock;
export type RuntimeActionInterface = IRuntimeAction;
export type RuntimeMemoryInterface = IRuntimeMemory;
export type RuntimeBlockStrategyInterface = IRuntimeBlockStrategy;

// Re-export from core for convenience
export type { ICodeStatement } from './core';
