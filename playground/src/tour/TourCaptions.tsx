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
import {
  Combobox,
  ComboboxDescription,
  ComboboxLabel,
  ComboboxOption,
} from '@/components/atoms/primitives/combobox'
import { TOUR_ACCENTS, type TourStageId } from './tourStages'
import { telemetry, HOME_EVENTS, type HomeEventName } from '@/services/telemetry'
import { analyticsExplorerPath } from '../lib/routes'

export interface TourCaptionAction {
  label: string
  href: string
  event: HomeEventName
}

/** Choose-your-own-adventure workout option rendered in the caption combo box. */
export interface TourCaptionChoice {
  label: string
  detail: string
  wod: string
}

/** Workout presets for the editor-blank slide — reps + distance + load, no forced timers. */
export const WORKOUT_PRESETS: TourCaptionChoice[] = [
  {
    label: '21-15-9 Rep Scaling',
    detail: '24kg Swings · 400m Run · 225lb Deadlifts',
    wod: '```time\n21-15-9\n  Kettlebell Swings 24kg\n  400m Run\n  Deadlifts 225lb\n  *:30 Rest\n```',
  },
  {
    label: 'Bodyweight & Distance',
    detail: '20 Air Squats · 200m Run · 15 Push-ups',
    wod: '```time\n(4 Rounds)\n  20 Air Squats\n  200m Run\n  15 Push-ups\n  *:45 Rest\n```',
  },
  {
    label: 'Heavy Triplet',
    detail: '5 Back Squats 185lb · 100m Carry 50lb · 10 Ring Dips',
    wod: '```time\n(5 Sets)\n  5 Barbell Back Squats 185lb\n  100m Farmer Carry 50lb\n  10 Ring Dips\n```',
  },
  {
    label: 'Load & Carry Ladder',
    detail: '12 Front Squats 65kg · 100m Carry 30kg · 20 Box Jumps',
    wod: '```time\n(4 Sets)\n  12 Front Squats 65kg\n  100m Sandbag Carry 30kg\n  20 Box Jumps\n```',
  },
]

export interface TourCaption {
  id: TourStageId
  num: string
  title: ReactNode
  body: string
  foot: string
  accent: string
  actions?: TourCaptionAction[]
  /** Workout choices rendered as a combo box; picking one resets the tour session. */
  choices?: TourCaptionChoice[]
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
    choices: WORKOUT_PRESETS,
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
        <em className="not-italic" style={{ color: TOUR_ACCENTS.editor }}>Fenced ```time syntax.</em>
      </>
    ),
    body: 'Open a fenced block with triple backticks — ```time. Each line defines the metrics collected: rep scaling (21-15-9), distance (400m Run), load resistance (24kg, 225lb), and rest (*:30 Rest).',
    foot: '```time syntax · 21-15-9 rep scaling · 400m distance · 24kg/225lb load',
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
  /** Called when a workout choice is picked from the combo box (choose-your-own-adventure). */
  onChoice?: (wod: string) => void
}

/** Desktop cross-fading caption column. */
export function TourCaptions({ activeIndex, onChoice }: TourCaptionsProps) {
  return (
    <div className="relative w-[330px] flex-none min-h-[280px]" data-testid="tour-captions">
      {TOUR_CAPTIONS.map((cap, i) => (
        <div
          key={cap.id}
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: i === activeIndex ? 1 : 0,
            // Inactive captions are invisible but still stacked above the
            // active one — without this their links/buttons swallow clicks
            // (e.g. the analytics caption's links hijacking combo box taps).
            pointerEvents: i === activeIndex ? 'auto' : 'none',
          }}
          aria-hidden={i !== activeIndex}
        >
          <CaptionBody cap={cap} onChoice={onChoice} />
        </div>
      ))}
    </div>
  )
}

export function CaptionBody({ cap, onChoice }: { cap: TourCaption; onChoice?: (wod: string) => void }) {
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
      {cap.choices && cap.choices.length > 0 && (
        <div className="mt-4" data-testid="tour-workout-choices">
          <Combobox<TourCaptionChoice | null>
            options={cap.choices}
            value={null}
            by={(a, b) => a?.label === b?.label}
            immediate
            virtual={false}
            onChange={(choice) => {
              if (choice) onChoice?.(choice.wod)
            }}
            displayValue={(choice) => choice?.label}
            filter={(choice, query) => {
              const q = query.toLowerCase()
              return (
                (choice?.label.toLowerCase().includes(q) ?? false) ||
                (choice?.detail.toLowerCase().includes(q) ?? false)
              )
            }}
            placeholder="Load a workout into the demo…"
            aria-label="Load a workout into the demo"
          >
            {(choice) => (
              <ComboboxOption value={choice}>
                <ComboboxLabel>{choice.label}</ComboboxLabel>
                <ComboboxDescription>{choice.detail}</ComboboxDescription>
              </ComboboxOption>
            )}
          </Combobox>
        </div>
      )}
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
