import { IRuntimeEventProvider } from '../contracts/IRuntimeEventProvider';
import { IEvent } from '../contracts/events/IEvent';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { Unsubscribe } from '../contracts/IRuntimeStack';

/**
 * LocalEventProvider — dispatches events directly to the local IScriptRuntime.
 *
 * - dispatch(event) → runtime.handle(event), which triggers the event bus
 *   and executes resulting actions in a single turn.
 * - onEvent(handler) → registers on the runtime event bus to receive
 *   all events (using the 'global' callback registration path).
 */
export class LocalEventProvider implements IRuntimeEventProvider {
    private static subscriptionCounter = 0;

    private unsubscribes: Unsubscribe[] = [];
    private disposed = false;

    constructor(private readonly runtime: IScriptRuntime) {}

    dispatch(event: IEvent): void {
        if (this.disposed) return;
        this.runtime.handle(event);
    }

    onEvent(handler: (event: IEvent) => void): Unsubscribe {
        if (this.disposed) return () => {};

        const ownerId = `local-event-provider-${LocalEventProvider.subscriptionCounter++}`;
        const unsubscribeFromBus = this.runtime.eventBus.on('*', (event) => {
            handler(event);
        }, ownerId);

        const unsubscribe: Unsubscribe = () => {
            unsubscribeFromBus();
            this.unsubscribes = this.unsubscribes.filter((candidate) => candidate !== unsubscribe);
        };

        this.unsubscribes.push(unsubscribe);
        return unsubscribe;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        const unsubscribes = [...this.unsubscribes];
        this.unsubscribes = [];
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
    }
}
