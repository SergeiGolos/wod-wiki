/**
 * LocalTabBackend — ICastBackend adapter for the local-tab dual-pane mirror.
 *
 * On `startSession()`:
 *  1. Generate a `sessionId` (uuid).
 *  2. Build the receiver URL: `${origin}/receiver-rpc.html?local=${sessionId}`.
 *  3. `window.open(...)` the receiver URL; keep the popup reference.
 *  4. Open a `BroadcastChannel('wodwiki-local-${sessionId}')` for the
 *     control channel (handshake + goodbye).
 *  5. Create a `MessageChannel`; keep `port1` as the sender's data port.
 *  6. Transfer `port2` to the popup via `popup.postMessage({ kind: 'data-port' },
 *     '*', [port2])` — the receiver picks it up from the `message` event's
 *     `ports` array.
 *  7. Post `{ kind: 'offer', sessionId }` on the control channel.
 *  8. Wait for `{ kind: 'accept', sessionId }` from the receiver.
 *  9. Wrap `port1` in a `BroadcastChannelRpcTransport` and return it.
 *
 * Disconnect:
 *  - Receiver posts `{ kind: 'goodbye' }` on the control channel on its
 *    `beforeunload`. We call `transport.notifyDisconnected()` and flip our
 *    state to `'session-ended'`.
 *  - If we tear down (button click → endSession), we post `{ kind: 'goodbye' }`
 *    ourselves, close the popup via `popup.close()`, and dispose the
 *    transport.
 *
 * Why two channels (control + data)?
 * ----------------------------------
 * `BroadcastChannel.postMessage` does NOT accept a transfer list, so it
 * cannot carry a `MessagePort`. The data port must be transferred via
 * `Window.postMessage` (which does accept a transfer list) using the
 * popup reference from `window.open`. The BroadcastChannel carries the
 * handshake and goodbye signal — both plain JSON.
 *
 * The data path is a faithful `MessagePort` round-trip: `port1` on the
 * sender, `port2` on the receiver, paired by the `MessageChannel`. The
 * transport wrapper around `port1` is `BroadcastChannelRpcTransport`; the
 * receiver wraps `port2` in its own transport (Candidate 2, mirror
 * implementation, out of scope for this branch).
 *
 * Test surface
 * ------------
 * Dependencies (`openPopup`, `transferDataPort`, `createBroadcastChannel`,
 * `setTimeoutFn`, `generateId`, etc.) are injected via the constructor.
 * Tests use a stub popup that captures the `postMessage` call and a
 * parallel `BroadcastChannel` to act as the receiver.
 */

import { BroadcastChannelRpcTransport } from '../rpc/BroadcastChannelRpcTransport';
import type { IRpcTransport } from '../rpc/IRpcTransport';
import type { ICastBackend, ICastBackendState, StateUnsubscribe } from '../ICastBackend';

/**
 * Handshake timeout: how long we wait for the receiver tab to load, accept
 * the data-port transfer, and post its `accept` on the control channel.
 * 5 seconds — long enough for a cold load on a dev machine, short enough
 * to surface a missing-receiver regression within a user gesture.
 */
export const LOCAL_HANDSHAKE_TIMEOUT_MS = 5_000;

interface LocalTabBackendDeps {
    openPopup?: (url: string) => Window | null;
    transferDataPort?: (popup: Window, sessionId: string, port: MessagePort) => void;
    createBroadcastChannel?: (name: string) => BroadcastChannelLike;
    generateId?: () => string;
    buildReceiverUrl?: (origin: string, sessionId: string) => string;
    MessageChannelCtor?: typeof MessageChannel;
    getOrigin?: () => string;
    setTimeoutFn?: (handler: () => void, ms: number) => unknown;
    clearTimeoutFn?: (handle: unknown) => void;
}

export interface BroadcastChannelLike {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', handler: (event: { data: unknown }) => void): void;
    removeEventListener(type: 'message', handler: (event: { data: unknown }) => void): void;
    close(): void;
}

