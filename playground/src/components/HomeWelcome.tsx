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

      <div className="relative w-full max-w-lg">
        
        {/* 3-step flow */}
        <div className="flex flex-col">

          {/* Step 01 — Write */}
          <div className="py-4 first:pt-0">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Write Notes
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Powered by the `whiteboard-script` runtime, your text notes are supercharged for  way they appear on a whiteboard: movement, reps, rounds, load, rest, and time.  <button
                  onClick={onOpenSearch}
                  className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground group"
                  aria-label="Find workout content"
                >
                  <Search className="size-3 group-hover:text-primary transition-colors" />
                  Find Content
                </button> If you do not want to start blank, pull a real workout into the active editor first.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                
                <p className="text-xs text-muted-foreground">
                  Use this when you want examples of statement structure before editing.
                </p>
              </div>
            </div>
          </div>

          {/* Step 02 — Run */}
          <div className="py-4">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                <button
                  onClick={onRun}
                  className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label="Run workout"
                >
                  <Play className="size-3 fill-current" />
                  Run Workout
                </button>
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Move straight from text to runtime. Timers count down, rounds advance, and section context stays aligned with the active block while you work.
              </p>
              <div className="flex flex-wrap items-center gap-3">                
                <p className="text-xs text-muted-foreground">
                  The editor and runtime stay in one loop, so you can validate structure as soon as it is written.
                </p>
              </div>
            </div>
          </div>

          {/* Step 03 — Analyze */}
          <div className="py-4 last:pb-0">
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Analyze
              </span>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-1 mb-3">
                Results become useful because statements, sections, and runtime events are already structured. Review volume, pace, and splits without reconstructing the session afterward.
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
                <p className="text-xs text-muted-foreground">
                  Use review to compare attempts and see where a workout actually changed shape.
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <BookOpen className="size-3.5" />
            Learn the language:
          </span>
          <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.write.to} variant="link" size="sm" className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground">
            {HOME_WORKFLOW_DOC_LINKS.write.label}
          </ButtonLink>
          <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.run.to} variant="link" size="sm" className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground">
            {HOME_WORKFLOW_DOC_LINKS.run.label}
          </ButtonLink>
          <ButtonLink to={HOME_WORKFLOW_DOC_LINKS.analyze.to} variant="link" size="sm" className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground">
            {HOME_WORKFLOW_DOC_LINKS.analyze.label}
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
