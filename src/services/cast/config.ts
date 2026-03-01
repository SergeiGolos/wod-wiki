/**
 * Cast Configuration
 */

const getRelayUrl = () => {
    // 1. Check URL query parameters first (highest priority)
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const override = params.get('relay');
    if (override) return override;

    // 2. Fallback to Environment Variable
    const host = import.meta.env.VITE_CAST_RELAY_HOST || window.location.hostname;
    
    // 3. Use standard port 8080 as defined in scripts/dev-start.cjs
    return `ws://${host}:8080/ws`;
};

export const RELAY_URL = getRelayUrl();
console.log('[Config] Relay URL resolved to:', RELAY_URL);
