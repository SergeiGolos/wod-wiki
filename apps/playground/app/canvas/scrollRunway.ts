/**
 * scrollRunway.ts — pure stage resolution for markdown-driven scroll pages.
 *
 * The engine core of the ```scroll DSL: maps runway progress (0..1) onto
 * the active ScrollStage plus a local `t`, mirroring the home tour's
 * `resolveStage` (tourStages.ts) but operating on parsed ScrollStage[]
 * instead of TS constants. Pure — unit-testable.
 */

import type { ScrollStage } from './parseCanvasMarkdown'

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const quadOut = (t: number) => 1 - (1 - t) ** 2

export interface ScrollSlice {
  /** Index into the page's stages array. */
  index: number
  stage: ScrollStage
  /** Local progress within the stage, 0..1. */
  t: number
  /** Resolved ring target (key / tag / lines optional) — null when the stage has none. */
  ring: { key?: string; tag?: string; lines?: [number, number] } | null
}

/**
 * A stage's text is loaded when the editor holds its full script: the
 * typewriter's completion point, immediate for auto-loaded text (stage 0
 * types instantly) and for sourceless stages (which hold the previous
 * content). Focus visuals (the ring) wait for this so they never frame
 * lines that are still being written.
 */
export function isStageTextLoaded(script: string, doc: string): boolean {
  return script === '' || doc === script
}

/**
 * Resolve runway progress into the active stage slice. Stage ranges are
 * clamped into [0,1] here (an inverted or out-of-bounds range declared in
 * markdown never breaks resolution). Out-of-range progress clamps to the
 * last stage when p >= 1, the first otherwise — same contract as the
 * tour's resolveStage.
 */
const EMPTY_STAGE: ScrollStage = { id: '', range: [0, 1] }

export function resolveScrollStage(progress: number, stages: ScrollStage[]): ScrollSlice {
  if (!stages || stages.length === 0) {
    return { index: -1, stage: EMPTY_STAGE, t: 0, ring: null }
  }
  const p = clamp01(progress)
  const clamped = stages.map((s) => ({
    ...s,
    start: clamp01(Math.min(s.range[0], s.range[1])),
    end: clamp01(Math.max(s.range[0], s.range[1])),
  }))
  let index = clamped.findIndex((s) => p >= s.start && p < s.end)
  if (index === -1) index = p >= 1 ? clamped.length - 1 : 0
  const stage = clamped[index] ?? EMPTY_STAGE
  const span = (stage.end ?? 1) - (stage.start ?? 0)
  const t = span > 0 ? clamp01((p - (stage.start ?? 0)) / span) : 0
  const ring = stage.ring
    ? {
        tag: stage.ring === true ? undefined : stage.ring.tag,
        key: stage.ring === true ? undefined : stage.ring.key,
        lines: stage.ring === true ? undefined : stage.ring.lines,
      }
    : null
  return { index, stage, t, ring }
}
