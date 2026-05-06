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

const inlineActionClassName = 'mx-1 inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted/30 px-2 align-baseline text-[11px] font-semibold leading-none text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground'

const inlinePrimaryActionClassName = 'mx-1 inline-flex h-6 items-center gap-1 rounded-md bg-primary px-2 align-baseline text-[11px] font-bold leading-none text-primary-foreground transition-colors hover:bg-primary/90'

const inlineDocLinkClassName = 'mx-1 inline-flex h-auto items-center gap-1 px-0 py-0 align-baseline text-xs font-semibold leading-none text-foreground no-underline hover:text-primary'

export interface HomeWelcomeProps {
  /** Opens the command palette with the workout search strategy. */
  onOpenSearch: () => void
  /** Starts the first workout block in the editor. */
  onRun: () => void
  /** Opens the review/results mode in the editor panel. */
  onResults: () => void
}

function InlineDocLink({ to, label }: { to: string; label: string }) {
  return (
    <ButtonLink to={to} variant="link" size="sm" className={inlineDocLinkClassName}>
      <BookOpen className="size-3" />
      <strong className="font-semibold">{label}</strong>
    </ButtonLink>
  )
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
        <div className="max-w-lg">
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            WOD Wiki keeps the same workout note connected from writing to runtime to review. The home panel should read like guidance first, with the actions folded into the copy instead of separated into large controls.
          </p>
        </div>

        {/* 3-step flow */}
        <div className="mt-8 flex flex-col gap-6">

          {/* Step 01 — Write */}
          <div>
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Write Notes
              </span>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                Start with the same lines a coach would write on a whiteboard: movement, reps, rounds, load, rest, and section labels. Use
                <button
                  onClick={onOpenSearch}
                  className={`${inlineActionClassName} group`}
                  aria-label="Find workout content"
                >
                  <Search className="size-3 transition-colors group-hover:text-primary" />
                  Find Content
                </button>
                when you want a starting point, and keep
                <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.write.to} label={HOME_WORKFLOW_DOC_LINKS.write.label} />
                close if you want the quick rules for statements and section structure while you edit.
              </p>
            </div>
          </div>

          {/* Step 02 — Run */}
          <div>
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Run Workout
              </span>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                Move straight from note to runtime with
                <button
                  onClick={onRun}
                  className={inlinePrimaryActionClassName}
                  aria-label="Run workout"
                >
                  <Play className="size-3 fill-current" />
                  Run Workout
                </button>
                so the editor and tracker stay in one loop. If you want the rules for timers, rounds, and grouped blocks nearby, use
                <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.run.to} label={HOME_WORKFLOW_DOC_LINKS.run.label} />
                as the quick reference.
              </p>
            </div>
          </div>

          {/* Step 03 — Analyze */}
          <div>
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                Analyze
              </span>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                Review becomes useful because the note, sections, and runtime events are already aligned. Open
                <button
                  onClick={onResults}
                  className={inlineActionClassName}
                  aria-label="View results"
                >
                  <BarChart2 className="size-3" />
                  View Results
                </button>
                to compare attempts, then use
                <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.analyze.to} label={HOME_WORKFLOW_DOC_LINKS.analyze.label} />
                if you want the review model explained in more detail.
              </p>
            </div>
          </div>

        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.write.to} label={HOME_WORKFLOW_DOC_LINKS.write.label} />
          <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.run.to} label={HOME_WORKFLOW_DOC_LINKS.run.label} />
          <InlineDocLink to={HOME_WORKFLOW_DOC_LINKS.analyze.to} label={HOME_WORKFLOW_DOC_LINKS.analyze.label} />
        </div>
      </div>
    </div>
  )
}
