/**
 * ChromecastSdk.ts
 *
 * Loads the Google Cast Application Framework (CAF) sender SDK and exposes a
 * thin, promise-based wrapper around device discovery and session management.
 *
 * Lifecycle
 * ---------
 * 1. Call `ChromecastSdk.load(appId)` once (idempotent).
 * 2. Await the returned promise — resolves when `window.__onGCastApiAvailable`
 *    fires and the SDK has been initialised with `appId`.
 * 3. Call `ChromecastSdk.requestSession()` to open the native device picker.
 * 4. Listen to `ChromecastSdk.on(event, handler)` for state changes.
 *
 * App ID
 * ------
 * You must register a Cast receiver at https://cast.google.com/publish.
 * Point the receiver URL to your TV page, e.g.:
 *   http://pluto:6006/#/tv?relay=ws://pluto:8080/ws
 * Copy the App ID (e.g. "ABCD1234") and set VITE_CAST_APP_ID in .env.local.
 */

declare global {
    interface Window {
        __onGCastApiAvailable?: (isAvailable: boolean, error?: unknown) => void;
        cast?: any;
        chrome?: any;
    }
}

export type CastSdkState =
    | 'not-loaded'
    | 'loading'
    | 'unavailable'   // SDK loaded but Cast not supported in this browser
    | 'ready'         // SDK ready, no active session
    | 'session-active';

type SdkEventName = 'state-changed' | 'session-started' | 'session-ended';
type SdkListener = (...args: unknown[]) => void;

class ChromecastSdkClass {
    private state: CastSdkState = 'not-loaded';
    private listeners: Map<SdkEventName, SdkListener[]> = new Map();
    private loadPromise: Promise<void> | null = null;
    private appId: string | null = null;

    // ── Event bus ────────────────────────────────────────────────────────────
    on(event: SdkEventName, listener: SdkListener) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event)!.push(listener);
        return () => this.off(event, listener);
    }

    off(event: SdkEventName, listener: SdkListener) {
        const arr = this.listeners.get(event) ?? [];
        this.listeners.set(event, arr.filter(l => l !== listener));
    }

    private emit(event: SdkEventName, ...args: unknown[]) {
        this.listeners.get(event)?.forEach(l => l(...args));
    }

    // ── State ────────────────────────────────────────────────────────────────
    getState(): CastSdkState { return this.state; }

    private setState(next: CastSdkState) {
        if (this.state !== next) {
            this.state = next;
            this.emit('state-changed', next);
        }
    }

    // ── Load ─────────────────────────────────────────────────────────────────
    /**
     * Load the Cast sender SDK and initialise with `appId`.
     * Safe to call multiple times — subsequent calls return the same promise.
     */
    load(appId: string): Promise<void> {
        if (this.loadPromise && this.appId === appId) return this.loadPromise;
        this.appId = appId;
        this.loadPromise = this._load(appId);
        return this.loadPromise;
    }

    private _load(appId: string): Promise<void> {
        this.setState('loading');

        return new Promise((resolve, reject) => {
            // Set callback BEFORE injecting the script — the SDK calls this
            // after the script executes.
            window.__onGCastApiAvailable = (isAvailable, error) => {
                if (!isAvailable) {
                    console.warn('[Cast SDK] Not available:', error);
                    this.setState('unavailable');
                    reject(new Error('Cast SDK unavailable'));
                    return;
                }

                try {
                    this._initFramework(appId);
                    resolve();
                } catch (err) {
                    this.setState('unavailable');
                    reject(err);
                }
            };

            // Inject SDK script if not already present
            const SCRIPT_SRC =
                'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

            if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
                const script = document.createElement('script');
                script.src = SCRIPT_SRC;
                script.onerror = () => {
                    this.setState('unavailable');
                    reject(new Error('Failed to load cast_sender.js'));
                };
                document.head.appendChild(script);
            }
            // If the script tag already exists the callback will fire on its own.
        });
    }

    private _initFramework(appId: string) {
        const { cast, chrome } = window;
        if (!cast?.framework) throw new Error('cast.framework not found after SDK load');

        const ctx = cast.framework.CastContext.getInstance();
        ctx.setOptions({
            receiverApplicationId: appId,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            resumeSavedSession: false,
        });

        // Listen for session state changes
        ctx.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: any) => {
                const SS = cast.framework.SessionState;
                switch (event.sessionState) {
                    case SS.SESSION_STARTED:
                    case SS.SESSION_RESUMED:
                        this.setState('session-active');
                        this.emit('session-started', ctx.getCurrentSession());
                        break;
                    case SS.SESSION_ENDED:
                    case SS.NO_SESSION:
                        this.setState('ready');
                        this.emit('session-ended');
                        break;
                }
            }
        );

        this.setState('ready');
        console.log('[Cast SDK] Initialised with App ID:', appId);
    }

    // ── Control ──────────────────────────────────────────────────────────────
    /**
     * Open the native Chromecast device picker.
     * Returns once the user selects a device (or throws on cancel / error).
     */
    async requestSession(): Promise<void> {
        if (!window.cast?.framework) throw new Error('Cast SDK not loaded');
        const ctx = window.cast.framework.CastContext.getInstance();
        const err = await ctx.requestSession();
        if (err) throw new Error(`Cast session request failed: ${err}`);
    }

    /** End the current cast session. */
    endSession() {
        window.cast?.framework?.CastContext.getInstance()
            ?.getCurrentSession()
            ?.endSession(true);
    }

    isSessionActive(): boolean {
        return this.state === 'session-active';
    }

    /**
     * Return the current Cast session, or null if none is active.
     * Used by SenderCastSignaling to attach message listeners for WebRTC.
     */
    getSession(): any /* cast.framework.CastSession */ | null {
        return window.cast?.framework?.CastContext.getInstance()
            ?.getCurrentSession() ?? null;
    }
}

export const ChromecastSdk = new ChromecastSdkClass();
