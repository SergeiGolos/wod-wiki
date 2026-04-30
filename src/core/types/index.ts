/**
 * WOD Wiki Types
 *
 * Barrel for the subset of core types that are consumed externally
 * via the `@/core` alias. Only re-export symbols that are genuinely
 * imported through this barrel — all other types should be imported
 * directly from their source files.
 */

// Core types actively consumed via the @/core barrel
export type {
  ICodeStatement,
  ParseError,
} from './core';

// Runtime types — intentional unknown placeholders for backward-compat import sites.
// Phase 2 cleanup: delete core/types/runtime.ts and migrate callers to @/runtime/contracts.
export type {
  IScriptRuntime,
  IRuntimeBlock,
  IRuntimeAction,
  MemorySearchCriteria,
  IMemoryReference,
  TypedMemoryReference,
  IRuntimeBlockStrategy,
  ScriptRuntime,
  RuntimeBlock,
  RuntimeMemory,
  RuntimeStack,
  JitCompiler,
  ICodeStatement as RuntimeCodeStatement,
} from './runtime';

// TimeSpan type — used by legacy import sites via @/core
export type { TimeSpan } from './clock';
