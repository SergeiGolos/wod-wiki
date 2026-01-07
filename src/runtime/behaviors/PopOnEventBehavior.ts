import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IEvent } from '../contracts/events/IEvent';

/**
 * PopOnEventBehavior - Marks the block as complete when specific events are received.
 * 
 * This is a simple, single-responsibility behavior that can be composed
 * into blocks that should dismiss on certain events (like idle blocks).
 * 
 * @example
 * ```typescript
 * // Complete when 'stop' or 'view-results' events are received
 * new PopOnEventBehavior(['stop', 'view-results'])
 * ```
 */
export class PopOnEventBehavior implements IRuntimeBehavior {
    constructor(private readonly events: string[]) { }

    onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
        if (this.events.includes(event.name)) {
            // Mark block as complete - stack will pop it during sweep
            block.markComplete(`event-${event.name}`);
        }
        return [];
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