export const LOCAL_RECEIVER_HTML = '/receiver-rpc.html';

type ControlPacket = { kind: 'offer' | 'accept' | 'goodbye'; sessionId: string };

export class LocalTabBackend implements ICastBackend {
    private _state: ICastBackendState = 'ready';
    private readonly stateListeners = new Set<(s: ICastBackendState) => void>();

    private activePopup: Window | null = null;
    private activeControl: BroadcastChannelLike | null = null;
    private activeTransport: BroadcastChannelRpcTransport | null = null;
    private activeTimeout: unknown = null;
    private activeSessionId: string | null = null;
    private pendingReject: ((reason: Error) => void) | null = null;
    private disposed = false;

    private readonly deps: Required<LocalTabBackendDeps>;

    constructor(deps: LocalTabBackendDeps = {}) {
        this.deps = {
            openPopup: deps.openPopup ?? ((url: string) => window.open(url, '_blank', 'popup,width=1280,height=720') as Window | null),
            transferDataPort: deps.transferDataPort ?? ((popup: Window, _sessionId: string, port: MessagePort) => {
                popup.postMessage({ kind: 'data-port' }, '*', [port]);
            }),
            createBroadcastChannel: deps.createBroadcastChannel ?? ((name: string) => new BroadcastChannel(name) as unknown as BroadcastChannelLike),
            generateId: deps.generateId ?? (() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))),
            buildReceiverUrl: deps.buildReceiverUrl ?? ((origin: string, sessionId: string) => `${origin}${LOCAL_RECEIVER_HTML}?local=${sessionId}`),
            MessageChannelCtor: deps.MessageChannelCtor ?? (typeof MessageChannel !== 'undefined' ? MessageChannel : (undefined as unknown as typeof MessageChannel)),
            getOrigin: deps.getOrigin ?? (() => (typeof window !== 'undefined' ? window.location.origin : '')),
            setTimeoutFn: deps.setTimeoutFn ?? ((handler, ms) => setTimeout(handler, ms)),
            clearTimeoutFn: deps.clearTimeoutFn ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)),
        };
    }

    get state(): ICastBackendState {
        return this._state;
    }

    onStateChanged(handler: (state: ICastBackendState) => void): StateUnsubscribe {
        this.stateListeners.add(handler);
        return () => {
            this.stateListeners.delete(handler);
        };
    }

    private setState(next: ICastBackendState): void {
        if (this._state === next) return;
        this._state = next;
        for (const h of [...this.stateListeners]) {
            h(next);
        }
    }

    async startSession(): Promise<IRpcTransport> {
        if (this.disposed) {
            throw new Error('LocalTabBackend: startSession after dispose');
        }
        if (this._state === 'connecting' || this._state === 'session-active') {
            throw new Error('LocalTabBackend: startSession while a session is already active');
        }

        this.setState('connecting');

        const sessionId = this.deps.generateId();
        this.activeSessionId = sessionId;
        const url = this.deps.buildReceiverUrl(this.deps.getOrigin(), sessionId);

        const popup = this.deps.openPopup(url);
        if (!popup) {
            this.setState('session-ended');
            this.activeSessionId = null;
            throw new Error('LocalTabBackend: window.open returned null (popup blocked?)');
        }
        this.activePopup = popup;

        const channelName = `wodwiki-local-${sessionId}`;
        const control = this.deps.createBroadcastChannel(channelName);
        this.activeControl = control;

        const mc = new this.deps.MessageChannelCtor();
        const ourPort = mc.port1;
        const theirPort = mc.port2;

        try {
            this.deps.transferDataPort(popup, sessionId, theirPort);
        } catch (err) {
            this.cleanupOnError();
            this.setState('session-ended');
            this.activeSessionId = null;
            throw err instanceof Error ? err : new Error(String(err));
        }

        const { promise, resolve, reject } = Promise.withResolvers<IRpcTransport>();
        this.pendingReject = reject;

        const failHandshake = (msg: string): void => {
            this.cleanupOnError();
            this.setState('session-ended');
            this.activeSessionId = null;
            this.pendingReject = null;
            reject(new Error(msg));
        };

        this.activeTimeout = this.deps.setTimeoutFn(() => {
            failHandshake(`LocalTabBackend: receiver did not accept within ${LOCAL_HANDSHAKE_TIMEOUT_MS}ms`);
        }, LOCAL_HANDSHAKE_TIMEOUT_MS);

        // The handshake handler processes the initial `accept` and
        // uninstalls itself once the session is established. A separate
        // `goodbye` handler is installed alongside it and lives until the
        // transport is torn down — because goodbye arrives *after*
        // accept, when the user closes the receiver tab.
        const handshakeHandler = (event: { data: unknown }): void => {
            const packet = event.data as ControlPacket;
            if (!packet || typeof packet !== 'object' || typeof packet.kind !== 'string') return;
            if (packet.sessionId !== sessionId) return;
            if (packet.kind !== 'accept') return;

            control.removeEventListener('message', handshakeHandler);
            this.deps.clearTimeoutFn(this.activeTimeout);
            this.activeTimeout = null;
            this.pendingReject = null;

            const transport = new BroadcastChannelRpcTransport(ourPort);
            transport.onDisconnected(() => {
                if (this._state === 'session-active') {
                    this.setState('session-ended');
                }
            });
            transport.start();
            this.activeTransport = transport;
            this.activeControl = control;
            this.setState('session-active');
            resolve(transport);
        };

        const goodbyeHandler = (event: { data: unknown }): void => {
            const packet = event.data as ControlPacket;
            if (!packet || typeof packet !== 'object' || typeof packet.kind !== 'string') return;
            if (packet.sessionId !== sessionId) return;
            if (packet.kind !== 'goodbye') return;

            control.removeEventListener('message', goodbyeHandler);
            if (this.activeTransport) {
                this.activeTransport.notifyDisconnected();
            }
            this.activeTransport = null;
            this.activeControl = null;
            this.activePopup = null;
            this.activeSessionId = null;
            this.setState('session-ended');
        };

        control.addEventListener('message', handshakeHandler);
        control.addEventListener('message', goodbyeHandler);

        try {
            control.postMessage({ kind: 'offer', sessionId } satisfies ControlPacket);
        } catch (err) {
            failHandshake(err instanceof Error ? err.message : String(err));
        }

        return promise;
    }

    private cleanupOnError(): void {
        this.deps.clearTimeoutFn(this.activeTimeout);
        this.activeTimeout = null;
        if (this.activeControl) {
            try { this.activeControl.close(); } catch { /* ignore */ }
            this.activeControl = null;
        }
        if (this.activePopup) {
            try { this.activePopup.close(); } catch { /* ignore */ }
            this.activePopup = null;
        }
    }

    endSession(): void {
        if (this._state !== 'session-active' && this._state !== 'connecting') {
            return;
        }
        if (this.activeControl && this.activeSessionId) {
            try {
                this.activeControl.postMessage({ kind: 'goodbye', sessionId: this.activeSessionId } satisfies ControlPacket);
            } catch {
                // channel may already be closed
            }
        }
        if (this.activeTransport) {
            this.activeTransport.notifyDisconnected();
            this.activeTransport.dispose();
            this.activeTransport = null;
        }
        if (this.activeControl) {
            try { this.activeControl.close(); } catch { /* ignore */ }
            this.activeControl = null;
        }
        if (this.activePopup) {
            try { this.activePopup.close(); } catch { /* ignore */ }
            this.activePopup = null;
        }
        this.activeSessionId = null;
        this.setState('session-ended');
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.deps.clearTimeoutFn(this.activeTimeout);
        this.activeTimeout = null;
        if (this.pendingReject) {
            this.pendingReject(new Error('LocalTabBackend: dispose() called during handshake'));
            this.pendingReject = null;
        }
        this.endSession();
        this.stateListeners.clear();
    }
}
