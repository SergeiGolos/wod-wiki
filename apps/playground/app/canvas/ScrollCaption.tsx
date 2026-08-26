/**
 * ScrollCaption.tsx — cross-fading caption column for ```scroll pages.
 *
 * Sibling of the home tour's TourCaptions, but driven by parsed
 * ScrollStage[] instead of TS constants: one absolutely-stacked caption
 * per stage, opacity-toggled by the runway's active index. Caption prose
 * renders through CanvasProse so markdown (bold, code) matches the rest
 * of the canvas.
 */

import { CanvasProse } from './CanvasProse'
import type { ScrollStage } from './parseCanvasMarkdown'

export interface ScrollCaptionProps {
  stages: ScrollStage[]
  /** Active stage index from the runway slice. */
  activeIndex: number
}

export function ScrollCaption({ stages, activeIndex }: ScrollCaptionProps) {
  return (
    <div className="relative w-[330px] flex-none min-h-[280px]" data-testid="scroll-captions">
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
          aria-hidden={i !== activeIndex}
        >
          <div
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: stage.accent ?? 'hsl(var(--muted-foreground))' }}
          >
            {String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {stage.id.replace(/-/g, ' ')}
          </h3>
          {stage.caption && (
            <CanvasProse prose={stage.caption} className="mt-3 text-sm text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}
