/**
 * TourTvCard.tsx — the dark mini-TV card that parallaxes up during the
 * timer stage's cast beat. The receiver UI is a real TV surface, so this
 * card stays dark in both themes (see Chromecast receiver panels).
 *
 * Visibility/parallax are driven imperatively by the parent via `innerRef`
 * (transform/opacity only).
 */

import { forwardRef } from 'react'

export interface TourTvCardProps {
  /** Live elapsed clock text (mm:ss) mirrored from the tour timer. */
  elapsed: string
  /** Round label, e.g. "Round 2/3". */
  roundLabel: string
  /** Workout / movement label. */
  subtitle: string
}

export const TourTvCard = forwardRef<HTMLDivElement, TourTvCardProps>(
  function TourTvCard({ elapsed, roundLabel, subtitle }, innerRef) {
    return (
      <div
        ref={innerRef}
        data-testid="tour-tv-card"
        className="pointer-events-none absolute -right-6 -bottom-10 z-20 w-[300px] font-mono opacity-0"
      >
        <div className="rounded-xl border border-black/80 bg-[#0D0C0A] px-5 pt-4 pb-3 text-[#EDE9E2] shadow-[0_30px_60px_-18px_rgba(18,17,14,0.5)]">
          <div className="flex justify-between text-[8px] uppercase tracking-[0.18em] text-[hsl(var(--metric-effort))]">
            <span>● Live</span>
            <span>{roundLabel}</span>
          </div>
          <div className="mt-1.5 text-[52px] font-bold leading-none tracking-[-0.04em] tabular-nums">
            {elapsed}
          </div>
          <div className="mt-1 text-[9.5px] text-[#8B877B]">{subtitle}</div>
        </div>
        <div className="mx-auto h-2 w-[70px] rounded-b-md bg-[#2A2822]" />
        <div className="mt-2.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="size-[7px] animate-pulse rounded-full bg-[hsl(var(--metric-effort))]" />
          Living Room TV · Chromecast
        </div>
      </div>
    )
  },
)
