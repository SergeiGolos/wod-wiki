import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock, BlockLifecycleOptions } from '../IRuntimeBlock';

/**
 * Context passed to all behavior lifecycle methods.
 * Encapsulates runtime, block, and optional lifecycle options.
 */
export interface IBehaviorContext {
  runtime: IScriptRuntime;
  block: IRuntimeBlock;
  options?: BlockLifecycleOptions;
}

/**
 * Operation types for behavior execution.
 */
export type BehaviorOperation = 'push' | 'next' | 'pop';

// ============================================================================
// Optional Sub-Interfaces
// ============================================================================

/**
 * Optional interface for behaviors that respond to block push events.
 * Implement this when a behavior needs to initialize state or emit
 * actions when a block is pushed onto the stack.
 */
export interface IPushBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * Optional interface for behaviors that respond to next/tick events.
 * Implement this when a behavior needs to handle iteration, time
 * progression, or child block completion.
 */
export interface INextBehavior {
  onNext(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * Optional interface for behaviors that respond to block pop events.
 * Implement this when a behavior needs to clean up state or emit
 * final actions when a block is removed from the stack.
 */
export interface IPopBehavior {
  onPop(context: IBehaviorContext): IRuntimeAction[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object implements IPushBehavior.
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
 * Type guard to check if an object implements INextBehavior.
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
 * Type guard to check if an object implements IPopBehavior.
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
// Main Interface
// ============================================================================

/**
 * High-level behavior interface with a single execution entry point.
 * 
 * Behaviors implement this interface and optionally implement the
 * sub-interfaces (IPushBehavior, INextBehavior, IPopBehavior) to
 * respond to specific lifecycle events.
 * 
 * The `do` method serves as the unified entry point that dispatches
 * to the appropriate sub-interface method based on the operation type.
 * 
 * @example
 * ```typescript
 * class MyBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
 *   onPush(context: IBehaviorContext): IRuntimeAction[] {
 *     return [new StartTimerAction(context.block.id)];
 *   }
 *   
 *   onPop(context: IBehaviorContext): IRuntimeAction[] {
 *     return [new StopTimerAction(context.block.id)];
 *   }
 * }
 * ```
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
// Abstract Base Class
// ============================================================================

/**
 * Abstract base class for behaviors that automatically dispatches
 * to the appropriate lifecycle method based on which interfaces
 * the concrete class implements.
 * 
 * Extend this class and implement one or more of the optional interfaces:
 * - IPushBehavior: Handle block push events
 * - INextBehavior: Handle next/tick events  
 * - IPopBehavior: Handle block pop events
 * 
 * The base class's `do` method will:
 * 1. Check if `this` implements the interface for the given operation
 * 2. If yes, call the interface method and return its actions
 * 3. If no, return an empty array
 * 
 * @example
 * ```typescript
 * // Behavior that only handles push and pop
 * class DisplayBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
 *   onPush(ctx: IBehaviorContext): IRuntimeAction[] {
 *     return [displayAction('push', 'timer', ctx.block.displayData)];
 *   }
 *   
 *   onPop(ctx: IBehaviorContext): IRuntimeAction[] {
 *     return [displayAction('pop', 'timer', ctx.block.id)];
 *   }
 * }
 * 
 * // Behavior that only handles next
 * class TickBehavior extends BaseBehavior implements INextBehavior {
 *   onNext(ctx: IBehaviorContext): IRuntimeAction[] {
 *     return [trackAction('tick', ctx.block.id)];
 *   }
 * }
 * ```
 */
export abstract class BaseBehavior implements IBehavior {
  /**
   * Dispatches to the appropriate lifecycle method based on the operation.
   * 
   * Tests `this` for the presence of IPushBehavior, INextBehavior, or
   * IPopBehavior interfaces and invokes the corresponding method if present.
   * 
   * @param operation - The lifecycle operation type
   * @param context - The behavior execution context
   * @returns Actions from the lifecycle method, or empty array if not implemented
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
// Utility Functions
// ============================================================================

/**
 * Compose multiple behaviors into a single behavior.
 * Executes each behavior in order and concatenates their actions.
 * 
 * @param behaviors - Array of behaviors to compose
 * @returns A new behavior that executes all given behaviors
 * 
 * @example
 * ```typescript
 * const timerBlockBehavior = composeBehaviors([
 *   new TimerBehavior(config),
 *   new DisplayBehavior(),
 *   new SoundBehavior(sounds),
 *   new TrackBehavior()
 * ]);
 * 
 * // Execute all behaviors for a push operation
 * const actions = timerBlockBehavior.do('push', context);
 * ```
 */
export function composeBehaviors(behaviors: IBehavior[]): IBehavior {
  return {
    do(operation: BehaviorOperation, context: IBehaviorContext): IRuntimeAction[] {
      return behaviors.flatMap(behavior => behavior.do(operation, context));
    }
  };
}

/**
 * Create a behavior from a simple function.
 * Useful for one-off behaviors that don't need a full class.
 * 
 * @param fn - Function that takes operation and context, returns actions
 * @returns An IBehavior instance
 * 
 * @example
 * ```typescript
 * const loggingBehavior = createBehavior((op, ctx) => {
 *   console.log(`${op}: ${ctx.block.id}`);
 *   return [];
 * });
 * ```
 */
export function createBehavior(
  fn: (operation: BehaviorOperation, context: IBehaviorContext) => IRuntimeAction[]
): IBehavior {
  return { do: fn };
}
