import { useCallback, useSyncExternalStore } from 'react';
import { telemetry } from './index';

/**
 * React seam over the telemetry singleton: `track` for components,
 * reactive `consent` for consent UI.
 */
export function useTelemetry(): {
  track: (name: string, payload?: Record<string, unknown>) => void;
  consent: boolean;
  setConsent: (granted: boolean) => void;
} {
  const consent = useSyncExternalStore(
    (cb) => telemetry.subscribeConsent(cb),
    () => telemetry.consent,
  );
  const track = useCallback(
    (name: string, payload?: Record<string, unknown>) => telemetry.record(name, payload),
    [],
  );
  const setConsent = useCallback((granted: boolean) => telemetry.setConsent(granted), []);
  return { track, consent, setConsent };
}
