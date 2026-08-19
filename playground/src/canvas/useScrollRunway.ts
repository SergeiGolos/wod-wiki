/**
 * useScrollRunway.ts — window-scroll driver for markdown-driven ```scroll
 * runways (the canvas-page sibling of the home tour's useTourScroll).
 *
 * Tracks scroll progress over the runway element and resolves it into the
 * parsed stage machine (scrollRunway.resolveScrollStage). Two consumption
 * channels, same contract as the tour:
 *
 *  - React state: `slice` — updates only when the discrete stage index
 *    changes (ring/tag ride along — cheap, and the caption cross-fade
 *    needs them). Safe to render from.
 *  - `subscribe(cb)`: imperative per-frame callbacks with the full slice
 *    (including local t) for scrubbed visuals (typewriter char count,
 *    toast, author-declared effects). Subscribers mutate the DOM via refs
 *    — transform/opacity only, no React re-render per frame.
 *
 * While `interactive` (playground mode) is set, scroll syncing is frozen:
 * subscribers stop firing and `slice` holds its last value.
 *
 * Deliberately a near-copy of tour/useTourScroll.ts operating on parsed
 * ScrollStage[] — the home tour file is not imported or mutated, so the
 * home page stays untouched.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { resolveScrollStage, type ScrollSlice } from './scrollRunway'
import type { ScrollStage } from './parseCanvasMarkdown'
export type ScrollRunwaySubscriber = (slice: ScrollSlice, progress: number) => void

/**
 * Nearest scrollable ancestor (the app shell scrolls a container div, not
 * window). Falls back to the document scrolling element.
 */
export function getScrollParent(el: HTMLElement): HTMLElement | typeof window {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node
    }
    node = node.parentElement
  }
  return window
}

/**
 * Scroll the runway's scroll container so runway progress lands on
 * `progress` (0..1).
 */
export function scrollRunwayTo(el: HTMLElement, progress: number, behavior: ScrollBehavior = 'smooth') {
  const scroller = getScrollParent(el)
  const total = el.offsetHeight - window.innerHeight
  if (total <= 0) return
  if (scroller instanceof HTMLElement) {
    const top = el.offsetTop
    scroller.scrollTo({ top: top + progress * total, behavior })
    return
  }
  const top = el.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: top + progress * total, behavior })
}

export interface UseScrollRunwayResult {
  /** Discrete stage state for React rendering. */
  slice: ScrollSlice
  /** Raw runway progress 0..1 (state — updates with slice only). */
  progress: number
  /** True once the runway top has reached the viewport top (scrolled past hero). */
  runwayReached: boolean
  /** Subscribe to per-frame scrub updates. Returns unsubscribe. */
  subscribe: (cb: ScrollRunwaySubscriber) => () => void
  /** Force a re-sync from current scroll position (e.g. after exiting playground mode). */
  resync: () => void
}

export function useScrollRunway(
  runwayRef: React.RefObject<HTMLElement | null>,
  interactive: boolean,
  stages: ScrollStage[],
): UseScrollRunwayResult {
  const [slice, setSlice] = useState<ScrollSlice>(() => resolveScrollStage(0, stages))
  const [runwayReached, setRunwayReached] = useState(false)
  const progressRef = useRef(0)
  const sliceRef = useRef(slice)
  const subscribersRef = useRef(new Set<ScrollRunwaySubscriber>())
  const rafRef = useRef(0)
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive

  // Stages are parsed once per page; keep a ref so measure stays stable.
  const stagesRef = useRef(stages)
  stagesRef.current = stages

  const emit = useCallback((next: ScrollSlice, progress: number) => {
    const prev = sliceRef.current
    sliceRef.current = next
    progressRef.current = progress
    // Discrete updates → React
    if (prev.index !== next.index || prev.ring?.key !== next.ring?.key) {
      setSlice(next)
    }
    // Imperative scrub subscribers
    subscribersRef.current.forEach((cb) => cb(next, progress))
  }, [])

  const measure = useCallback(() => {
    rafRef.current = 0
    if (interactiveRef.current) return
    const el = runwayRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const total = rect.height - window.innerHeight
    if (total <= 0) return
    const progress = Math.max(0, Math.min(1, -rect.top / total))
    setRunwayReached(rect.top <= 0)
    emit(resolveScrollStage(progress, stagesRef.current), progress)
  }, [runwayRef, emit])

  const onScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(measure)
  }, [measure])

  useEffect(() => {
    // Capture phase: scroll events don't bubble, and the app shell scrolls
    // inside a container div (not window) — capture catches every scroller.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    measure()
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [onScroll, measure])

  const subscribe = useCallback((cb: ScrollRunwaySubscriber) => {
    subscribersRef.current.add(cb)
    // Fire immediately with current state so late-mounting screens sync.
    cb(sliceRef.current, progressRef.current)
    return () => {
      subscribersRef.current.delete(cb)
    }
  }, [])

  const resync = useCallback(() => {
    measure()
  }, [measure])

  return { slice, progress: progressRef.current, runwayReached, subscribe, resync }
}
