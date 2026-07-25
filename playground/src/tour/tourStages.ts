/**
 * tourStages.ts — stage machine contract for the homepage scroll walkthrough.
 *
 * The tour is a single macOS-chrome window that stays mounted and morphs
 * through four screens (editor → timer → analytics → library) as the user
 * scrolls a tall runway. Scroll progress `p` (0..1 over the runway) maps to
 * a stage via [start, end); inside a stage the local `t` (0..1) scrubs
 * per-stage beats (typewriter, cast glide, toast, row stagger).
 *
 * All embedded screens are REAL app components — no mock markup:
 *  - editor:    NoteEditor (CodeMirror) fed by a scroll-driven typewriter
 *  - timer:     RuntimeTimerPanel with a real in-memory runtime
 *  - analytics: AnalyticsScorecard + ReviewGrid from the session's outputs
 *  - library:   getScriptCollections() rows + FeedFeed with real feed items
 *
 * Accents reference the app's existing metric tokens (src/index.css) —
 * no ad-hoc palette. Use as `hsl(var(--metric-*))`.
 */

export type TourScreen = 'editor' | 'timer' | 'analytics' | 'library'

export type TourStageId = 'overview' | TourScreen

/**
 * Registry keys for elements the highlight ring can target. Screens
 * register wrapper elements under these keys via RingTargetsContext.
 */
export type RingTargetKey =
  | 'editor.note'
  | 'timer.floor'
  | 'timer.cast'
  | 'analytics.scorecard'
  | 'library.collections'
  | 'library.feeds'

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
  /** Ring target at stage entry; null = no ring (overview). */
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
 * Stage ranges mirror the proven POC pacing (860vh runway):
 * overview 10% · editor 22% · timer 24% · analytics 22% · library 22%.
 */
export const TOUR_STAGES: TourStage[] = [
  {
    id: 'overview',
    start: 0.0,
    end: 0.1,
    screen: 'editor',
    accent: TOUR_ACCENTS.ink,
    label: 'The Training Loop',
    ringA: null,
  },
  {
    id: 'editor',
    start: 0.1,
    end: 0.32,
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: '01 · The Editor',
    ringA: 'editor.note',
    tagA: '```wod',
  },
  {
    id: 'timer',
    start: 0.32,
    end: 0.56,
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: '02 · The WallClock',
    ringA: 'timer.floor',
    tagA: 'WallClock',
    ringB: 'timer.cast',
    tagB: 'Chromecast',
    beatSplit: 0.55,
  },
  {
    id: 'analytics',
    start: 0.56,
    end: 0.78,
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: '03 · The Analytics',
    ringA: 'analytics.scorecard',
    tagA: 'Logged',
  },
  {
    id: 'library',
    start: 0.78,
    end: 1.0,
    screen: 'library',
    accent: TOUR_ACCENTS.library,
    label: '04 · Collections & Feeds',
    ringA: 'library.collections',
    tagA: 'Collections',
    ringB: 'library.feeds',
    tagB: 'Feeds',
    beatSplit: 0.55,
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

/** Mobile breakpoint (px) — below this the tour uses the split layout. */
export const TOUR_MOBILE_BREAKPOINT = 1060

/** Fixed design size of the tour canvas; scaled by transform to fit. */
export const TOUR_CANVAS_WIDTH = 1200
export const TOUR_CANVAS_HEIGHT = 720
