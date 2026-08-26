import { useState, useEffect } from 'react'
import { MOBILE_BREAKPOINT_PX } from '../canvas/canvasUtils'

/**
 * Returns true when the viewport is narrower than Tailwind's `lg` breakpoint
 * (i.e. the "phone" layout where the side-by-side canvas collapses to stacked).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
