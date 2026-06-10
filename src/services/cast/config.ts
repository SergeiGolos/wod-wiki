/**
 * Cast Configuration
 *
 * The relay server has been replaced by peer-to-peer WebRTC.  Signaling
 * flows through the Google Cast SDK custom message namespace, and all
 * workout data is exchanged directly over an RTCDataChannel.
 *
 * Set VITE_CAST_APP_ID in .env.local to the App ID of your registered
 * Custom Receiver at https://cast.google.com/publish.
 */

/**
 * Default Cast App ID for non-development builds.
 *
 * Dev can override this with VITE_CAST_APP_ID (for example B82FCDD8).
 */
export const DEFAULT_CAST_APP_ID = '38F01E0E';

/**
 * Google's Default Media Receiver app ID (NOT valid for custom namespaces).
 */
export const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

export const CAST_APP_ID = (import.meta.env.VITE_CAST_APP_ID || DEFAULT_CAST_APP_ID).trim();

export const isCustomCastAppId = (appId: string): boolean => {
	return Boolean(appId) && appId !== DEFAULT_MEDIA_RECEIVER_APP_ID;
};

export const hasCustomCastAppId = isCustomCastAppId(CAST_APP_ID);

/**
 * Cast backend kind — selects which `ICastBackend` adapter the factory
 * (`getCastBackend()`) returns.
 *
 *   'chromecast'  — `ChromecastBackend`. Production / preview builds. The
 *                   user gesture opens the native Cast device picker; the
 *                   transport is a `WebRtcRpcTransport` over the Cast
 *                   message channel.
 *   'local'       — `LocalTabBackend`. Dev / dual-pane preview. The user
 *                   gesture opens a popup tab; the transport is a
 *                   `BroadcastChannelRpcTransport` over a `MessageChannel`.
 *   'auto'        — resolves at runtime: `chromecast` in production-like
 *                   builds (`MODE === 'production'`), `local` in dev. This
 *                   is the default — most builds don't need to set
 *                   `VITE_CAST_BACKEND` explicitly.
 *
 * The release / verify workflows set `VITE_CAST_BACKEND=chromecast`
 * explicitly. Dev workflows can leave it unset and get `'auto'` → `'local'`.
 */
export type CastBackendKind = 'chromecast' | 'local' | 'auto';

const rawCastBackend = (import.meta.env.VITE_CAST_BACKEND ?? '').toString().trim().toLowerCase();

function resolveAuto(): Exclude<CastBackendKind, 'auto'> {
    // Vite exposes MODE: 'development' | 'production' | 'test'.
    // In production-like builds (release, storybook publish), use the real
    // Chromecast backend. In dev, default to the local mirror so the cast
    // button is exercisable without a TV.
    if (import.meta.env.MODE === 'production') return 'chromecast';
    return 'local';
}

export const CAST_BACKEND: Exclude<CastBackendKind, 'auto'> = (
    rawCastBackend === 'chromecast' || rawCastBackend === 'local'
        ? rawCastBackend
        : resolveAuto()
) as Exclude<CastBackendKind, 'auto'>;


console.log('[Config] Cast backend:', CAST_BACKEND);
