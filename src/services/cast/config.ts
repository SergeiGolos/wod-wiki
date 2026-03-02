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
 * Cast Application ID.  Must be a Custom Receiver — the default Google
 * media receiver ('CC1AD845') does NOT support custom message namespaces.
 *
 * Register your receiver URL (e.g.
 *   https://pluto.forest-adhara.ts.net:6006/receiver.html
 * ) at https://cast.google.com/publish and paste the generated App ID.
 */
export const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

export const CAST_APP_ID = (import.meta.env.VITE_CAST_APP_ID || DEFAULT_MEDIA_RECEIVER_APP_ID).trim();

export const isCustomCastAppId = (appId: string): boolean => {
	return Boolean(appId) && appId !== DEFAULT_MEDIA_RECEIVER_APP_ID;
};

export const hasCustomCastAppId = isCustomCastAppId(CAST_APP_ID);

console.log('[Config] Cast App ID:', CAST_APP_ID);
