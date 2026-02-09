/**
 * Shared MdTimerRuntime singleton instance.
 * 
 * MdTimerRuntime is safe to share because:
 * - The Lexer is stateless after construction
 * - The Visitor clears its state at the start of each read() call
 * - A new Parser is created per read() call
 * 
 * Use this instead of `new MdTimerRuntime()` to avoid redundant
 * Lexer/Visitor construction across the codebase.
 */
import { MdTimerRuntime } from './md-timer';

export const sharedParser = new MdTimerRuntime();
