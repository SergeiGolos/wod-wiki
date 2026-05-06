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

const WRITE_NOTE_DOC_LINKS = {
  movement: {
    to: '/getting-started?h=statement',
    label: 'Movement',
  },
  reps: {
    to: '/syntax/structure?h=rep-schemes',
    label: 'Reps',
  },
  timers: {
    to: '/syntax/protocols',
    label: 'Timers',
  },
  rounds: {
    to: '/syntax/structure?h=simple-rounds',
    label: 'Rounds',
  },
  load: {
    to: '/syntax/basics?h=measurements',
    label: 'Load',
  },
  rest: {
    to: '/syntax/protocols?h=timers-and-rest',
    label: 'Rest',
  },
  sectionLabels: {
    to: '/syntax/structure?h=named-groups',
    label: 'Section Labels',
  },
} as const

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

function WriteReferenceItem({
  to,
  label,
  children,
}: {
  to: string
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="text-sm leading-relaxed text-muted-foreground">
      <InlineDocLink to={to} label={label} />
      <span>{children}</span>
    </li>
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
                {/* 3-step flow */}
        <div className="mt-8 flex flex-col gap-6">

          {/* Step 01 — Write */}
          <div>
            <div className="flex-1">
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                Start with simple whiteboard text in the example. Powered by
                <ButtonLink
                  href="https://pluto.forest-adhara.ts.net:5173/syntax"
                  target="_blank"
                  rel="noreferrer"
                  variant="link"
                  size="sm"
                  className={inlineDocLinkClassName}
                >
                  <BookOpen className="size-3" />
                  <strong className="font-semibold">whiteboard-script</strong>
                </ButtonLink>
                each part of the note becomes structured data for tracking and later analysis. <strong>So what's tracked</strong>?
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
                <WriteReferenceItem
                  to={WRITE_NOTE_DOC_LINKS.rounds.to}
                  label={WRITE_NOTE_DOC_LINKS.rounds.label}
                >
                  parens mean multiplication, with <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">(3)</code> meaning 3 rounds.
                </WriteReferenceItem>
                <WriteReferenceItem
                  to={WRITE_NOTE_DOC_LINKS.movement.to}
                  label={WRITE_NOTE_DOC_LINKS.movement.label}
                >
                  both <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">Kettlebell Swings</code> and <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">Rest</code> are tracked in this example.
                </WriteReferenceItem>
                <WriteReferenceItem
                  to={WRITE_NOTE_DOC_LINKS.reps.to}
                  label={WRITE_NOTE_DOC_LINKS.reps.label}
                >
                  the number <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">10</code> before <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">Kettlebell Swings</code> tells us the number of reps.
                </WriteReferenceItem>
                <WriteReferenceItem
                  to={WRITE_NOTE_DOC_LINKS.load.to}
                  label={WRITE_NOTE_DOC_LINKS.load.label}
                >
                  <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">24kg</code> is a unit of weight used for tracking.
                </WriteReferenceItem>
                <WriteReferenceItem
                  to={WRITE_NOTE_DOC_LINKS.timers.to}
                  label={WRITE_NOTE_DOC_LINKS.timers.label}
                >
                  the obvious one is <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">:30</code> seconds of `Rest`, but timers what about the `Kettlebell Swings`?  Its an unknown.
                </WriteReferenceItem>
              </ul>
            
            </div>
          </div>

          {/* Step 02 — Run */}
          <div>
            <div className="flex-1">
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                Measuring the unknown, is the whole points, so
                <button
                  onClick={onRun}
                  className={inlinePrimaryActionClassName}
                  aria-label="Run workout"
                >
                  <Play className="size-3 fill-current" />
                  Run Workout
                </button>
                 and collect the data, and after completing all the laps  <button
                  onClick={onResults}
                  className={inlineActionClassName}
                  aria-label="View results"
                >
                  <BarChart2 className="size-3" />
                  View Results
                </button> for a deeper anlysis.
              </p>
              
              
              <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
              
                                <button
                  onClick={onOpenSearch}
                  className={`${inlineActionClassName} group`}
                  aria-label="Find workout content"
                >
                  <Search className="size-3 transition-colors group-hover:text-primary" />
                  Find Content
                </button> for additional examples from feeds collections and your own workout history if you keep a journal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
