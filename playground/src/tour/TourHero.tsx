/**
 * TourHero.tsx — 100vh hero above the walkthrough runway.
 *
 * Headline rows underline each surface in its stage accent (metric tokens).
 * Keeps the home page's real "Find Content" search-palette action.
 */

import { TOUR_ACCENTS } from './tourStages'

const ROWS: Array<{ text: string; underline: string; accent: string }> = [
  { text: 'Write it in ', underline: 'Markdown', accent: TOUR_ACCENTS.editor },
  { text: 'Run it as a ', underline: 'Timer', accent: TOUR_ACCENTS.timer },
  { text: 'Own the ', underline: 'Analytics', accent: TOUR_ACCENTS.analytics },
]

export function TourHero() {
  return (
    <section className="relative flex min-h-[calc(100vh-104px)] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60">
        A plain-text fitness scripting language
      </div>
      <h1 className="text-[clamp(34px,7vw,88px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
        {ROWS.map((row) => (
          <span key={row.underline} className="block">
            {row.text}
            <span
              className="underline decoration-[0.06em] underline-offset-[0.14em]"
              style={{ color: row.accent, textDecorationColor: row.accent }}
            >
              {row.underline}
            </span>
            .
          </span>
        ))}
      </h1>
      <p className="mt-9 max-w-xl text-[clamp(15px,1.4vw,18px)] leading-[1.65] text-muted-foreground">
        WOD Wiki compiles a <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.86em]">```wod</code> block
        into a live WallClock timer, then logs every round straight back to your training
        journal — one file, one loop, no app-switching.
      </p>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        ↓ Scroll — the app, part by part
      </div>
    </section>
  )
}
