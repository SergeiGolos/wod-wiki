/**
 * LocalTabBackend — ICastBackend adapter for the local-tab dual-pane mirror.
 *
 * On `startSession()`:
 *  1. Generate a `sessionId` (uuid).
 *  2. Build the receiver URL: `${origin}/receiver-rpc.html?local=${sessionId}`.
 *  3. `window.open(...)` the receiver URL; keep the popup reference.
 *  4. Listen on `window.addEventListener('message', ...)` for the
 *     receiver's `{ kind: 'ready' }` packet (delivered via
 *     `window.opener.postMessage`).
 *  5. On `ready`: post `{ kind: 'offer', sessionId }` to the popup via
 *     `popup.postMessage`, and transfer the data port via the same call.
 *  6. Wait for the receiver's `{ kind: 'accept' }` packet on the
 *     `window.message` listener.
 *  7. Wrap `port1` in a `BroadcastChannelRpcTransport` and resolve.
 *
 * Why `postMessage` instead of `BroadcastChannel`?
 * -----------------------------------------------
 * `BroadcastChannel` between a window and its popup *should* work per
 * spec, but in practice the two browsing contexts can have different
 * event loops, IPC channels, and the popup's React app mounts after
 * the sender's listener is attached — leaving a window where the
 * sender's `BroadcastChannel.postMessage` is queued but the receiver's
 * listener is not yet on the same channel in the same context. This
 * caused race-condition drops in practice.
 *
 * `Window.postMessage` is the most reliable inter-context message
 * path. The sender has the popup's `Window` reference from
 * `window.open`. The popup has `window.opener` referencing the sender.
 * Both use the same `addEventListener('message', ...)` API on the
 * receiving end. There's no separate BroadcastChannel to keep in
 * sync.
 */

import { BroadcastChannelRpcTransport } from '../rpc/BroadcastChannelRpcTransport';
import type { IRpcTransport } from '../rpc/IRpcTransport';
import type { ICastBackend, ICastBackendState, StateUnsubscribe } from '../ICastBackend';

export const LOCAL_HANDSHAKE_TIMEOUT_MS = 5_000;

interface LocalTabBackendDeps {
    openPopup?: (url: string) => Window | null;
    /**
     * Override the listener that receives messages from the popup.
     * Defaults to the real `window.addEventListener('message', ...)`.
     */
    addEventListener?: (handler: (event: MessageEvent) => void) => () => void;
    /** Override `window.removeEventListener`. */
    removeEventListener?: (handler: (event: MessageEvent) => void) => void;
    /**
     * Post a message to the popup. Defaults to `popup.postMessage`.
     * The `targetOrigin` is `*` because the popup is same-origin by
     * construction (built from `getOrigin()` + the receiver HTML).
     */
    postToPopup?: (popup: Window, message: unknown) => void;
    generateId?: () => string;
    buildReceiverUrl?: (origin: string, sessionId: string) => string;
    MessageChannelCtor?: typeof MessageChannel;
    getOrigin?: () => string;
    setTimeoutFn?: (handler: () => void, ms: number) => unknown;
    clearTimeoutFn?: (handle: unknown) => void;
}

export const LOCAL_RECEIVER_HTML = '/receiver-rpc.html';

type ControlPacket = { kind: 'offer' | 'ready' | 'accept' | 'goodbye'; sessionId: string };

export class LocalTabBackend implements ICastBackend {
    private _state: ICastBackendState = 'ready';
    private readonly stateListeners = new Set<(s: ICastBackendState) => void>();

    private activePopup: Window | null = null;
    private activeTransport: BroadcastChannelRpcTransport | null = null;
    private activeTimeout: unknown = null;
    private activeSessionId: string | null = null;
    private pendingReject: ((reason: Error) => void) | null = null;
    private messageUnsub: (() => void) | null = null;
    private disposed = false;

    private readonly deps: Required<LocalTabBackendDeps>;

