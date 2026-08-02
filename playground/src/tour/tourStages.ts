/**
 * tourStages.ts — stage machine contract for the homepage scroll walkthrough.
 *
 * The redesigned home page folds the editor into the hero and the Library
 * stage into the short-circuit strip. The sticky morphing window now only
 * morphs between the Timer and Analytics stages. Progress `p` (0..1 over the
 * runway) maps to a stage via [start, end); inside a stage the local `t`
 * (0..1) scrubs per-stage beats (cast glide, toast).
 *
 * All embedded screens are REAL app components — no mock markup:
 *  - timer:     RuntimeTimerPanel with a real in-memory runtime
 *  - analytics: AnalyticsScorecard + ReviewGrid from the session's outputs
 *
 * Accents reference the app's existing metric tokens (src/index.css) —
 * no ad-hoc palette. Use as `hsl(var(--metric-*))`.
 */

export type TourScreen = 'editor' | 'timer' | 'analytics'

export type TourStageId =
  | 'editor-blank'
  | 'editor-metrics'
  | 'editor-run'
  | 'editor-typeahead'
  | 'timer-wallclock'
  | 'timer-cast'
  | 'analytics-scorecard'
  | 'analytics-grid'
  | 'editor'
  | 'timer'
  | 'analytics'

/**
 * Registry keys for elements the highlight ring can target. Screens
 * register wrapper elements under these keys via RingTargetsContext.
 */
export type RingTargetKey =
  | 'editor.fence'
  | 'editor.wodBlock'
  | 'editor.runButton'
  | 'editor.typeahead'
  | 'timer.floor'
  | 'timer.cast'
  | 'analytics.scorecard'
  | 'analytics.grid'
export interface TourStage {
  id: TourStageId
  /** Runway progress range [start, end). */
  start: number
  end: number
  /** Which screen is visible during this stage. */
  screen: TourScreen
  /** Accent as a CSS color string built from the repo's metric tokens. */
  accent: string
  /** Stage-bar label. */
  label: string
  /** Ring target at stage entry; null = no ring. */
  ringA: RingTargetKey | null
  /** Tag rendered in the ring's corner tab for beat A / beat B. */
  tagA?: string
  tagB?: string
  /**
   * Optional second beat: when local t >= beatSplit the ring glides to
   * ringB (CSS transition on the ring, no layout thrash).
   */
  ringB?: RingTargetKey
  beatSplit?: number
}

/** Metric-token accents (light + dark safe — tokens flip with the theme). */
export const TOUR_ACCENTS = {
  ink: 'hsl(var(--foreground))',
  editor: 'hsl(var(--metric-resistance))',
  timer: 'hsl(var(--metric-effort))',
  analytics: 'hsl(var(--metric-rounds))',
  library: 'hsl(var(--metric-rep))',
} as const

/**
 * Stage ranges for the two-stage runway: timer 50% · analytics 50%.
 * The hero and static areas live outside the runway.
 */
export const TOUR_STAGES: TourStage[] = [
  {
    id: 'editor-blank',
    start: 0.0,
    end: 0.15,
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Blank Page & Typeahead',
    ringA: 'editor.fence',
    tagA: '```wod Fence',
  },
  {
    id: 'editor-metrics',
    start: 0.15,
    end: 0.30,
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Every Line Collects Metrics',
    ringA: 'editor.wodBlock',
    tagA: 'Line Metrics',
  },
  {
    id: 'editor-run',
    start: 0.30,
    end: 0.45,
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Press Run to Start',
    ringA: 'editor.runButton',
    tagA: 'Run Button',
  },
  {
    id: 'timer-wallclock',
    start: 0.45,
    end: 0.60,
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: 'What Happens When It Runs',
    ringA: 'timer.floor',
    tagA: 'WallClock',
  },
  {
    id: 'timer-cast',
    start: 0.60,
    end: 0.72,
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: 'Broadcast the Timer',
    ringA: 'timer.cast',
    tagA: 'Chromecast',
  },
  {
    id: 'analytics-scorecard',
    start: 0.72,
    end: 0.86,
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'Explore Your Data',
    ringA: 'analytics.scorecard',
    tagA: 'Scorecard',
  },
  {
    id: 'analytics-grid',
    start: 0.86,
    end: 1.0,
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'Session Review',
    ringA: 'analytics.grid',
    tagA: 'Review Grid',
  },
]

export interface TourStageSlice {
  /** Index into TOUR_STAGES. */
  index: number
  stage: TourStage
  /** Local progress within the stage, 0..1. */
  t: number
  /** Active ring target + tag after beat resolution. */
  ring: { key: RingTargetKey; tag?: string } | null
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Resolve runway progress into the active stage slice, including
 * second-beat ring resolution. Pure — unit-testable.
 */
export function resolveStage(progress: number): TourStageSlice {
  const p = clamp01(progress)
  let index = TOUR_STAGES.findIndex((s) => p >= s.start && p < s.end)
  if (index === -1) index = p >= 1 ? TOUR_STAGES.length - 1 : 0
  const stage = TOUR_STAGES[index]
  const t = clamp01((p - stage.start) / (stage.end - stage.start))

  let ring: TourStageSlice['ring'] = null
  if (stage.ringA) {
    const inBeatB =
      stage.ringB != null && stage.beatSplit != null && t >= stage.beatSplit
    ring = inBeatB
      ? { key: stage.ringB as RingTargetKey, tag: stage.tagB }
      : { key: stage.ringA, tag: stage.tagA }
  }
  return { index, stage, t, ring }
}

/** Runway height — matches the POC's deliberate scroll pace. */
export const TOUR_RUNWAY_HEIGHT = '860vh'

/** Fixed design size of the tour canvas; scaled by transform to fit. */
export const TOUR_CANVAS_WIDTH = 1200
export const TOUR_CANVAS_HEIGHT = 720
