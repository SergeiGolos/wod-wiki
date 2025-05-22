import { useState, useEffect, useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';
import { CAST_NAMESPACE, StartClockPayload } from '../types/chromecast-events';
import { OutputEvent } from "@/core/OutputEvent";
import { OutputEventType } from '@/core/OutputEventType';

export interface ChromecastState {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: Error | null;
}

export interface UseCastSenderResult {
  state$: BehaviorSubject<ChromecastState>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (event: OutputEvent) => Promise<void>;
  sendStartClock: (payload?: StartClockPayload) => Promise<void>;
  sendStopClock: () => Promise<void>;
  sendResetClock: () => Promise<void>;
}

/**
 * React hook for managing Chromecast sender connection and messaging
 * Exposes state$ observable, connect/disconnect, and sendMessage (no-op if not connected)
 */
export function useCastSender(): UseCastSenderResult {
  const [state, setState] = useState<ChromecastState>({
    isAvailable: false,
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    error: null,
  });
  const state$ = new BehaviorSubject<ChromecastState>(state);

  // Load Cast API script and set up event listeners
  useEffect(() => {
    let isMounted = true;
    function handleAvailability() {
      if (!(window as Window)|| !window.cast) return;
      setState(s => ({ ...s, isAvailable: true }));
      state$.next({ ...state, isAvailable: true });
    }
    function handleSessionUpdate(session: any) {
      if (!isMounted) return;
      setState(s => ({
        ...s,
        isConnected: !!session,
        deviceName: session?.receiver?.friendlyName || null,
        isConnecting: false,
        error: null,
      }));
      state$.next({
        ...state,
        isConnected: !!session,
        deviceName: session?.receiver?.friendlyName || null,
        isConnecting: false,
        error: null,
      });
    }
    // Load Cast API
    if (!window || !window.cast) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      script.onload = handleAvailability;
      script.onerror = () => {
        setState(s => ({ ...s, error: new Error('Failed to load Cast API script') }));
        state$.next({ ...state, error: new Error('Failed to load Cast API script') });
      };
      document.head.appendChild(script);
    } else {
      handleAvailability();
    }
    // Listen for session changes
    if (window.cast && window.cast.framework && window.cast.framework.CastContext) {
      const context = window.cast.framework.CastContext.getInstance();
      context.addEventListener('SESSION_STATE_CHANGED', () => {
        handleSessionUpdate(context.getCurrentSession());
      });
    }
    return () => {
      isMounted = false;
     // state$.complete();
    };
  }, []);

  const connect = useCallback(async () => {
    setState(s => ({ ...s, isConnecting: true }));
    state$.next({ ...state, isConnecting: true });
    try {
      if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) {
        throw new Error('Cast Framework not available');
      }
      const context = window.cast.framework.CastContext.getInstance();
      await context.requestSession();
      // State will be updated by event listener
    } catch (err) {
      setState(s => ({ ...s, isConnecting: false, error: err instanceof Error ? err : new Error('Unknown error connecting to Chromecast') }));
      state$.next({ ...state, isConnecting: false, error: err instanceof Error ? err : new Error('Unknown error connecting to Chromecast') });
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) return;
      const context = window.cast.framework.CastContext.getInstance();
      await context.endCurrentSession(true);
    } catch (err) {
      setState(s => ({ ...s, error: err instanceof Error ? err : new Error('Unknown error disconnecting from Chromecast') }));
      state$.next({ ...state, error: err instanceof Error ? err : new Error('Unknown error disconnecting from Chromecast') });
    }
  }, []);

  const sendMessage = useCallback(async (event: OutputEvent) => {
    if (!state.isConnected) return;
    if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) return;
    const context = window.cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session) return;
    try {
      session.sendMessage(CAST_NAMESPACE, event);
    } catch (err) {
      setState(s => ({ ...s, error: err instanceof Error ? err : new Error('Error sending message to Chromecast') }));
      state$.next({ ...state, error: err instanceof Error ? err : new Error('Error sending message to Chromecast') });
    }
  }, [state.isConnected]);

  const sendStartClock = useCallback(async (payload?: StartClockPayload) => {
    const event: OutputEvent = {
      eventType: 'START_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: payload || {},
    };
    await sendMessage(event);
  }, [sendMessage]);

  const sendStopClock = useCallback(async () => {
    const event: OutputEvent = {
      eventType: 'STOP_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    await sendMessage(event);
  }, [sendMessage]);

  const sendResetClock = useCallback(async () => {
    const event: OutputEvent = {
      eventType: 'RESET_CLOCK' as OutputEventType,
      timestamp: new Date(),
      bag: {},
    };
    await sendMessage(event);
  }, [sendMessage]);

  return { state$, connect, disconnect, sendMessage, sendStartClock, sendStopClock, sendResetClock };
}
