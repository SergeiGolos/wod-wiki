/**
 * ScrollRing.tsx — highlight ring for ```scroll stages.
 *
 * Two focus modes over one contract: frame the whole editor panel (the
 * default), or a specific set of doc `lines` (1-based inclusive) measured
 * from the CodeMirror line elements in the ring's container. The runway
 * only mounts the ring once the stage's text is fully loaded
 * (isStageTextLoaded), so the box never frames lines that are still
 * being typed — focus follows load for both the typewriter and
 * auto-loaded text. When the target lines aren't rendered (long docs
 * virtualize), it falls back to the whole-panel box. Transition is a
 * simple CSS fade — no target registry, no canvas scaling.
 */
import { useLayoutEffect, useRef, useState } from 'react'

export interface ScrollRingProps {
  /** Corner tag text (e.g. the syntax token being highlighted). */
  tag?: string
  /** Accent color of the active stage. */
  accent?: string
  /** 1-based inclusive doc lines to focus; omit to frame the whole editor panel. */
  lines?: [number, number]
}

/** Union rect of the target lines, container-relative, with padding. */
function measureLines(
  container: HTMLElement,
  lines: [number, number],
): { top: number; left: number; width: number; height: number } | null {
  const cmLines = container.querySelectorAll<HTMLElement>('.cm-content .cm-line')
  const start = Math.max(1, Math.min(lines[0], lines[1])) - 1
  const end = Math.max(1, Math.max(lines[0], lines[1]))
  const targets = Array.from(cmLines).slice(start, end)
  if (targets.length === 0) return null
  const cRect = container.getBoundingClientRect()
  let top = Infinity
  let left = Infinity
  let bottom = -Infinity
  let right = -Infinity
  for (const target of targets) {
    const r = target.getBoundingClientRect()
    top = Math.min(top, r.top)
    left = Math.min(left, r.left)
    bottom = Math.max(bottom, r.bottom)
    right = Math.max(right, r.right)
  }
  const PAD_Y = 3
  const PAD_X = 8
  return {
    top: top - cRect.top - PAD_Y,
    left: left - cRect.left - PAD_X,
    width: right - left + PAD_X * 2,
    height: bottom - top + PAD_Y * 2,
  }
}

export function ScrollRing({ tag, accent, lines }: ScrollRingProps) {
  const color = accent ?? 'hsl(var(--foreground))'
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = ringRef.current
    if (!el) return
    // Fade in a frame after mount — the ring appears when the text just
    // finished loading, so the arrival is a settle, not a pop.
    const id = requestAnimationFrame(() => setVisible(true))
    if (!lines) {
      setBox(null)
      return () => cancelAnimationFrame(id)
    }
    const container = el.parentElement
    if (!container) {
      setBox(null)
      return () => cancelAnimationFrame(id)
    }
    const measure = () => setBox(measureLines(container, lines))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => {
      cancelAnimationFrame(id)
      observer.disconnect()
    }
  }, [lines])

  return (
    <div
      ref={ringRef}
      className={`pointer-events-none absolute z-30 transition-all duration-300 ${
        box ? 'rounded-lg' : '-inset-1.5 rounded-2xl'
      }`}
      style={{ boxShadow: `0 0 0 2px ${color}`, opacity: visible ? 1 : 0, ...(box ?? {}) }}
      data-testid="scroll-ring"
      data-ring-lines={lines ? `${lines[0]}-${lines[1]}` : undefined}
    >
      {tag && (
        <span
          className="absolute -top-3 left-4 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-background"
          style={{ background: color }}
        >
          {tag}
        </span>
      )}
    </div>
  )
}
