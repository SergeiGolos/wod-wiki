/**
 * ScrollToast.tsx — transient toast for ```scroll stages.
 *
 * A forwardRef div: the parent sets opacity/transform imperatively from
 * the runway subscriber (fade math lives in ScrollCanvasPage — fixed, not
 * author-configurable in v1). Mounted only while the active stage
 * declares a `toast`.
 */

import { forwardRef } from 'react'

export interface ScrollToastProps {
  text: string
  /** Accent color of the active stage (dot + highlight). */
  accent?: string
}

export const ScrollToast = forwardRef<HTMLDivElement, ScrollToastProps>(
  function ScrollToast({ text, accent }, ref) {
    const color = accent ?? 'hsl(var(--metric-rounds))'
    return (
      <div
        ref={ref}
        className="pointer-events-none absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border bg-card px-5 py-2.5 font-mono text-[10.5px] tracking-[0.04em] opacity-0 shadow-xl"
        style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)` }}
      >
        <span className="size-[9px] rounded-sm" style={{ background: color }} />
        {text}
      </div>
    )
  },
)
