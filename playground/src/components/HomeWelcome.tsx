/**
 * HomeWelcome — Playground-first welcome section.
 *
 * Renders the left-column hero copy injected into MarkdownCanvasPage's heroSlot.
 * Content floats to the top — no vertical centering.
 *
 * Step 01 — Write: "Find Content" button opens command palette
 * Step 02 — Run:   real Run button starts the workout in the editor
 * Step 03 — Analyze: results view explains what changed in the run
 */

import { Search, Play, BookOpen, BarChart2 } from 'lucide-react'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { HOME_WORKFLOW_DOC_LINKS } from '../views/homeDocumentationLinks'

export interface HomeWelcomeProps {
  /** Opens the command palette with the workout search strategy. */
  onOpenSearch: () => void
  /** Starts the first workout block in the editor. */
  onRun: () => void
  /** Opens the review/results mode in the editor panel. */
  onResults: () => void
}

export function HomeWelcome({ onOpenSearch, onRun, onResults }: HomeWelcomeProps) {
  return (
    <div className="relative py-8 pb-6 px-6 lg:px-10 overflow-hidden lg:min-h-[calc(100vh-104px)] lg:flex lg:flex-col lg:justify-center">
      {/* Atmospheric green glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(24,226,153,0.10) 0%, rgba(24,226,153,0.04) 40%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-xl">
        {/* Headline */}
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase leading-tight mb-3">
          Write once. Run it. Analyze what happened.
        </h1>
        <p className="max-w-lg text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-8">
          Start from plain-language workout notes, load a real example into the active editor, then move straight into runtime and review without leaving the home canvas. The landing section should teach the loop, not just advertise it.
        </p>

        {/* 3-step flow */}
        <div className="flex flex-col gap-5">

          {/* Step 01 — Write */}
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4 shadow-sm backdrop-blur-sm">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Write
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Draft workouts in the same language coaches already use: movements, reps, rounds, load, rest, and time. Pull a sample into the active content window if you want a fast starting point instead of a blank editor.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onOpenSearch}
                  className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground group"
                  aria-label="Find workout content"
                >
                  <Search className="size-3 group-hover:text-primary transition-colors" />
                  Find Content
                </button>
                <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.write.to} variant="outline" size="sm" icon={BookOpen}>
                  {HOME_WORKFLOW_DOC_LINKS.write.label}
                </ButtonLink>
              </div>
            </div>
          </div>

          {/* Step 02 — Run */}
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4 shadow-sm backdrop-blur-sm">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Run
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Move from editor to runtime without reformatting anything. Timers count down, rounds advance, and grouped blocks keep the active pane synchronized with what you are doing.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onRun}
                  className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label="Run workout"
                >
                  <Play className="size-3 fill-current" />
                  Run Workout
                </button>
                <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.run.to} variant="outline" size="sm" icon={BookOpen}>
                  {HOME_WORKFLOW_DOC_LINKS.run.label}
                </ButtonLink>
              </div>
            </div>
          </div>

          {/* Step 03 — Analyze */}
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4 shadow-sm backdrop-blur-sm">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Analyze
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Review results as soon as the run ends. Volume, pace, and splits are already structured so you can compare attempts and understand where the session changed shape.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onResults}
                  className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                  aria-label="View results"
                >
                  <BarChart2 className="size-3" />
                  View Results
                </button>
                <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.analyze.to} variant="outline" size="sm" icon={BookOpen}>
                  {HOME_WORKFLOW_DOC_LINKS.analyze.label}
                </ButtonLink>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
