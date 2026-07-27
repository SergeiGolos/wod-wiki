/**
 * Public type surface for package consumers.
 *
 * Core-only types stay in `./core/types`; runtime contracts are exported from
 * their canonical runtime modules so we do not duplicate those definitions
 * under `core/types`.
 */

// Core domain types
export type {
  ICodeStatement,
  ParseError,
  TimeSpan,
} from './core/types';

// Legacy alias preserved for existing `wod-wiki/types` consumers.
export type { ICodeStatement as RuntimeCodeStatement } from './core/types/core';

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
  TypedMemoryReference,
} from './runtime/contracts';

export type {
  IRuntimeMemory,
  MemorySearchCriteria,
} from './runtime/contracts/IRuntimeMemory';

export type { IEventHandler } from './runtime/contracts/events/IEventHandler';

// Runtime implementation instance types exposed historically via `wod-wiki/types`
export type { ScriptRuntime } from './runtime/ScriptRuntime';
export type { RuntimeBlock } from './runtime/RuntimeBlock';
export type { RuntimeMemory } from './runtime/RuntimeMemory';
export type { RuntimeStack } from './runtime/RuntimeStack';
export type { JitCompiler } from './runtime/compiler/JitCompiler';
export type { BlockContext } from './runtime/BlockContext';
