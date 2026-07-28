/**
 * PROTOTYPE Variant B — "Editorial" (#765).
 * No tour theater anywhere: full-width alternating editorial sections with
 * big type and one primary button each. Static on every breakpoint — the
 * foil that tests whether the tour earns its complexity.
 */
import {
  AnalyticsVisualMock,
  DemoEditorMock,
  PrimaryAction,
  SecondaryLink,
  ShortCircuitStrip,
} from './shared'

function EditorialSection({
  kicker,
  title,
  pitch,
  action,
  event,
  secondary,
  secondaryEvent,
  flip = false,
  children,
}: {
  kicker: string
  title: string
  pitch: string
  action: string
  event?: string
  secondary?: string
  secondaryEvent?: string
  flip?: boolean
  children?: React.ReactNode
}) {
  return (
    <section className="border-t border-border px-6 py-24">
      <div
        className={`mx-auto flex max-w-6xl flex-col gap-10 md:items-center ${
          flip ? 'md:flex-row-reverse' : 'md:flex-row'
        }`}
      >
        <div className="flex-1">
          <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">{kicker}</div>
          <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h2>
          <p className="mt-4 text-xl text-muted-foreground">{pitch}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PrimaryAction label={action} event={event} />
            {secondary && <SecondaryLink label={secondary} event={secondaryEvent} />}
          </div>
        </div>
        {children && <div className="flex-1">{children}</div>}
      </div>
    </section>
  )
}

export function VariantB() {
  return (
    <div className="bg-background">
      {/* Hero — editorial, demo below the fold line of the headline */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-28 text-center">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
          Your whiteboard,
          <br />
          <span className="text-primary">executable.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-xl text-muted-foreground">
          Write it in Markdown. Run it as a Timer. Own the Analytics.
        </p>
        <div className="mx-auto mt-12 max-w-lg text-left">
          <DemoEditorMock />
        </div>
      </section>

      <ShortCircuitStrip />

      <EditorialSection
        kicker="01 — Learn"
        title="Learn the Language"
        pitch="From first `wod` line to fluency — Lesson 1 is 3 minutes, runnable in place."
        action="Start Lesson 1"
        event="home:lesson_started"
        secondary="Cheat sheet"
        secondaryEvent="home:cheatsheet_opened"
      >
        <div className="rounded-lg border border-border p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your progress
          </div>
          <div className="mt-3 space-y-2">
            {[70, 30, 0].map((w, i) => (
              <div key={i} className="h-2 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </EditorialSection>

      <EditorialSection
        kicker="02 — Understand"
        title="What Happens When It Runs"
        pitch="The script becomes the clock. AMRAP 10 means countdown and count rounds; 21-15-9 means descending rounds you never wrote."
        action="Read the behaviors explainer"
        event="home:behaviors_opened"
        flip
      >
        <pre className="rounded-lg border border-border bg-card p-4 font-mono text-sm leading-loose">
{`AMRAP 10        → countdown 10:00, count rounds
(21-15-9)       → 3 implicit rounds
EMOM 12         → 12 interval clocks`}
        </pre>
      </EditorialSection>

      <EditorialSection
        kicker="03 — Analyze"
        title="Explore Your Data"
        pitch="Query what you just did."
        action="Run a pre-filled query"
        event="home:explorer_opened"
        secondary="Open the dashboard"
        secondaryEvent="home:dashboard_viewed"
      >
        <AnalyticsVisualMock />
      </EditorialSection>

      <EditorialSection
        kicker="04 — Vocabulary"
        title="The Movement Registry"
        pitch="Every movement your metrics speak in."
        action="Browse the registry"
        event="home:efforts_opened"
        flip
      />

      <section className="border-t border-border bg-muted/20 px-6 py-24 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">05 — Look up</div>
        <h2 className="text-4xl font-extrabold">Quick Reference</h2>
        <p className="mt-4 text-xl text-muted-foreground">Look it up in seconds.</p>
        <div className="mx-auto mt-8 max-w-2xl">
          <PrimaryAction label="Open the cheat sheet" event="home:reference_opened" />
        </div>
      </section>
    </div>
  )
}
