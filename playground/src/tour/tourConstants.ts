/**
 * tourConstants.ts — Presentation constants and types for the homepage tour.
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
  | 'timer-next'
  | 'timer-cast'
  | 'editor'
  | 'timer'
  | 'analytics'

/**
 * Registry keys for elements the highlight ring can target. Screens
 * register wrapper elements under these keys via RingTargetsContext.
 */
export type RingTargetKey =
  | 'editor.window'
  | 'editor.wodBlock'
  | 'editor.runButton'
  | 'editor.typeahead'
  | 'timer.floor'
  | 'timer.nextButton'
  | 'timer.castButton'
  | 'analytics.vocab'
  | 'analytics.table'
  | 'analytics.graphs'
  | 'analytics.dashboard'

/** Metric-token accents (light + dark safe — tokens flip with the theme). */
export const TOUR_ACCENTS = {
  ink: 'hsl(var(--foreground))',
  editor: 'hsl(var(--metric-resistance))',
  timer: 'hsl(var(--metric-effort))',
  analytics: 'hsl(var(--metric-rounds))',
  library: 'hsl(var(--metric-rep))',
} as const

export interface TourStage {
  id: TourStageId
  screen: TourScreen
  accent?: string
  label?: string
  ringA?: RingTargetKey | null
  tagA?: string
}

export const TOUR_STAGES: TourStage[] = [
  { id: 'editor-blank', screen: 'editor', accent: TOUR_ACCENTS.editor, label: 'Blank Page & Typeahead', ringA: 'editor.window', tagA: 'Live Editor' },
  { id: 'editor-metrics', screen: 'editor', accent: TOUR_ACCENTS.editor, label: 'Every Line Collects Metrics', ringA: 'editor.wodBlock', tagA: 'Line Metrics' },
  { id: 'editor-run', screen: 'editor', accent: TOUR_ACCENTS.editor, label: 'Press Run to Start', ringA: 'editor.runButton', tagA: 'Run Button' },
  { id: 'timer-wallclock', screen: 'timer', accent: TOUR_ACCENTS.timer, label: 'What Happens When It Runs', ringA: 'timer.floor', tagA: 'WallClock' },
  { id: 'timer-next', screen: 'timer', accent: TOUR_ACCENTS.timer, label: 'Advance Rounds with Next', ringA: 'timer.nextButton', tagA: 'Next Button' },
  { id: 'timer-cast', screen: 'timer', accent: TOUR_ACCENTS.timer, label: 'Cast to the Big Screen', ringA: 'timer.castButton', tagA: 'Cast' },
]

/** Window-chrome title shown while each screen is active. */
export const SCREEN_TITLES: Record<TourScreen, string> = {
  editor: 'WOD Editor & Autocomplete',
  timer: 'WallClock',
  analytics: 'Session Review',
}

/** Runway height — matches the POC's deliberate scroll pace. */
export const TOUR_RUNWAY_HEIGHT = '860vh'

