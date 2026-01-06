/**
 * Completion Strategy Pattern - Unified completion detection
 * 
 * This module consolidates completion logic that was previously scattered across
 * multiple behaviors. The strategy pattern provides:
 * - Single responsibility for completion detection
 * - Consistent completion semantics
 * - Easy addition of new completion types
 * - Better testability
 */

export { ICompletionStrategy } from '../contracts/ICompletionStrategy';
export { StrategyBasedCompletionBehavior } from './StrategyBasedCompletionBehavior';
export { TimerCompletionStrategy } from './TimerCompletionStrategy';
export { ConditionCompletionStrategy } from './ConditionCompletionStrategy';
