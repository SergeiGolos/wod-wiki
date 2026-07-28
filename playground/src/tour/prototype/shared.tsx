/**
 * PROTOTYPE — throwaway shared bits for the home wireframe variants (#765).
 * Small presentational atoms only; each variant owns its layout.
 */

/** Monospace tag showing the funnel event a drop-off fires (#759 table). */
export function EventTag({ event }: { event: string }) {
  return (
    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 align-middle font-mono text-[10px] text-muted-foreground">
      {event}
    </span>
  )
}

/** Rough mock of the live welcome-1.md editor demo (hero `live-demo`). */
export function DemoEditorMock() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-left shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-2 font-mono text-[10px] text-muted-foreground">welcome-1.md</span>
      </div>
      <pre className="p-4 font-mono text-xs leading-relaxed text-foreground/90">
        {'```wod\nAMRAP 10\n  10 Pull-ups\n  15 Push-ups\n  20 Air Squats\n```'}
      </pre>
      <div className="flex gap-2 border-t border-border px-4 py-3">
        <span className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Run
        </span>
        <span className="rounded border border-border px-3 py-1 text-xs">Share</span>
        <span className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary">
          Open in editor →
        </span>
      </div>
    </div>
  )
}

/** Rough mock of the WallClock sticky window (tour `visual`/`live-demo`). */
export function ClockWindowMock() {
  return (
    <div className="flex aspect-video flex-col items-center justify-center rounded-lg border border-border bg-card shadow-lg">
      <span className="font-mono text-5xl font-bold tabular-nums">07:32</span>
      <span className="mt-2 text-xs text-muted-foreground">AMRAP 10 — round 3</span>
      <span className="mt-1 font-mono text-[10px] text-muted-foreground">
        sticky window · Run → fullscreen + stored (#761)
      </span>
    </div>
  )
}

/** Rough mock of the analytics visual (desktop full / mobile simplified). */
export function AnalyticsVisualMock({ simplified = false }: { simplified?: boolean }) {
  if (simplified) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-4">
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">+18%</div>
          <div className="text-[10px] text-muted-foreground">weekly volume · sample</div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="mb-3 flex gap-4">
        {['Volume', 'ACWR', 'PRs'].map((k) => (
          <div key={k} className="flex-1 rounded bg-muted/50 p-2 text-center">
            <div className="text-lg font-bold tabular-nums">—</div>
            <div className="text-[10px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-1">
        {[40, 65, 30, 80, 55, 90, 70, 45, 60, 75, 50, 85].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-primary/40" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
        sum:wod.load{'{discipline:strength}'} by {'{day}'} .rollup(1w)
      </div>
    </div>
  )
}

/** Section shell helpers (atoms, not layout). */
export function Pitch({ children }: { children: React.ReactNode }) {
  return <p className="text-lg text-muted-foreground">{children}</p>
}

export function PrimaryAction({ label, event }: { label: string; event?: string }) {
  return (
    <span className="inline-flex items-center rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
      {label}
      {event && <EventTag event={event} />}
    </span>
  )
}

export function SecondaryLink({ label, event }: { label: string; event?: string }) {
  return (
    <span className="inline-flex items-center text-sm text-primary underline-offset-2 hover:underline">
      {label}
      {event && <EventTag event={event} />}
    </span>
  )
}

/** The short-circuit strip — identical content in every variant (#757). */
export function ShortCircuitStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-y border-border bg-muted/30 px-4 py-3 text-sm ${className}`}
    >
      <span className="text-muted-foreground">Know where you're going?</span>
      <span className="font-medium text-primary">
        Jump to the Library
        <EventTag event="home:library_opened" />
      </span>
      <span className="text-border">·</span>
      <span className="font-medium text-primary">
        New note
        <EventTag event="home:note_created" />
      </span>
      <span className="text-muted-foreground">— or keep scrolling ↓</span>
    </div>
  )
}
