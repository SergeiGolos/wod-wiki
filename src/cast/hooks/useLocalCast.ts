import { useEffect } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import { OutputEvent, ChromecastEventType } from '../types/chromecast-events';
import { UseCastReceiverResult } from './useCastReceiver';
import { UseCastSenderResult } from './useCastSender';

export interface ChromecastState {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: Error | null;
}

export type UseCastResult = UseCastSenderResult & UseCastReceiverResult;

/**
 * Local/dev hook for simulating Chromecast sender/receiver in a fully connected state.
 * All messages sent are immediately echoed to event$ as if a receiver is always present.
 */
export function useLocalCast(): UseCastResult {
  const state$ = new BehaviorSubject<ChromecastState>({
    isAvailable: true,
    isConnected: true,
    isConnecting: false,
    deviceName: 'LocalCast',
    error: null,
  });
  const event$ = new Subject<OutputEvent>();

  useEffect(() => {
    // Optionally: emit a handshake event or other simulated events on mount
    event$.next({
      eventType: ChromecastEventType.HANDSHAKE_ESTABLISHED,
      timestamp: new Date(),
      bag: { simulated: true },
    });
    return () => {
      event$.complete();
      state$.complete();
    };
  }, []);

  const connect: (() => Promise<void>) = () => {
    return Promise.resolve(state$.next({
      isAvailable: true,
      isConnected: true,
      isConnecting: false,
      deviceName: 'LocalCast',
      error: null,
    }));
  };

  const disconnect: (() => Promise<void>) = () => {
    return Promise.resolve(state$.next({
      isAvailable: true,
      isConnected: false,
      isConnecting: false,
      deviceName: 'LocalCast',
      error: null,
    }));
  };

  const sendMessage : ((event: OutputEvent) => Promise<void>) = (event) => {
    return Promise.resolve(event$.next(event));
  }

  return { state$, event$, sendMessage, connect, disconnect };
}
