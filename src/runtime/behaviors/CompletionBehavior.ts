import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { EmitEventAction } from '../actions/events/EmitEventAction';

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
    private readonly condition: (block: IRuntimeBlock) => boolean,
    private readonly checkOnEvents: string[] = []
  ) { }

  onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return [];
    }

    if (this.condition(block)) {
      return this.complete(block, options?.now);
    }

    return [];
  }

  onPop(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return [];
    }

    if (this.checkOnEvents.includes(event.name)) {
      if (this.condition(block)) {
        return this.complete(block, event.timestamp);
      }
    }

    return [];
  }

  onDispose(block: IRuntimeBlock): void {
    // No-op
  }

  private complete(block: IRuntimeBlock, timestamp?: Date): IRuntimeAction[] {
    this.isCompleteFlag = true;
    const now = timestamp ?? new Date();

    return [
      new EmitEventAction('block:complete', { blockId: block.key.toString() }, now),
      new PopBlockAction()
    ];
  }
}
