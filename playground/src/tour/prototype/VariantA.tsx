/**
 * PROTOTYPE Variant A — "Upgraded Tour" (#765).
 * The #758 decision rendered straight: hero with live demo, strip, then
 * tour-flavored staged sections (Behaviors + Explore get the sticky-window
 * treatment), static areas for Learn / Registry / Reference.
 * Collapses to the mobile card stack below lg (#764).
 */
import {
  AnalyticsVisualMock,
  ClockWindowMock,
  DemoEditorMock,
  Pitch,
  PrimaryAction,
  SecondaryLink,
  ShortCircuitStrip,
} from './shared'

export function VariantA() {
  return (
    <div className="bg-background">
      {/* 1 — Hero: headline + live demo, one viewport */}
      <section className="mx-auto flex min-h-[90vh] max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Write it in Markdown.
          <br />
          Run it as a Timer. <span className="text-primary">Own the Analytics.</span>
        </h1>
        <div className="w-full max-w-xl">
          <DemoEditorMock />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            live-demo: edit → home:demo_edited · run → home:demo_run · share → home:demo_shared
          </p>
        </div>
      </section>

      {/* 2 — Short-circuit strip */}
      <ShortCircuitStrip />

      {/* 3 — Learn the Language (start-line + progress) */}
      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Learn the Language</h2>
          <Pitch>From first `wod` line to fluency — Lesson 1 is 3 minutes, runnable in place.</Pitch>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <PrimaryAction label="Start Lesson 1" event="home:lesson_started" />
            <SecondaryLink label="Cheat sheet" event="home:cheatsheet_opened" />
          </div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your progress (quests)
          </div>
          {['Take the Tour — 7/7', 'Core Concepts — 3/7', 'Structure & Reps — 0/7'].map((q) => (
            <div key={q} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span>{q}</span>
              <span className="h-1.5 w-16 rounded bg-muted" />
            </div>
          ))}
          <div className="mt-2 font-mono text-[10px] text-muted-foreground">
            chapter links mirror sidebar order (#760)
          </div>
        </div>
      </section>

      {/* 4 — What Happens When It Runs (tour stage: sticky window) */}
      <section className="border-t border-border bg-muted/20 px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">What Happens When It Runs</h2>
            <Pitch>The script becomes the clock.</Pitch>
            <div className="mt-6">
              <PrimaryAction label="Read the behaviors explainer" event="home:behaviors_opened" />
            </div>
          </div>
          <div className="hidden lg:block">
            <ClockWindowMock />
          </div>
          <p className="text-xs text-muted-foreground lg:hidden">
            (mobile card: no sticky window — runs start from the hero, fullscreen)
          </p>
        </div>
      </section>

      {/* 5 — Explore Your Data (tour stage) */}
      <section className="mx-auto grid max-w-5xl items-center gap-8 px-6 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Explore Your Data</h2>
          <Pitch>Query what you just did.</Pitch>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <PrimaryAction label="Run a pre-filled query" event="home:explorer_opened" />
            <SecondaryLink label="Open the dashboard" event="home:dashboard_viewed" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            empty store → explain + "Load sample data" (#762)
          </p>
        </div>
        <div>
          <div className="hidden lg:block">
            <AnalyticsVisualMock />
          </div>
          <div className="lg:hidden">
            <AnalyticsVisualMock simplified />
          </div>
        </div>
      </section>

      {/* 6 — The Movement Registry (static, no tour ancestor) */}
      <section className="border-t border-border bg-muted/20 px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">The Movement Registry</h2>
            <Pitch>Every movement your metrics speak in.</Pitch>
          </div>
          <div className="flex gap-2 font-mono text-xs">
            {['strength', 'gymnastics', 'rowing', 'kettlebell', '+6'].map((d) => (
              <span key={d} className="rounded border border-border px-2 py-1">
                {d}
              </span>
            ))}
          </div>
          <PrimaryAction label="Browse the registry" event="home:efforts_opened" />
        </div>
      </section>

      {/* 7 — Quick Reference */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold">Quick Reference</h2>
        <Pitch>Look it up in seconds.</Pitch>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border font-mono text-xs md:grid-cols-4">
          {['5:00 duration', '(21-15-9) ladder', '225lb load', 'AMRAP', 'EMOM', ':? actual', '?lb prompt', '⌘/ palette'].map(
            (c) => (
              <span key={c} className="bg-card px-3 py-2">
                {c}
              </span>
            ),
          )}
        </div>
        <div className="mt-4">
          <PrimaryAction label="Open the cheat sheet" event="home:reference_opened" />
        </div>
      </section>
    </div>
  )
}
