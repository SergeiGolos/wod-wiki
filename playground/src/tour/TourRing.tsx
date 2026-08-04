/**
 * TourRing.tsx — the single gliding highlight ring + target registry.
 *
 * Screens register wrapper elements under RingTargetKeys; the ring measures
 * the active target relative to the (scaled) canvas and positions itself
 * with a CSS transition — position changes are discrete (stage/beat
 * boundaries), never per-frame layout thrash.
 *
 * The ring renders inside the fixed 1200×720 canvas coordinate space, so
 * measured rects are divided by the current canvas scale.
 */

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { RingTargetKey } from './tourStages'
import { TOUR_CANVAS_WIDTH } from './tourStages'

// ── Registry ────────────────────────────────────────────────────────────────

export type RingRegistry = Record<RingTargetKey, HTMLElement | null>

export interface RingTargetsContextValue {
  register: (key: RingTargetKey, el: HTMLElement | null) => void
  registry: React.MutableRefObject<RingRegistry>
  /** Bumps when any registration changes so the ring re-measures. */
  version: number
}

const RingTargetsContext = createContext<RingTargetsContextValue | null>(null)

export function RingTargetsProvider({ children }: { children: ReactNode }) {
  const registry = useRef<RingRegistry>({
    'editor.window': null,
    'editor.wodBlock': null,
    'editor.runButton': null,
    'editor.typeahead': null,
    'timer.floor': null,
    'timer.cast': null,
    'analytics.scorecard': null,
    'analytics.grid': null,
  })
  const [version, setVersion] = useState(0)

  const register = useCallback((key: RingTargetKey, el: HTMLElement | null) => {
    if (registry.current[key] === el) return
    registry.current[key] = el
    setVersion((v) => v + 1)
  }, [])

  return (
    <RingTargetsContext.Provider value={{ register, registry, version }}>
      {children}
    </RingTargetsContext.Provider>
  )
}

export function useRingTargets(): RingTargetsContextValue {
  const ctx = useContext(RingTargetsContext)
  if (!ctx) throw new Error('useRingTargets must be used within RingTargetsProvider')
  return ctx
}

/** Callback ref for screens: registers the element under a ring key.
 *  No-ops outside a RingTargetsProvider so screens can render standalone. */
export function useRingRef(key: RingTargetKey) {
  const ctx = useContext(RingTargetsContext)
  const register = ctx?.register
  return useCallback((el: HTMLElement | null) => register?.(key, el), [key, register])
}

// ── Ring ────────────────────────────────────────────────────────────────────

export interface TourRingProps {
  /** Active target; null hides the ring. */
  target: { key: RingTargetKey; tag?: string } | null
  /** Accent color (CSS color string). */
  accent: string
  /**
   * Ref to the scaled canvas-inner element the ring renders inside.
   * Measurements are made relative to it and divided by its scale.
   */
  canvasRef: React.RefObject<HTMLElement | null>
}

interface RingBox {
  x: number
  y: number
  w: number
  h: number
}

export function TourRing({ target, accent, canvasRef }: TourRingProps) {
  const { registry, version } = useRingTargets()
  const [box, setBox] = useState<RingBox | null>(null)
  const targetKey = target?.key ?? null

  useLayoutEffect(() => {
    if (!targetKey) {
      setBox(null)
      return
    }
    const measure = () => {
      const el = registry.current[targetKey]
      const canvas = canvasRef.current
      if (!el || !canvas) {
        setBox(null)
        return
      }
      const elRect = el.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()
      const scale = canvasRect.width / TOUR_CANVAS_WIDTH || 1
      // Round to whole canvas px: during a resize drag the subpixel noise
      // would otherwise restart the 500ms position transition every event
      // and the ring would smear/shimmer instead of staying glued.
      setBox({
        x: Math.round((elRect.left - canvasRect.left) / scale),
        y: Math.round((elRect.top - canvasRect.top) / scale),
        w: Math.round(elRect.width / scale),
        h: Math.round(elRect.height / scale),
      })
    }
    measure()
    // Re-measure after transitions/layout settles (screen cross-fades, fonts).
    const t1 = window.setTimeout(measure, 120)
    const t2 = window.setTimeout(measure, 480)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', measure)
    }
  }, [targetKey, version, registry, canvasRef])

  if (!target || !box) return null

  const pad = 6
  return (
    <div
      data-testid="tour-ring"
      className="pointer-events-none absolute z-30 rounded-lg border-2 transition-all duration-500 ease-out"
      style={{
        left: box.x - pad,
        top: box.y - pad,
        width: box.w + pad * 2,
        height: box.h + pad * 2,
        borderColor: accent,
        boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 16%, transparent), 0 0 28px color-mix(in srgb, ${accent} 38%, transparent)`,
      }}
    >
      {target.tag && (
        <span
          className="absolute -top-0.5 -right-0.5 rounded-bl-md px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white"
          style={{ background: accent }}
        >
          {target.tag}
        </span>
      )}
    </div>
  )
}
