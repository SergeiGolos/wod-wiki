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
    private unsubscribes: Unsubscribe[] = [];
    private disposed = false;

    constructor(private readonly runtime: IScriptRuntime) {}

    dispatch(event: IEvent): void {
        if (this.disposed) return;
        this.runtime.handle(event);
    }

    onEvent(handler: (event: IEvent) => void): Unsubscribe {
        if (this.disposed) return () => {};

        // Register on the event bus as a callback listener for all events ('*')
        // using a synthetic owner ID so it doesn't get scope-filtered.
        const ownerId = `local-event-provider-${Date.now()}`;
        const unsub = this.runtime.eventBus.on('*', (event) => {
            handler(event);
        }, ownerId);
        this.unsubscribes.push(unsub);
        return unsub;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const unsub of this.unsubscribes) {
            unsub();
        }
        this.unsubscribes = [];
    }
}
