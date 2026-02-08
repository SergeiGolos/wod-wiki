import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * PopOnEventBehavior marks the block complete when a specific event fires.
 * 
 * ## Aspect: Completion (Event-based)
 * 
 * Subscribes to the specified event type and marks complete when received.
 */
export class PopOnEventBehavior implements IRuntimeBehavior {
    constructor(private eventTypes: string[]) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to each event type
        for (const eventType of this.eventTypes) {
            ctx.subscribe(eventType as any, (event, subCtx) => {
                subCtx.markComplete(`event:${event.name}`);
                return [];
            });
        }

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
