import { useTelemetry } from '@/services/telemetry'

/**
 * Telemetry consent (PRD #767 §6): events record locally regardless; this is
 * the only surface that grants the external (gtag) forwarding consent.
 */
export function TelemetryConsentFooter() {
  const { consent, setConsent } = useTelemetry()

  return (
    <footer className="mx-auto max-w-5xl px-6 pb-12 text-center">
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="size-3.5 accent-primary"
        />
        Share anonymous usage statistics — events stay on this device until you opt in
      </label>
    </footer>
  )
}
