/**
 * ChromecastBackend — ICastBackend adapter that drives the real Chromecast
 * device picker and produces a `WebRtcRpcTransport` for the cast session.
 *
 * State stream
 * ------------
 * Mapped from `ChromecastSdk.getState()`:
 *   'not-loaded' | 'loading'  → 'ready'   (the SDK hasn't booted; the button
 *                                        should still render the click target
 *                                        — clicking it triggers load)
 *   'unavailable'             → 'unavailable'  (no Cast support in this browser)
 *   'ready'                   → 'ready'
 *   'session-active'          → 'session-active'
 *
 * On the SDK's `'session-ended'` event, we transition to `'session-ended'`.
 *
 * The chromecast SDK does not have a 'connecting' state — `requestSession()`
 * blocks on the user gesture (device picker), so we emit `'connecting'`
 * synchronously before calling it, mirroring the local backend's behavior.
 *
 * Why a port at this layer?
 * -------------------------
 * The button does not need to know about the SDK. It calls
 * `getCastBackend().startSession()`. The chromecast adapter owns the SDK
 * interaction; the local adapter owns the popup-and-broadcast-channel
 * interaction. The rest of the cast stack sees only an `IRpcTransport`.
 */

import { ChromecastSdk, type CastSdkState } from '../ChromecastSdk';
import { CAST_APP_ID, hasCustomCastAppId } from '../config';
import { SenderCastSignaling } from '../CastSignaling';
import { WebRtcRpcTransport } from '../rpc/WebRtcRpcTransport';
import type { IRpcTransport } from '../rpc/IRpcTransport';
import type { ICastBackend, ICastBackendState, StateUnsubscribe } from '../ICastBackend';

const sdkToBackend: Record<CastSdkState, ICastBackendState> = {
    'not-loaded': 'ready',
    'loading': 'ready',
    'unavailable': 'unavailable',
    'ready': 'ready',
    'session-active': 'session-active',
};

export class ChromecastBackend implements ICastBackend {
    private _state: ICastBackendState;
    private readonly stateListeners = new Set<(s: ICastBackendState) => void>();
    private sdkUnsubState: (() => void) | null = null;
    private sdkUnsubEnded: (() => void) | null = null;
    private activeTransport: WebRtcRpcTransport | null = null;
    private disposed = false;

    constructor() {
        this._state = sdkToBackend[ChromecastSdk.getState()];
        this.subscribeToSdk();
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

    private subscribeToSdk(): void {
        this.sdkUnsubState = ChromecastSdk.on('state-changed', (next: unknown) => {
            const mapped = sdkToBackend[next as CastSdkState] ?? 'ready';
            // Don't downgrade a 'session-active' state if our own startSession
            // already flipped it. We trust our internal state when it is more
            // specific than the SDK's coarse stream.
            if (this._state === 'connecting' || this._state === 'session-active') {
                return;
            }
            this.setState(mapped);
        });
        this.sdkUnsubEnded = ChromecastSdk.on('session-ended', () => {
            this.activeTransport = null;
            this.setState('session-ended');
        });
    }

    async startSession(): Promise<IRpcTransport> {
        if (this.disposed) {
            throw new Error('ChromecastBackend: startSession after dispose');
        }
        if (!hasCustomCastAppId) {
            this.setState('unavailable');
            throw new Error('ChromecastBackend: VITE_CAST_APP_ID is not configured');
        }

        this.setState('connecting');

        try {
            await ChromecastSdk.load(CAST_APP_ID);
        } catch (err) {
            this.setState(sdkToBackend[ChromecastSdk.getState()]);
            throw err;
        }

        if (this.disposed) {
            throw new Error('ChromecastBackend: dispose() called during SDK load');
        }

        if (ChromecastSdk.getState() === 'unavailable') {
            this.setState('unavailable');
            throw new Error('ChromecastBackend: Cast not supported in this browser');
        }

        // Open the native device picker. Throws on user-cancel.
        await ChromecastSdk.requestSession();

        if (this.disposed) {
            throw new Error('ChromecastBackend: dispose() called during requestSession');
        }

        const castSession = ChromecastSdk.getSession();
        if (!castSession) {
            this.setState('ready');
            throw new Error('ChromecastBackend: no Cast session after requestSession()');
        }

        // Best-effort ping to verify the receiver is up before we start
        // the WebRTC handshake. Mirrors the existing flow.
        try {
            await castSession.sendMessage('urn:x-cast:com.wodwiki', { type: 'ping', timestamp: Date.now() });
        } catch (err) {
            console.warn('[ChromecastBackend] namespace ping failed', err);
        }

        const signaling = new SenderCastSignaling(castSession);
        const transport = new WebRtcRpcTransport('offerer', signaling);
        await transport.connect();

        this.activeTransport = transport;
        transport.onDisconnected(() => {
            if (this._state === 'session-active') {
                this.activeTransport = null;
                this.setState('session-ended');
            }
        });
        this.setState('session-active');
        return transport;
    }

    endSession(): void {
        try {
            ChromecastSdk.endSession();
        } catch {
            // SDK may already be torn down; ignore
        }
        if (this.activeTransport) {
            this.activeTransport.dispose();
            this.activeTransport = null;
        }
        if (this._state !== 'unavailable') {
            this.setState('ready');
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.endSession();
        this.sdkUnsubState?.();
        this.sdkUnsubEnded?.();
        this.sdkUnsubState = null;
        this.sdkUnsubEnded = null;
        this.stateListeners.clear();
    }
}
