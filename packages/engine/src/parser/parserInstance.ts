/**
 * Parser factory.
 *
 * MdTimerRuntime is safe to construct per-call because:
 * - The Lexer is stateless after construction
 * - The Visitor clears its state at the start of each read() call
 * - A new Parser is created per read() call
 *
 * Use createParser() instead of a module-level singleton so tests and
 * production both go through the same seam.
 */
import { MdTimerRuntime } from './md-timer';

export function createParser(): MdTimerRuntime {
  return new MdTimerRuntime();
}

/**
 * @deprecated Use createParser() instead. The module-level singleton is
 * being removed to eliminate import-time side effects.
 */
export const sharedParser = /* @__PURE__ */ createParser();
