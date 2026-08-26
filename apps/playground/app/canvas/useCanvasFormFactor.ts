import { useMediaQuery } from '../hooks/useMediaQuery'
import { MOBILE_BREAKPOINT_PX } from './canvasUtils'

export type CanvasFormFactor = 'desktop' | 'mobile' | 'reduced'

/** Derives the canvas presentation context once for a renderer. */
export function useCanvasFormFactor(): CanvasFormFactor {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`)
  return reduced ? 'reduced' : mobile ? 'mobile' : 'desktop'
}
