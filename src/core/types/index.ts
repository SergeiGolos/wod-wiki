/**
 * WOD Wiki core types.
 *
 * Keep this barrel core-only so `@/core` does not pull runtime contracts
 * back into the parser/core dependency graph.
 */

export type {
  ICodeStatement,
  ParseError,
} from './core';

// TimeSpan remains part of the core domain model, but we re-export it directly
// from the model to avoid routing `@/core` through the legacy clock/runtime
// compatibility shims under `core/types/`.
export type { TimeSpan } from '../models/TimeSpan';
