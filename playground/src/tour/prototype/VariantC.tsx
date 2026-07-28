/**
 * PROTOTYPE Variant C — "Command Deck" (#765).
 * Single-screen density: sticky hero demo on the left, a compact right rail
 * carrying the strip exits and all five areas as rows; Quick Reference docked
 * as a bottom panel. regex101-style everything-in-reach. Collapses to the
 * card stack below lg.
 */
import {
  AnalyticsVisualMock,
  DemoEditorMock,
  EventTag,
  ShortCircuitStrip,
} from './shared'

const AREAS = [
  {
    title: 'Learn the Language',
    pitch: 'Lesson 1 is 3 minutes, runnable in place.',
    action: 'Start Lesson 1',
    event: 'home:lesson_started',
  },
  {
    title: 'What Happens When It Runs',
    pitch: 'The script becomes the clock.',
    action: 'Behaviors explainer',
    event: 'home:behaviors_opened',
  },
  {
    title: 'Explore Your Data',
    pitch: 'Query what you just did.',
    action: 'Pre-filled query',
    event: 'home:explorer_opened',
  },
  {
    title: 'The Movement Registry',
    pitch: 'Every movement your metrics speak in.',
    action: 'Browse registry',
    event: 'home:efforts_opened',
  },
  {
    title: 'Quick Reference',
    pitch: 'Look it up in seconds.',
    action: 'Cheat sheet',
    event: 'home:reference_opened',
  },
]

export function VariantC() {
  return (
    <div className="bg-background lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:h-full lg:grid-cols-[1.2fr_1fr]">
        {/* Left: sticky hero deck */}
        <div className="flex flex-col justify-center gap-6">
          <h1 className="text-3xl font-bold tracking-tight xl:text-5xl">
            Write it. Run it. <span className="text-primary">Own it.</span>
          </h1>
          <DemoEditorMock />
          <div className="hidden xl:block">
            <AnalyticsVisualMock simplified />
          </div>
        </div>

        {/* Right: rail of exits + area rows */}
        <div className="flex flex-col gap-3 lg:overflow-y-auto lg:py-4">
          <ShortCircuitStrip className="rounded-lg border" />
          {AREAS.map((a) => (
            <div
              key={a.title}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.pitch}</div>
              </div>
              <span className="whitespace-nowrap rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                {a.action}
                <EventTag event={a.event} />
              </span>
            </div>
          ))}
          {/* Docked reference row */}
          <div className="rounded-lg border border-dashed border-border p-3 font-mono text-[11px] text-muted-foreground">
            5:00 · (21-15-9) · 225lb · AMRAP · EMOM · :? · ?lb · ⌘/
          </div>
        </div>
      </div>
    </div>
  )
}
