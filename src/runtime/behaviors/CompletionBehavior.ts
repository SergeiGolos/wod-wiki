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
 */
export class CompletionBehavior implements IRuntimeBehavior {
  private isCompleteFlag = false;

  constructor(
    private readonly condition: (block: IRuntimeBlock, now: Date) => boolean,
    private readonly checkOnEvents: string[] = []
  ) { }

  onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return [];
    }

    const now = options?.now ?? new Date();
    if (this.condition(block, now)) {
      return this.complete(block, now);
    }

    return [];
  }

  onPop(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.isCompleteFlag) {
      return [];
    }

    // timer:complete event always triggers completion (user forced complete)
    if (event.name === 'timer:complete') {
      const data = event.data as { blockId?: string } | undefined;
      // Only complete if this event is for this block or has no blockId (global)
      if (!data?.blockId || data.blockId === block.key.toString()) {
        console.log(`[CompletionBehavior] timer:complete received, forcing completion`);
        return this.complete(block, event.timestamp ?? new Date());
      }
    }

    if (this.checkOnEvents.includes(event.name)) {
      const now = event.timestamp ?? new Date();
      if (this.condition(block, now)) {
        return this.complete(block, now);
      }
    }

    return [];
  }

  onDispose(_block: IRuntimeBlock): void {
    // No-op
  }

  private complete(block: IRuntimeBlock, timestamp: Date): IRuntimeAction[] {
    this.isCompleteFlag = true;

    return [
      new EmitEventAction('block:complete', { blockId: block.key.toString() }, timestamp),
      new PopBlockAction()
    ];
  }
}
