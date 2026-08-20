/**
 * ScrollRing.tsx — highlight ring for ```scroll stages.
 *
 * Two focus modes over one contract: frame the whole editor panel (the
 * default), or a specific set of doc `lines` (1-based inclusive) measured
 * from the CodeMirror line elements. Both modes measure the real editor
 * element — the ring container's first child, the EditorWindow — so the
 * box hugs the editor window on every form factor: the desktop parent
 * pads the editor inside a larger canvas, the mobile one is sized to it
 * exactly, so a fixed outset from the container would float outside the
 * window on mobile; the line box is likewise clamped to the editor's
 * bounds. The runway only mounts the ring once the stage's text is fully
 * loaded (isStageTextLoaded), so the box never frames lines that are
 * still being typed — focus follows load for both the typewriter and
 * auto-loaded text. When the target lines aren't rendered (long docs
 * virtualize), it falls back to the panel box. Transition is a simple
 * CSS fade — no target registry, no canvas scaling.
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

/** Ring box in container-relative coordinates. */
interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD_X = 8
const PAD_Y = 3
/** How far a box may sit outside the editor's own edge. */
const OUTSET = 2

/**
 * Union rect of the target lines, padded and clamped to the editor's
 * bounds — on tight layouts (mobile, where the editor fills its
 * container) the padding would otherwise draw outside the editor window.
 * Null when the target lines aren't rendered.
 */
function measureLines(
  container: HTMLElement,
  editorRect: DOMRect | null,
  lines: [number, number],
): Box | null {
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
  top -= PAD_Y
  left -= PAD_X
  bottom += PAD_Y
  right += PAD_X
  if (editorRect) {
    left = Math.max(left, editorRect.left - OUTSET)
    right = Math.min(right, editorRect.right + OUTSET)
    top = Math.max(top, editorRect.top - OUTSET)
    bottom = Math.min(bottom, editorRect.bottom + OUTSET)
  }
  return {
    top: top - cRect.top,
    left: left - cRect.left,
    width: right - left,
    height: bottom - top,
  }
}

/** The editor window's own rect, container-relative, ± OUTSET. */
function measurePanel(container: HTMLElement, editor: HTMLElement | null): Box | null {
  if (!editor) return null
  const eRect = editor.getBoundingClientRect()
  if (eRect.width === 0 || eRect.height === 0) return null
  const cRect = container.getBoundingClientRect()
  return {
    top: eRect.top - cRect.top - OUTSET,
    left: eRect.left - cRect.left - OUTSET,
    width: eRect.width + OUTSET * 2,
    height: eRect.height + OUTSET * 2,
  }
}

export function ScrollRing({ tag, accent, lines }: ScrollRingProps) {
  const color = accent ?? 'hsl(var(--foreground))'
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = ringRef.current
    if (!el) return
    // Fade in a frame after mount — the ring appears when the text just
    // finished loading, so the arrival is a settle, not a pop.
    const id = requestAnimationFrame(() => setVisible(true))
    const container = el.parentElement
    if (!container) return () => cancelAnimationFrame(id)

    const measure = () => {
      // The EditorWindow — the container's first child, rendered before
      // the ring on both form factors.
      const editor = container.firstElementChild as HTMLElement | null
      const editorRect = editor?.getBoundingClientRect() ?? null
      setBox(
        (lines ? measureLines(container, editorRect, lines) : null) ??
          measurePanel(container, editor),
      )
    }
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
        box ? (lines ? 'rounded-lg' : 'rounded-2xl') : '-inset-1.5 rounded-2xl'
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
