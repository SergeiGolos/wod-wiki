import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';

export interface LeafExitConfig {
    onNext?: boolean;
    onEvents?: string[];
}

export class LeafExitBehavior implements IRuntimeBehavior {
    private readonly config: Required<LeafExitConfig>;
    private unsubscribers: Unsubscribe[] = [];

    constructor(config?: LeafExitConfig) {
        this.config = {
            onNext: config?.onNext ?? true,
            onEvents: config?.onEvents ?? []
        };
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        for (const eventName of this.config.onEvents) {
            const unsubscribe = ctx.subscribe(eventName as any, (event, eventCtx) => {
                eventCtx.markComplete(`event:${event.name}`);
                return [new PopBlockAction()];
            });
            this.unsubscribers.push(unsubscribe);
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (!this.config.onNext) {
            return [];
        }

        ctx.markComplete('user-advance');
        return [new PopBlockAction()];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
        this.unsubscribers = [];
    }
}
