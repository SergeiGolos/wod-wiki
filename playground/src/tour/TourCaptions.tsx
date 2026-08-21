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
import { TOUR_ACCENTS, type TourStageId } from './tourConstants'
import { telemetry, HOME_EVENTS, type HomeEventName } from '@/services/telemetry'

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
    detail: 'Air Squats · Pushups',
    wod: '```time\n21-15-9\n  Air Squats\n  Pushups\n  // Rep scheme scaling\n  // Step through reps\n```',
  },
  {
    label: 'Required Rest',
    detail: '3 Rounds · 10 Burpees · *:30 Rest',
    wod: '```time\n(3 Rounds)\n  10 Burpees\n  *:30 Rest\n  // Forced rest timer\n  // Locks time split\n```',
  },
  {
    label: 'Timed Distance',
    detail: '5:00 Run 400m · *:45 Rest',
    wod: '```time\n5:00 Run 400m\n*:45 Rest\n// Fixed time window\n// Distance & rest timer\n// Track meter pace\n```',
  },
  {
    label: 'Load & Resistance',
    detail: '5 Sets · 5 Back Squat 185lb · *1:00 Rest',
    wod: '```time\n(5 Sets)\n  5 Back Squat 185lb\n  *1:00 Rest\n  // Barbell resistance\n  // Rest between sets\n```',
  },
]

/**
 * Adventure script scaffolding (#884): identical header/footer for every
 * preset and for welcome-1.md, so the fenced block always occupies document
 * lines 5–11 and the card-2 highlight is fixed. Every preset fence spans 7
 * lines (open + 5 content + close) — keep them normalized when editing.
 */
export const ADVENTURE_FENCE_LINES = { open: 5, close: 11 } as const

export function buildAdventureScript(wod: string): string {
  return `# 👋 Edit Me\n\nChange the reps, distance, or load below — this is live.\n\n${wod}\n\n> Press **Run** ↑ to start the Clock.\n`
}

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
  /** Prompt shown above the choices combo box. */
  choicePrompt?: string
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
    body: 'Markdown is open and editable. WOD Wiki notes start as freeform Markdown — as you type, live type-ahead autocomplete brings the workout onto the page and completes your script.',
    foot: 'Markdown · type-ahead completion · freeform entry',
    accent: TOUR_ACCENTS.editor,
    choices: WORKOUT_PRESETS,
    choicePrompt: 'Take one for a spin ↓',
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
    body: 'Click Run in the editor top bar to execute the block — the step-through Clock launches and every line starts generating collected metrics.',
    foot: 'Run button · step-through Clock · untimed rounds',
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
    body: 'The Clock runs your exact 21-15-9 script — stepping through reps, distance, and load lines at your own pace without forced time limits.',
    foot: 'Clock · 21-15-9 step-through · live metric capture',
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
    id: 'timer-next',
    num: '02b / 03 — Advance & Lock In',
    title: (
      <>
        Next Advances the Workout.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>Every click locks a time.</em>
      </>
    ),
    body: 'Click Next to advance to the next movement or round at your own pace — each click locks the elapsed time into the collected metrics as a split. Click all the way through and the run completes, sliding you straight into the analytics.',
    foot: 'Next button · round advance · locked time splits',
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
    num: '02c / 03 — Cast to the Big Screen',
    title: (
      <>
        Cast to the Big Screen.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.timer }}>The room paces together.</em>
      </>
    ),
    body: 'Tap the cast button in the timer header and the running clock mirrors to any Chromecast — the receiver shows the movement stack and the live clock, so the whole room follows the same rep without crowding your screen.',
    foot: 'Chromecast button · receiver UI · shared pacing',
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
    id: 'wql-idea',
    num: '03a / 03 — Query what you just did',
    title: (
      <>
        Query what you just did.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>Every result is one query away.</em>
      </>
    ),
    body: 'WQL turns your journal into queryable facts — pick an aggregator and a metric, filter by tag, group by a dimension, roll up over time. The same elements drive every presentation in this window.',
    foot: 'aggregator · metric · filter · dimension · rollup',
    accent: TOUR_ACCENTS.analytics,
  },
  {
    id: 'wql-table',
    num: '03b / 03 — Read it as a list',
    title: (
      <>
        Read it as a list.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>One query, one ranked table.</em>
      </>
    ),
    body: 'One aggregator, one metric, one dimension: sum total reps grouped by effort becomes a ranked table the moment the workout is logged. The chips above the widget are the parsed query — the vocabulary, front and center.',
    foot: 'sum:totalReps{} by {effort} · parsed-query chips',
    accent: TOUR_ACCENTS.analytics,
  },
  {
    id: 'wql-graphs',
    num: '03c / 03 — See it as trends',
    title: (
      <>
        See it as trends.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>A graph is a rollup away.</em>
      </>
    ),
    body: 'Roll the same facts up by week and they become a timeseries — is tonnage rising, is training polarized? A graph is not a feature you enable; it is a rollup away.',
    foot: 'rollup(1w) · timeseries · stacked intensity',
    accent: TOUR_ACCENTS.analytics,
  },
  {
    id: 'wql-dashboard',
    num: '03d / 03 — Compose a dashboard',
    title: (
      <>
        Compose a dashboard.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>N queries on one screen.</em>
      </>
    ),
    body: 'A dashboard is just N queries on one screen. Mix values, lists, and graphs — each tile its own WQL statement, exactly like the DashboardView you get in the app.',
    foot: 'multi-query tiles · mirrors DashboardView',
    accent: TOUR_ACCENTS.analytics,
  },
  {
    id: 'wql-live',
    num: '03e / 03 — It’s your data',
    title: (
      <>
        It’s your data.{' '}
        <em className="not-italic" style={{ color: TOUR_ACCENTS.analytics }}>Query anything, your way.</em>
      </>
    ),
    body: 'Every widget here executes against your live journal — these are the sample answers until you have logged work of your own. Open the Dashboards tab to query anything, your way.',
    foot: 'live journal queries · sample fallback',
    accent: TOUR_ACCENTS.analytics,
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
          {cap.choicePrompt && (
            <div
              className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: cap.accent }}
              data-testid="tour-workout-choices-prompt"
            >
              {cap.choicePrompt}
            </div>
          )}
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
