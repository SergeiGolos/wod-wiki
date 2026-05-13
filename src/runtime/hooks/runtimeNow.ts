declare global {
  interface Window {
    __chromecast_senderClockTimeMs?: () => number;
  }
}

/**
 * Returns the canonical "now" used for runtime timer interpolation.
 *
 * Browser workbench: falls back to Date.now().
 * Chromecast receiver: uses sender-synchronized clock when available.
 */
export function getRuntimeNowMs(): number {
  if (typeof window !== 'undefined') {
    const senderClock = window.__chromecast_senderClockTimeMs;
    if (typeof senderClock === 'function') {
      try {
        const value = senderClock();
        if (Number.isFinite(value)) {
          return value;
        }
      } catch {
        // Ignore sender clock failures and fall back to Date.now().
      }
    }
  }

  return Date.now();
}
