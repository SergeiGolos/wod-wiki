/**
 * Behavior Source Interfaces
 * 
 * These interfaces define contracts for behaviors that expose specific types of data.
 * They enable type-safe querying of behavior state without tight coupling to implementations.
 * 
 * Usage Pattern:
 * 1. Query a behavior that might implement the interface
 * 2. Use type guard to check implementation
 * 3. Access data through the interface
 * 
 * @example
 * ```typescript
 * import { isRoundSource, IRoundSource } from './contracts/behaviors';
 * 
 * const behavior = block.getBehavior(RoundPerLoopBehavior);
 * if (isRoundSource(behavior)) {
 *   const round = behavior.getRound();
 * }
 * ```
 */

// Round/iteration tracking
export type { IRoundSource } from './IRoundSource';
export { isRoundSource } from './IRoundSource';

// Child index/position tracking
export type { IChildIndexSource } from './IChildIndexSource';
export { isChildIndexSource } from './IChildIndexSource';

// Completion state
export type { ICompletionSource } from './ICompletionSource';
export { isCompletionSource } from './ICompletionSource';

// Timer/time tracking
export type { ITimerSource } from './ITimerSource';
export { isTimerSource } from './ITimerSource';

// Rep/metric configuration
export type { IRepSource } from './IRepSource';
export { isRepSource } from './IRepSource';
