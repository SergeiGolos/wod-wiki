import type {
  IRuntimeEventProvider,
  IEventReceivingRuntime,
} from '../contracts/IRuntimeEventProvider';
import type { EventName } from '../../types/cast/messages';

/**
 * Minimal transport interface for receiving messages from the Chromecast.
 * Matches the public API of `WebRTCTransport.on('message', ...)`.
 */
export interface ICastEventTransport {
  on(event: 'message', handler: (data: unknown) => void): () => void;
  off(event: 'message', handler: (data: unknown) => void): void;
}

/**
 * Event provider that receives user input events from the Chromecast
 * (D-Pad clicks relayed via WebRTC) and forwards them to the local runtime.
 *
 * Created when the Cast session is established. Disposed when it ends.
 */
export class CastEventProvider implements IRuntimeEventProvider {
  public readonly id: string;
  private _runtime: IEventReceivingRuntime | null = null;
  private _messageHandler: ((data: unknown) => void) | null = null;

  constructor(
    private readonly transport: ICastEventTransport,
    sessionId: string,
  ) {
    this.id = `cast-${sessionId}`;
  }

  get isConnected(): boolean {
    return this._runtime !== null;
  }

  connect(runtime: IEventReceivingRuntime): void {
    this.disconnect();
    this._runtime = runtime;

    this._messageHandler = (data: unknown) => {
      const msg = data as { type?: string; payload?: { event?: { name?: EventName; timestamp?: number; data?: unknown } } };
      if (msg.type !== 'event-from-receiver') return;

      const event = msg.payload?.event;
      if (!event?.name) return;

      console.log(`[CastEventProvider:${this.id}] Received remote event: "${event.name}"`);
      this._runtime?.handle({
        name: event.name,
        timestamp: new Date(event.timestamp ?? Date.now()),
        data: event.data,
      });
    };

    this.transport.on('message', this._messageHandler);
  }

  disconnect(): void {
    if (this._messageHandler) {
      this.transport.off('message', this._messageHandler);
      this._messageHandler = null;
    }
    this._runtime = null;
  }

  dispose(): void {
    this.disconnect();
  }
}
