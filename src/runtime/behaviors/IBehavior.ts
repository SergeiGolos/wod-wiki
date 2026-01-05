import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';

/**
 * @deprecated IBehaviorContext is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior instead, which receives runtime, block, and options
 * as separate parameters in its lifecycle methods.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export interface IBehaviorContext {
  runtime: IScriptRuntime;
  block: IRuntimeBlock;
  options?: BlockLifecycleOptions;
}

/**
 * @deprecated BehaviorOperation is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export type BehaviorOperation = 'push' | 'next' | 'pop';

// ============================================================================
// Optional Sub-Interfaces (Deprecated)
// ============================================================================

/**
 * @deprecated IPushBehavior is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior.onPush() instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export interface IPushBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * @deprecated INextBehavior is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior.onNext() instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export interface INextBehavior {
  onNext(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * @deprecated IPopBehavior is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior.onPop() instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export interface IPopBehavior {
  onPop(context: IBehaviorContext): IRuntimeAction[];
}

// ============================================================================
// Type Guards (Deprecated)
// ============================================================================

/**
 * @deprecated Part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior instead.
 */
export function isPushBehavior(obj: unknown): obj is IPushBehavior {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'onPush' in obj &&
    typeof (obj as IPushBehavior).onPush === 'function'
  );
}

/**
 * @deprecated Part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior instead.
 */
export function isNextBehavior(obj: unknown): obj is INextBehavior {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'onNext' in obj &&
    typeof (obj as INextBehavior).onNext === 'function'
  );
}

/**
 * @deprecated Part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior instead.
 */
export function isPopBehavior(obj: unknown): obj is IPopBehavior {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'onPop' in obj &&
    typeof (obj as IPopBehavior).onPop === 'function'
  );
}

// ============================================================================
// Main Interface (Deprecated)
// ============================================================================

/**
 * @deprecated IBehavior is an experimental pattern that was not adopted.
 * Use IRuntimeBehavior instead, which is the canonical behavior interface
 * used throughout the codebase.
 * 
 * **Why IRuntimeBehavior is preferred:**
 * - All production behaviors implement IRuntimeBehavior
 * - Simpler API with direct lifecycle methods (onPush, onNext, onPop, onDispose, onEvent)
 * - Better integration with the runtime system
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 * @see TimerBehavior for example implementation
 * @see BoundLoopBehavior for example implementation
 */
export interface IBehavior {
  /**
   * Execute the behavior for the given operation type.
   * 
   * @param operation - The lifecycle operation: 'push', 'next', or 'pop'
   * @param context - The behavior context containing runtime, block, and options
   * @returns Array of actions to execute, or empty array if no actions
   */
  do(operation: BehaviorOperation, context: IBehaviorContext): IRuntimeAction[];
}

// ============================================================================
// Abstract Base Class (Deprecated)
// ============================================================================

/**
 * @deprecated BaseBehavior is part of the deprecated IBehavior pattern.
 * Implement IRuntimeBehavior directly instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 * @see TimerBehavior for example implementation
 */
export abstract class BaseBehavior implements IBehavior {
  /**
   * Dispatches to the appropriate lifecycle method based on the operation.
   * 
   * @deprecated Use IRuntimeBehavior lifecycle methods directly instead.
   */
  do(operation: BehaviorOperation, context: IBehaviorContext): IRuntimeAction[] {
    switch (operation) {
      case 'push':
        if (isPushBehavior(this)) {
          return this.onPush(context);
        }
        break;

      case 'next':
        if (isNextBehavior(this)) {
          return this.onNext(context);
        }
        break;

      case 'pop':
        if (isPopBehavior(this)) {
          return this.onPop(context);
        }
        break;
    }

    return [];
  }
}

// ============================================================================
// Utility Functions (Deprecated)
// ============================================================================

/**
 * @deprecated composeBehaviors is part of the deprecated IBehavior pattern.
 * Use IRuntimeBehavior[] directly with RuntimeBlock instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export function composeBehaviors(behaviors: IBehavior[]): IBehavior {
  return {
    do(operation: BehaviorOperation, context: IBehaviorContext): IRuntimeAction[] {
      return behaviors.flatMap(behavior => behavior.do(operation, context));
    }
  };
}

/**
 * @deprecated createBehavior is part of the deprecated IBehavior pattern.
 * Implement IRuntimeBehavior directly instead.
 * 
 * @see IRuntimeBehavior for the canonical behavior interface
 */
export function createBehavior(
  fn: (operation: BehaviorOperation, context: IBehaviorContext) => IRuntimeAction[]
): IBehavior {
  return { do: fn };
}
