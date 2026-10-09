/**
 * tourContextSize.ts — measured-context orientation for the home tour.
 *
 * The available context is the actual content box a tour surface occupies
 * (ResizeObserver), or the window below the app sticky nav when no element
 * applies (desktop STICKY_NAV_HEIGHT, mobile MOBILE_STICKY_TOP, dynamic
 * viewport). The demo takes TOUR_DEMO_SHARE and the description the rest,
 * along the dominant axis: split side-by-side when the context is at least
 * as wide as tall, stacked when taller — never viewport-width breakpoints.
 * Demo/description CSS is plain calc/flex ratios at the call sites.
 */
import { useCallback, useEffect, useState } from 'react'

/** Demo pane share of the measured context; the description takes the rest. */
export const TOUR_DEMO_SHARE = 0.6

export type TourContextMode = 'split' | 'stack'

/** Side-by-side when the measured context is at least as wide as tall. */
export function tourContextMode(width: number, height: number): TourContextMode {
  return width >= height ? 'split' : 'stack'
}

export interface TourContextSize {
  width: number
  height: number
  mode: TourContextMode
}

/**
 * Live context measurement. With `el`, ResizeObserver reports the element's
 * content box — the true layout context after nav/status strip/padding.
 * Without it, the window minus `navOffset`, re-measured on resize; that
 * window estimate also stands when ResizeObserver is unavailable (jsdom).
 */
export function useTourContextSize(navOffset: number, el?: HTMLElement | null): TourContextSize {
  const measure = useCallback(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0, mode: 'stack' as const }
    const width = window.innerWidth
    const height = Math.max(0, window.innerHeight - navOffset)
    return { width, height, mode: tourContextMode(width, height) }
  }, [navOffset])
  const [size, setSize] = useState(measure)
  useEffect(() => {
    if (el && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        setSize((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height, mode: tourContextMode(width, height) },
        )
      })
      observer.observe(el)
      return () => observer.disconnect()
    }
    const onResize = () =>
      setSize((prev) => {
        const next = measure()
        return prev.width === next.width && prev.height === next.height ? prev : next
      })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [el, measure])
  return size
}
