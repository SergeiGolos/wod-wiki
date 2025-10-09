import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IEvent } from '../IEvent';

/**
 * CompletionBehavior provides generic completion detection.
 * 
 * Features:
 * - Accepts a condition function that determines completion
 * - Checks condition on onNext() calls
 * - Can be configured to check on specific events
 * - Emits block:complete when condition is met
 * - Flexible for various completion scenarios
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class CompletionBehavior implements IRuntimeBehavior {
  private isCompleteFlag = false;

  constructor(
    private readonly condition: (runtime: IScriptRuntime, block: IRuntimeBlock) => boolean,
    private readonly triggerEvents?: string[]
  ) {
    if (!condition || typeof condition !== 'function') {
      throw new TypeError('CompletionBehavior requires a valid condition function');
    }
  }

  /**
   * Check completion condition on next() calls.
   * Emits block:complete if condition returns true.
   */
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return []; // Already complete
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
