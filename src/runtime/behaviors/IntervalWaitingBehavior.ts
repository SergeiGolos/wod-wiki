import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { TimerBehavior } from './TimerBehavior';
import { IEvent } from '../contracts/events/IEvent';
import { NextAction } from '../actions/stack/NextAction';

/**
 * IntervalWaitingBehavior.
 * For EMOM/Interval blocks:
 * - On next(), checks if the interval timer is still running and not complete.
 * - If so, enters a waiting state and returns [].
 * - When timer:complete is received, triggers advance via NextAction.
 */
export class IntervalWaitingBehavior implements IRuntimeBehavior {
    private isWaiting: boolean = false;

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = options?.now || new Date();
        const timer = block.getBehavior(TimerBehavior);

        if (timer && timer.isRunning() && !timer.isComplete(now)) {
            this.isWaiting = true;
            return []; // Stop propagation/actions
        }

        this.isWaiting = false;
        return [];
    }

    onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
        if (event.name === 'timer:complete' && this.isWaiting) {
            const data = event.data as { blockId?: string };
            if (data?.blockId === block.key.toString()) {
                this.isWaiting = false;
                // Trigger advance now that the timer is done
                return [new NextAction()];
            }
        }
        return [];
    }

    onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
    onPop(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
    onDispose(_block: IRuntimeBlock): void { }
}
