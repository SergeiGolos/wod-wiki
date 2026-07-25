/**
 * TourStaticCards.tsx — the reduced-motion fallback.
 *
 * When `prefers-reduced-motion: reduce` is active, the scroll-jacked runway
 * is replaced by a plain card list telling the same four-part story. Cards
 * carry stable ids (`tour-card-<stage>`) so the quest list can scroll to
 * them, and an IntersectionObserver reports cards scrolling into view so
 * the tour's scroll quests fire here too.
 */

import { useEffect, useRef } from 'react'
import { TOUR_CAPTIONS, CaptionBody } from './TourCaptions'

const SWATCHES: Record<string, string> = {
  editor: '(3 Rounds) · 10 Pushups · 15 Air Squats · *:30 Rest',
  timer: '00:47 — Round 2 · capturing reps & volume · CAST → TV',
  analytics: 'Round splits · totals · written back to the journal entry',
  library: 'Crossfit Girls · Dan John · daily programmed feeds',
}

export interface TourStaticCardsProps {
  /** Fired once per card when it scrolls into view (stage id). */
  onCardVisible?: (stageId: string) => void
}

export function TourStaticCards({ onCardVisible }: TourStaticCardsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!onCardVisible || typeof IntersectionObserver === 'undefined') return
    const list = listRef.current
    if (!list) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const stageId = (entry.target as HTMLElement).dataset.cardId
          if (stageId) onCardVisible(stageId)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.4 },
    )
    list.querySelectorAll('[data-card-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [onCardVisible])

  return (
    <section className="px-6 pt-4 pb-24" data-testid="tour-static-cards">
      <div ref={listRef} className="mx-auto max-w-2xl">
        {TOUR_CAPTIONS.filter((c) => c.id !== 'overview').map((cap) => (
          <article
            key={cap.id}
            id={`tour-card-${cap.id}`}
            data-card-id={cap.id}
            className="mb-6 rounded-2xl border border-border bg-card p-7"
          >
            <CaptionBody cap={cap} />
            <div className="mt-5 flex min-h-[72px] items-center justify-center rounded-lg bg-background px-4 py-4 text-center font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
              {SWATCHES[cap.id]}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
