/**
 * Public type surface for package consumers.
 *
 * The engine packages (@bitcobblers/wod-wiki-engine umbrella over
 * core/lang/wql) own every runtime contract; this module preserves the
 * historical `wod-wiki/types` re-export surface for app code.
 */
import type {
  IScriptRuntime,
  IJitCompiler,
  IRuntimeBlock,
  BlockLifecycleOptions,
  IRuntimeAction,
  IRuntimeBehavior,
  IRuntimeStack,
  Unsubscribe,
  StackSnapshot,
  StackObserver,
  IRuntimeClock,
  IRuntimeBlockStrategy,
  IBlockContext,
  IMemoryReference,
  IEvent,
  IEventBus,
  IEventHandler,
  IRuntimeMemory,
  TypedMemoryReference,
  ScriptRuntime,
  RuntimeBlock,
  RuntimeMemory,
  RuntimeStack,
  JitCompiler,
  BlockContext,
} from '@bitcobblers/wod-wiki-engine';

// Core domain types
export type {
  ICodeStatement,
  ParseError,
  TimeSpan,
} from '@bitcobblers/wod-wiki-engine';

// Legacy alias preserved for existing `wod-wiki/types` consumers.
export type { ICodeStatement as RuntimeCodeStatement } from '@bitcobblers/wod-wiki-engine';

// Canonical runtime contract types
export type {
  IScriptRuntime,
  IJitCompiler,
  IRuntimeBlock,
  BlockLifecycleOptions,
  IRuntimeAction,
  IRuntimeBehavior,
  IRuntimeStack,
  Unsubscribe,
  StackSnapshot,
  StackObserver,
  IRuntimeClock,
  IRuntimeBlockStrategy,
  IBlockContext,
  IMemoryReference,
  IEvent,
  IEventBus,
  IEventHandler,
  IRuntimeMemory,
  TypedMemoryReference,
};

// Runtime implementation instance types exposed historically via `wod-wiki/types`
export type {
  ScriptRuntime,
  RuntimeBlock,
  RuntimeMemory,
  RuntimeStack,
  JitCompiler,
  BlockContext,
};
