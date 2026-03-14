/**
 * useChromecast
 *
 * Hook to manage Chromecast casting for runtime execution.
 * Handles SDK initialization, session management, and message sending.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChromecastSdk, type CastSdkState } from '@/services/cast/ChromecastSdk';
import { SenderCastSignaling } from '@/services/cast/CastSignaling';
import { WebRTCTransport } from '@/services/cast/WebRTCTransport';
import { CAST_APP_ID, hasCustomCastAppId } from '@/services/cast/config';
import { v4 as uuidv4 } from 'uuid';

export interface UseChromecastResult {
  /** Current SDK state (not-loaded, loading, ready, session-active, unavailable) */
  sdkState: CastSdkState;
  /** Whether we're currently casting */
  isCasting: boolean;
  /** Whether we're connecting to a receiver */
  isConnecting: boolean;
  /** Request a casting session (opens device picker) */
  requestSession: () => Promise<void>;
  /** Send a message to the receiver */
  sendMessage: (type: string, payload?: unknown) => void;
  /** Stop casting session */
  stopCasting: () => void;
}

export function useChromecast(): UseChromecastResult {
  const [sdkState, setSdkState] = useState<CastSdkState>(ChromecastSdk.getState());
  const [isCasting, setIsCasting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const transportRef = useRef<WebRTCTransport | null>(null);
  const signalRef = useRef<SenderCastSignaling | null>(null);
  const sessionIdRef = useRef<string>(uuidv4().substring(0, 8));

  // Initialize SDK on mount
  useEffect(() => {
    if (!hasCustomCastAppId) {
      console.warn(
        '[useChromecast] Cast disabled: VITE_CAST_APP_ID not configured. ' +
        'Set VITE_CAST_APP_ID in .env.local to enable casting.'
      );
      return;
    }

    ChromecastSdk.load(CAST_APP_ID).catch((err) => {
      console.error('[useChromecast] Failed to load SDK:', err);
    });

    const unsub = ChromecastSdk.on('state-changed', (newState) => {
      setSdkState(newState as CastSdkState);
    });

    return unsub;
  }, []);

  // Request a cast session
  const requestSession = useCallback(async () => {
    if (sdkState === 'unavailable' || sdkState === 'not-loaded') {
      console.warn('[useChromecast] Cast SDK not ready');
      return;
    }

    setIsConnecting(true);

    try {
      await ChromecastSdk.requestSession();
      console.log('[useChromecast] Session requested');

      // Get the session from the SDK
      const session = (ChromecastSdk as any).session;
      if (!session) {
        throw new Error('No session after requestSession');
      }

      // Set up signaling and transport
      const signaling = new SenderCastSignaling(session);
      signalRef.current = signaling;

      const transport = new WebRTCTransport('offerer', signaling);
      transportRef.current = transport;

      // Wait for transport to connect
      await transport.connect();
      setIsCasting(true);

      console.log('[useChromecast] Connected to receiver');
    } catch (err) {
      console.error('[useChromecast] Failed to request session:', err);
      setIsCasting(false);
    } finally {
      setIsConnecting(false);
    }
  }, [sdkState]);

  // Send a message to the receiver
  const sendMessage = useCallback((type: string, payload?: unknown) => {
    const transport = transportRef.current;
    if (!transport || !isCasting) {
      console.warn('[useChromecast] Transport not ready');
      return;
    }

    const msg = {
      type,
      sessionId: sessionIdRef.current,
      payload,
    };

    transport.send(msg);
  }, [isCasting]);

  // Stop casting
  const stopCasting = useCallback(() => {
    const transport = transportRef.current;
    const signal = signalRef.current;

    if (transport) {
      transport.dispose();
      transportRef.current = null;
    }

    if (signal) {
      signal.dispose();
      signalRef.current = null;
    }

    setIsCasting(false);
  }, []);

  return {
    sdkState,
    isCasting,
    isConnecting,
    requestSession,
    sendMessage,
    stopCasting,
  };
}
