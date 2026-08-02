/**
 * TourCaptions.tsx — per-stage captions for the walkthrough.
 *
 * Desktop: a fixed-width column where captions cross-fade with the active
 * stage. Mobile: the parent translates the strip vertically (scrubbed
 * during the last 30% of each stage) or the cards render statically. The
 * same CAPTIONS data now carries the stage drop-off actions for the home
 * funnel.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TOUR_ACCENTS, type TourStageId } from './tourStages'
import { telemetry, HOME_EVENTS, type HomeEventName } from '@/services/telemetry'
import { analyticsExplorerPath } from '../lib/routes'

export interface TourCaptionAction {
  label: string
  href: string
  event: HomeEventName
}

export interface TourCaption {
  id: TourStageId
  num: string
  title: ReactNode
  body: string
  foot: string
  accent: string
  actions?: TourCaptionAction[]
}

export const TOUR_CAPTIONS: TourCaption[] = [
  {
    id: 'editor-blank',
    num: '01a / 03 — Blank Page & Typeahead',
    title: (
      <>
        Start with a Blank Page.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.editor }}>Type-ahead & freeform Markdown.</em>
      </>
    ),
    body: 'WOD Wiki notes start as freeform Markdown. As you type, live type-ahead autocomplete brings the workout onto the page and completes your script.',
    foot: 'Markdown · type-ahead completion · freeform entry',
    accent: TOUR_ACCENTS.editor,
    actions: [
      {
        label: 'Start Lesson 1',
        href: '/guide/syntax/basics',
        event: HOME_EVENTS.lessonStarted,
      },
    ],
  },
  {
    id: 'editor-metrics',
    num: '01b / 03 — Metric Types & ``` Syntax',
    title: (
      <>
        Every Line Collects Metrics.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.editor }}>Fenced ```wod syntax.</em>
      </>
    ),
    body: 'Open a fenced block with triple backticks — ```wod. Each line defines the metrics collected: rep scaling (21-15-9), distance (400m Run), load resistance (24kg, 225lb), and rest (*:30 Rest).',
    foot: '```wod syntax · 21-15-9 rep scaling · 400m distance · 24kg/225lb load',
    accent: TOUR_ACCENTS.editor,
    actions: [
      {
        label: 'Start Lesson 1',
        href: '/guide/syntax/basics',
        event: HOME_EVENTS.lessonStarted,
      },
    ],
  },
  {
    id: 'editor-run',
    num: '01c / 03 — Press Run',
    title: (
      <>
        Press Run to Execute.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.editor }}>Launch the step-through clock.</em>
      </>
    ),
    body: 'Click Run in the editor top bar (or keep scrolling) to launch the step-through WallClock timer for this 21-15-9 workout.',
    foot: 'Run button · step-through WallClock · untimed rounds',
    accent: TOUR_ACCENTS.editor,
    actions: [
      {
        label: 'Read the behaviors explainer',
        href: '/guide/behaviors',
        event: HOME_EVENTS.behaviorsOpened,
      },
    ],
  },
  {
    id: 'timer-wallclock',
    num: '02a / 03 — The Working Clock',
    title: (
      <>
        What Happens When It Runs.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>The script becomes the clock.</em>
      </>
    ),
    body: 'The WallClock runs your exact 21-15-9 script — stepping through reps, distance, and load lines at your own pace without forced time limits.',
    foot: 'WallClock · 21-15-9 step-through · live metric capture',
    accent: TOUR_ACCENTS.timer,
    actions: [
      {
        label: 'Read the behaviors explainer',
        href: '/guide/behaviors',
        event: HOME_EVENTS.behaviorsOpened,
      },
    ],
  },
  {
    id: 'timer-cast',
    num: '02b / 03 — Broadcast',
    title: (
      <>
        Cast to Any Screen.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>Your phone stays the remote.</em>
      </>
    ),
    body: 'One tap casts the active workout steps to a Chromecast or secondary monitor via zero-lag RPC transport, displaying full-screen progress.',
    foot: 'Chromecast · RPC transport · multi-display',
    accent: TOUR_ACCENTS.timer,
    actions: [
      {
        label: 'Read the behaviors explainer',
        href: '/guide/behaviors',
        event: HOME_EVENTS.behaviorsOpened,
      },
    ],
  },
  {
    id: 'analytics-scorecard',
    num: '03a / 03 — Explore Your Data',
    title: (
      <>
        Explore Your Data.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>Query what you just did.</em>
      </>
    ),
    body: 'Total reps (90 reps), total distance (1200m), and load volume (Swings + Deadlifts) from this 21-15-9 workout are calculated and written to your journal.',
    foot: 'Scorecard · 90 reps · 1200m distance · volume rollup',
    accent: TOUR_ACCENTS.analytics,
    actions: [
      {
        label: 'Run a pre-filled query',
        href: analyticsExplorerPath({ q: 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)' }),
        event: HOME_EVENTS.explorerOpened,
      },
      {
        label: 'Open the dashboard',
        href: '/analytics/dashboard',
        event: HOME_EVENTS.dashboardViewed,
      },
    ],
  },
  {
    id: 'analytics-grid',
    num: '03b / 03 — Session Review',
    title: (
      <>
        Session Log & Review.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>Analyze every set and split.</em>
      </>
    ),
    body: 'Drill into individual round splits (21, 15, and 9 reps), distance splits (400m), and load overrides collected during execution.',
    foot: 'Review Grid · 21-15-9 round splits · WQL metrics',
    accent: TOUR_ACCENTS.analytics,
    actions: [
      {
        label: 'Read the query guide',
        href: '/guide/analytics',
        event: HOME_EVENTS.analyticsGuideOpened,
      },
    ],
  },
]

export interface TourCaptionsProps {
  /** Index into TOUR_CAPTIONS (matches stage index). */
  activeIndex: number
}

/** Desktop cross-fading caption column. */
export function TourCaptions({ activeIndex }: TourCaptionsProps) {
  return (
    <div className="relative w-[330px] flex-none min-h-[280px]" data-testid="tour-captions">
      {TOUR_CAPTIONS.map((cap, i) => (
        <div
          key={cap.id}
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
          aria-hidden={i !== activeIndex}
        >
          <CaptionBody cap={cap} />
        </div>
      ))}
    </div>
  )
}

export function CaptionBody({ cap }: { cap: TourCaption }) {
  return (
    <>
      <div
        className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em]"
        style={{ color: cap.accent }}
      >
        {cap.num}
      </div>
      <h3 className="mb-3.5 text-[clamp(22px,2vw,30px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
        {cap.title}
      </h3>
      <p className="text-[14.5px] leading-[1.7] text-muted-foreground">{cap.body}</p>
      <div className="mt-4 border-t border-border pt-3 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/60">
        {cap.foot}
      </div>
      {cap.actions && cap.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {cap.actions.map((action, i) => {
            const isPrimary = i === 0
            return (
              <Link
                key={action.label}
                to={action.href}
                onClick={() => telemetry.record(action.event)}
                className={
                  isPrimary
                    ? 'inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
                    : 'text-sm text-primary underline-offset-2 hover:underline'
                }
              >
                {action.label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