    constructor(deps: LocalTabBackendDeps = {}) {
        const defaultHandler = (handler: (event: MessageEvent) => void): (() => void) => {
            window.addEventListener('message', handler);
            return () => window.removeEventListener('message', handler);
        };
        this.deps = {
            openPopup: deps.openPopup ?? ((url: string) => window.open(url, '_blank', 'width=1280,height=720') as Window | null),
            addEventListener: deps.addEventListener ?? defaultHandler,
            removeEventListener: deps.removeEventListener ?? ((handler) => {
                window.removeEventListener('message', handler);
            }),
            postToPopup: deps.postToPopup ?? ((popup: Window, message: unknown) => {
                popup.postMessage(message, '*');
            }),
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
        console.log('[LocalTabBackend] startSession: opening popup', { url, sessionId });

        const popup = this.deps.openPopup(url);
        if (!popup) {
            this.setState('session-ended');
            this.activeSessionId = null;
            throw new Error('LocalTabBackend: window.open returned null (popup blocked?)');
        }
        this.activePopup = popup;
        console.log('[LocalTabBackend] popup opened', { sessionId });

        const mc = new this.deps.MessageChannelCtor();
        const ourPort = mc.port1;
        const theirPort = mc.port2;

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
            failHandshake(`LocalTabBackend: receiver did not complete handshake within ${LOCAL_HANDSHAKE_TIMEOUT_MS}ms`);
        }, LOCAL_HANDSHAKE_TIMEOUT_MS);

        const onMessage = (event: MessageEvent): void => {
            if (event.source !== popup) return; // not from our popup
            const data = event.data as { kind?: string; sessionId?: string; port?: MessagePort } | undefined;
            if (!data || typeof data !== 'object' || typeof data.kind !== 'string') return;
            if (data.sessionId !== sessionId) return;

            if (data.kind === 'ready') {
                console.log('[LocalTabBackend] received ready', { sessionId });
                // Receiver is listening on its window.message listener.
                // Post the offer and transfer the data port.
                try {
                    this.deps.postToPopup(popup, { kind: 'offer', sessionId });
                    console.log('[LocalTabBackend] posted offer', { sessionId });
                } catch (err) {
                    failHandshake(err instanceof Error ? err.message : String(err));
                    return;
                }
                try {
                    popup.postMessage({ kind: 'data-port', sessionId }, '*', [theirPort]);
                    console.log('[LocalTabBackend] transferred data port', { sessionId });
                } catch (err) {
                    failHandshake(err instanceof Error ? err.message : String(err));
                }
            } else if (data.kind === 'accept') {
                console.log('[LocalTabBackend] received accept', { sessionId });
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
                this.setState('session-active');
                resolve(transport);
            } else if (data.kind === 'goodbye') {
                if (this.activeTransport) {
                    this.activeTransport.notifyDisconnected();
                }
                this.activeTransport = null;
                this.activePopup = null;
                this.activeSessionId = null;
                this.setState('session-ended');
            }
        };

        this.messageUnsub = this.deps.addEventListener(onMessage);

        return promise;
    }

    private cleanupOnError(): void {
        this.deps.clearTimeoutFn(this.activeTimeout);
        this.activeTimeout = null;
        if (this.messageUnsub) {
            this.messageUnsub();
            this.messageUnsub = null;
        }
        // NOTE: do NOT close the popup here. The receiver React app needs
        // to stay open so the user can read the error UI. The popup
        // closes on `endSession()` or on a successful follow-up session.
        this.activeSessionId = null;
    }

    endSession(): void {
        if (this._state !== 'session-active' && this._state !== 'connecting') {
            return;
        }
        if (this.pendingReject) {
            this.pendingReject(new Error('LocalTabBackend: endSession called during handshake'));
            this.pendingReject = null;
        }
        if (this.activePopup && this.activeSessionId) {
            try {
                this.deps.postToPopup(this.activePopup, { kind: 'goodbye', sessionId: this.activeSessionId });
            } catch {
                // popup may already be closed
            }
        }
        if (this.messageUnsub) {
            this.messageUnsub();
            this.messageUnsub = null;
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
        const hadSession = this._state === 'session-active' || this.activeTransport !== null;
        if (!hadSession) {
            this.activePopup = null;
        }
        this.endSession();
        this.stateListeners.clear();
    }
}
