/**
 * BroadcastChannelRpcTransport — faithful IRpcTransport over a MessageChannel port.
 *
 * The local-tab dual-pane mirror opens a popup tab and exchanges a
 * `MessageChannel` port pair via a `BroadcastChannel` rendezvous. Each side
 * wraps its own port in this transport. From the rest of the cast stack's
 * perspective, this transport is indistinguishable from `WebRtcRpcTransport`:
 * the message shape (`RpcMessage`) is identical, the `connected` lifecycle is
 * the same, and `dispose()` cleans up.
 *
 * Wire shape
 * ----------
 * The transport's `port` is a `MessagePort`. The data flow is the
 * structured-cloned `RpcMessage` directly — no envelope, no transformation.
 * The control flow (`{ kind: 'offer' | 'accept' | 'goodbye' }` packets) lives
 * on a separate `BroadcastChannel` owned by the adapter, not on this port.
 * This keeps the wire shape identical to the chromecast transport.
 *
 * Disconnect semantics
 * --------------------
 * `connected` flips to `false` when the adapter calls `notifyDisconnected()`
 * (which the adapter does on `goodbye` from the BroadcastChannel) or when
 * `dispose()` is called. The transport does not implement its own
 * `messageerror` / port-close detection because the control channel is the
 * authoritative source of "is the peer alive."
 */

import type { IRpcTransport, RpcUnsubscribe } from './IRpcTransport';
import type { RpcMessage } from './RpcMessages';

export class BroadcastChannelRpcTransport implements IRpcTransport {
    private _connected = false;
    private readonly messageHandlers = new Set<(m: RpcMessage) => void>();
    private readonly connectedHandlers = new Set<() => void>();
    private readonly disconnectedHandlers = new Set<() => void>();
    private _disposed = false;

    private readonly portMessageUnsub: () => void;
    private boundHandler: (event: MessageEvent) => void;

    constructor(private readonly port: MessagePort) {
        this.boundHandler = (event: MessageEvent) => {
            const message = event.data as RpcMessage;
            // Snapshot to allow handlers to unsubscribe during dispatch
            for (const h of [...this.messageHandlers]) {
                h(message);
            }
        };
        this.port.addEventListener('message', this.boundHandler);
        this.portMessageUnsub = () => this.port.removeEventListener('message', this.boundHandler);
        // start() must be called by the adapter after both sides are paired.
    }

    /**
     * Mark the transport as connected and start the message port.
     * The adapter calls this after the handshake is complete.
     */
    start(): void {
        if (this._disposed) return;
        if (this._connected) return;
        this._connected = true;
        this.port.start();
        for (const h of [...this.connectedHandlers]) {
            h();
        }
    }

    /**
     * Called by the adapter when the peer is gone (goodbye message, control
     * channel closed). Idempotent.
     */
    notifyDisconnected(): void {
        if (this._disposed) return;
        if (!this._connected) return;
        this._connected = false;
        for (const h of [...this.disconnectedHandlers]) {
            h();
        }
    }

    get connected(): boolean {
        return this._connected;
    }

    send(message: RpcMessage): void {
        if (this._disposed) {
            throw new Error('BroadcastChannelRpcTransport: send after dispose');
        }
        if (!this._connected) {
            throw new Error('BroadcastChannelRpcTransport: send before connected');
        }
        // MessagePort.postMessage structured-clones the payload. RpcMessage is
        // a plain JSON-shaped object; structured clone preserves all fields
        // (string, number, plain object, array) with no transformation.
        this.port.postMessage(message);
    }

    onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe {
        this.messageHandlers.add(handler);
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connectedHandlers.add(handler);
        return () => {
            this.connectedHandlers.delete(handler);
        };
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.disconnectedHandlers.add(handler);
        return () => {
            this.disconnectedHandlers.delete(handler);
        };
    }

    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this.portMessageUnsub();
        try {
            this.port.close();
        } catch {
            // port may already be closed; ignore
        }
        this.messageHandlers.clear();
        this.connectedHandlers.clear();
        this.disconnectedHandlers.clear();
        this._connected = false;
    }
}
