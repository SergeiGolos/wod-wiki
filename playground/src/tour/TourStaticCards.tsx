/**
 * TourStaticCards.tsx — the reduced-motion fallback.
 *
 * When `prefers-reduced-motion: reduce` is active, the scroll-jacked runway
 * is replaced by a plain card list telling the same four-part story.
 */

import { TOUR_CAPTIONS, CaptionBody } from './TourCaptions'

const SWATCHES: Record<string, string> = {
  editor: '(3 Rounds) · 10 Pushups · 15 Air Squats · *:30 Rest',
  timer: '00:47 — Round 2 · capturing reps & volume · CAST → TV',
  analytics: 'Round splits · totals · written back to the journal entry',
  library: 'Crossfit Girls · Dan John · daily programmed feeds',
}

export function TourStaticCards() {
  return (
    <section className="px-6 pt-4 pb-24" data-testid="tour-static-cards">
      <div className="mx-auto max-w-2xl">
        {TOUR_CAPTIONS.filter((c) => c.id !== 'overview').map((cap) => (
          <article
            key={cap.id}
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
