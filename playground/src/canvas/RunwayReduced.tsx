/**
 * RunwayReduced.tsx — the reduced-motion presentation of a ```scroll runway:
 * a flat stack of static stage cards. No pinned window, no scrub — each stage
 * renders its full source. Stage-entry fires via IntersectionObserver as each
 * card scrolls into view. One branch of the Runway Adapter (#936); the adapter
 * routes here on Form Factor, so nothing in this file self-detects motion
 * preference.
 */
import { useEffect, useMemo, useRef } from 'react'
import type { ScrollSpec } from './parseCanvasMarkdown'
import { resolveSource } from './canvasUtils'
import { CanvasProse } from './CanvasProse'

export interface RunwayReducedProps {
  spec: ScrollSpec
  wodFiles: Record<string, string>
  /** Fired once per stage as its card scrolls into view. */
  onStageEnter?: (stageId: string) => void
  className?: string
}

export function RunwayReduced({ spec, wodFiles, onStageEnter, className }: RunwayReducedProps) {
  const stages = spec.stages
  const sourcesByStageId = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s.source ? resolveSource(s.source, wodFiles) : ''])),
    [stages, wodFiles],
  )
  const cardsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const list = cardsRef.current
    if (!list) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const sid = (entry.target as HTMLElement).dataset.cardId
          if (sid) {
            onStageEnter?.(sid)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.4 },
    )
    list.querySelectorAll('[data-card-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [onStageEnter])

  return (
    <section className={className} data-testid="runway-reduced">
      <div className="px-6 pt-4 pb-24">
        <div ref={cardsRef} className="mx-auto max-w-2xl">
          {stages.map((stage, i) => (
            <article key={stage.id} data-card-id={stage.id} className="mb-6 rounded-2xl border border-border bg-card p-7">
              <div
                className="font-mono text-[11px] uppercase tracking-[0.22em]"
                style={{ color: stage.accent ?? 'hsl(var(--muted-foreground))' }}
              >
                {String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{stage.id.replace(/-/g, ' ')}</h3>
              {stage.caption && <CanvasProse prose={stage.caption} className="mt-3 text-sm text-muted-foreground" />}
              {sourcesByStageId[stage.id] && (
                <pre className="mt-5 overflow-x-auto rounded-lg bg-background px-4 py-4 font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
                  {sourcesByStageId[stage.id]}
                </pre>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
