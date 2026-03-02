import { IEvent } from './events/IEvent';
import { Unsubscribe } from './IRuntimeStack';

/**
 * Provides bidirectional event flow between runtime consumers.
 *
 * Implementations determine the transport:
 * - LocalEventProvider dispatches directly to the local IScriptRuntime
 * - ChromecastEventProvider sends/receives events over the RPC transport
 *
 * This abstracts away whether an event originates locally (button press)
 * or remotely (Chromecast D-Pad) — the runtime processes both identically.
 */
export interface IRuntimeEventProvider {
    /**
     * Dispatch an event to be processed by the runtime.
     * For local: calls runtime.handle(event) directly.
     * For chromecast: serializes and sends over the RPC channel.
     */
    dispatch(event: IEvent): void;

    /**
     * Listen for incoming events (from remote sources or the runtime event bus).
     * Returns an unsubscribe function.
     */
    onEvent(handler: (event: IEvent) => void): Unsubscribe;

    /**
     * Clean up resources.
     */
    dispose(): void;
}
