/**
 * Cast Configuration
 */

const getRelayUrl = () => {
    const search = window.location.search || window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(search);
    let url = params.get('relay');

    if (!url) {
        // 1. Try to use the current hostname
        let host = window.location.hostname;

        // 2. CRITICAL: If hostname is 0.0.0.0, it won't work for Chromecast.
        // We hardcode your Tailscale name here as the 'Preferred Host' for this environment.
        if (host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost') {
            host = 'pluto.forest-adhara.ts.net';
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        url = `${protocol}://${host}:8080/ws`;
    }

    // Security Force: If the page is HTTPS, the relay MUST be WSS
    if (window.location.protocol === 'https:' && url.startsWith('ws:')) {
        url = url.replace('ws:', 'wss:');
    }

    return url;
};

export const RELAY_URL = getRelayUrl();
export const CAST_APP_ID = import.meta.env.VITE_CAST_APP_ID || 'CC1AD845';
console.log('[Config] Relay URL:', RELAY_URL);
