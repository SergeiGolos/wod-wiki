/**
 * Runtime types for WOD Wiki
 * 
 * These types define the runtime execution engine interfaces including
 * script runtime, blocks, actions, memory, and compilation strategies.
 * 
 * Note: All types are re-exported from src/runtime/ which is the canonical source.
 * Import from here for convenience, but the definitions live in src/runtime/.
 */

// Re-export canonical interfaces from src/runtime/
export type { IScriptRuntime } from '@/runtime/contracts';
export type { IRuntimeBlock, BlockLifecycleOptions } from '@/runtime/contracts';
export type { IRuntimeAction } from '@/runtime/contracts';
export type { IRuntimeMemory, MemorySearchCriteria } from '@/runtime/contracts';
export type { IMemoryReference, TypedMemoryReference } from '@/runtime/contracts';
export type { IRuntimeBlockStrategy } from '@/runtime/contracts';
export type { IRuntimeBehavior } from '@/runtime/contracts';
export type { IBlockContext } from '@/runtime/contracts';
export type { IRuntimeStack } from '@/runtime/contracts';
export type { IRuntimeClock } from '@/runtime/contracts';
export type { IEvent } from '@/runtime/contracts/events';
export type { IEventBus } from '@/runtime/contracts/events';
export type { IEventHandler } from '@/runtime/contracts/events';

// Re-export implementations
export type { RuntimeStack } from '@/runtime/RuntimeStack';
export type { JitCompiler } from '@/runtime/compiler';
export type { ScriptRuntime } from '@/runtime/ScriptRuntime';
export type { RuntimeMemory } from '@/runtime/RuntimeMemory';
export type { BlockContext } from '@/runtime/BlockContext';

// Convenience aliases for backward compatibility
export type { IScriptRuntime as ScriptRuntimeInterface } from '@/runtime/contracts';
export type { IRuntimeBlock as RuntimeBlockInterface } from '@/runtime/contracts';
export type { IRuntimeAction as RuntimeActionInterface } from '@/runtime/contracts';
export type { IRuntimeMemory as RuntimeMemoryInterface } from '@/runtime/contracts';

// Re-export from core for convenience
export type { ICodeStatement } from './core';
