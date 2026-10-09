/**
 * scrollTrack.ts — pure geometry for the ScrollTrack service
 * (ScrollTrackProvider.tsx).
 *
 * A track is one continuous scroll surface made of segments (the hero,
 * each runway section's track, …) laid out in page order. Every segment's
 * progress derives from the SAME track scroll position, which is what
 * makes progress continuous across segment boundaries: there is no
 * per-section driver to hand off between.
 */

import { clamp01 } from '../canvas/scrollRunway'

export interface SegmentMeasure {
  /** Runway progress 0..1 — same math as the per-section driver it replaces:
   *  0 when the segment top reaches the viewport top, 1 when its bottom does. */
  progress: number
  /** The segment top has reached (or passed) the viewport top. */
  reached: boolean
  /** Any part of the segment is inside the viewport. */
  inView: boolean
}

/**
 * Measure one segment from its viewport-relative rect.
 *
 * `top`/`height` are getBoundingClientRect() values (viewport space);
 * progress is measured over the scrollable distance (height − viewport),
 * exactly like useScrollRunway's measure.
 */
export function measureSegment(top: number, height: number, viewportH: number): SegmentMeasure {
  const total = height - viewportH
  const progress = total > 0 ? clamp01(-top / total) : 0
  return {
    progress,
    reached: top <= 0,
    inView: top < viewportH && top + height > 0,
  }
}

export interface SegmentSpan {
  id: string
  /** Viewport-space top of the segment. */
  top: number
  /** Viewport-space bottom of the segment. */
  bottom: number
}

/**
 * The active segment is the one the reading line (viewport middle)
 * currently crosses. Spans are in page order; first match wins. Returns
 * null when the reading line sits outside every segment (page chrome,
 * interstitial content between segments) — gates release there.
 */
export function resolveActiveSegmentId(
  spans: readonly SegmentSpan[],
  viewportH: number,
): string | null {
  const line = viewportH / 2
  for (const span of spans) {
    if (span.top <= line && span.bottom > line) return span.id
  }
  return null
}
