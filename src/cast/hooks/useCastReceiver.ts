import { useEffect } from 'react';
import { Subject } from 'rxjs';
import { OutputEvent } from '../types/chromecast-events';

export interface UseCastReceiverResult {
  event$: Subject<OutputEvent>;
}

/**
 * React hook for receiving Chromecast events from the CastReceiverContext.
 * Exposes an RxJS Subject as event$ for all incoming messages.
 * Note: This is a stub for sender-side dev/testing; real receiver logic is for the receiver project.
 */
export function useCastReceiver(): UseCastReceiverResult {
  const event$ = new Subject<OutputEvent>();

  useEffect(() => {
    // This hook is a stub in this project; real receiver logic is implemented in the receiver app.
    // For local development, you may simulate events here if needed.
    // Example: event$.next({ eventType: ..., timestamp: ..., bag: ... });
    return () => {
      event$.complete();
    };
  }, []);

  return { event$ };
}
