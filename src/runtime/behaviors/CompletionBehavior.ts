import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { PopBlockAction } from '../PopBlockAction';

/**
 * CompletionBehavior provides generic completion detection.
 * 
 * Features:
 * - Accepts a condition function that determines completion
 * - Checks condition on onNext() calls
 * - Can be configured to check on specific events
 * - Emits block:complete when condition is met
 * - Returns PopBlockAction when block completes
 * - Flexible for various completion scenarios
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class CompletionBehavior implements IRuntimeBehavior {
  private isCompleteFlag = false;

  constructor(
    private readonly condition: (runtime: IScriptRuntime, block: IRuntimeBlock) => boolean,
    private readonly triggerEvents?: string[],
    private readonly checkOnPush: boolean = false,
    private readonly checkOnNext: boolean = true
  ) {
    if (!condition || typeof condition !== 'function') {
      throw new TypeError('CompletionBehavior requires a valid condition function');
    }
  }

  /**
   * Check completion condition on push() calls.
   * Only checks if checkOnPush flag is true.
   * Allows immediate completion for blocks that complete on mount.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return []; // Already complete
    }

    // Only check on push if explicitly enabled
    if (!this.checkOnPush) {
      return [];
    }

    // Check completion condition
    if (this.condition(runtime, block)) {
      this.isCompleteFlag = true;

      // Emit block:complete event
      runtime.handle({
        name: 'block:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
        },
      });

      // Return PopBlockAction to remove this block from the stack
      return [new PopBlockAction()];
    }

    return [];
  }

  /**
   * Check completion condition on next() calls.
   * Emits block:complete if condition returns true.
   */
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return []; // Already complete
    }

    // Only check on next if explicitly enabled (default true)
    if (!this.checkOnNext) {
        return [];
    }

    // Check completion condition
    if (this.condition(runtime, block)) {
      this.isCompleteFlag = true;

      // Emit block:complete event
      runtime.handle({
        name: 'block:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
        },
      });

      // Return PopBlockAction to remove this block from the stack
      return [new PopBlockAction()];
    }

    return [];
  }

  /**
   * Check completion condition on configured events.
   * Allows event-driven completion detection.
   */
  onEvent?(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return []; // Already complete
    }

    // Only check on configured trigger events
    if (this.triggerEvents && !this.triggerEvents.includes(event.name)) {
      return [];
    }

    // Check completion condition
    if (this.condition(runtime, block)) {
      this.isCompleteFlag = true;

      // Emit block:complete event
      runtime.handle({
        name: 'block:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
        },
      });

      // Return PopBlockAction to remove this block from the stack
      return [new PopBlockAction()];
    }

    return [];
  }

  /**
   * Check if completion has been triggered.
   */
  isComplete(): boolean {
    return this.isCompleteFlag;
  }

  /**
   * Reset completion state (for testing or reuse scenarios).
   */
  reset(): void {
    this.isCompleteFlag = false;
  }
}
