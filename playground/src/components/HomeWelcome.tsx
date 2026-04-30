/**
 * HomeWelcome — Playground-first welcome section.
 *
 * Renders the left-column hero copy injected into MarkdownCanvasPage's heroSlot.
 * Content floats to the top — no vertical centering.
 *
 * Step 01 — Write: "Find Content" button opens command palette
 * Step 02 — Run:   real Run button starts the workout in the editor
 * Step 03 — Analyze: describes results
 */

import { Search, Play } from 'lucide-react'

export interface HomeWelcomeProps {
  /** Opens the command palette with the workout search strategy. */
  onOpenSearch: () => void
  /** Starts the first workout block in the editor. */
  onRun: () => void
}

export function HomeWelcome({ onOpenSearch, onRun }: HomeWelcomeProps) {
  return (
    <div className="relative py-8 pb-6 px-6 lg:px-10 overflow-hidden">
      {/* Atmospheric green glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(24,226,153,0.10) 0%, rgba(24,226,153,0.04) 40%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Headline */}
        <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase leading-tight mb-6">
          Welcome to<br />WOD Wiki
        </h1>

        {/* 3-step flow */}
        <div className="flex flex-col gap-4">

          {/* Step 01 — Write */}
          <div className="flex items-start gap-3">
            <div className="flex-none mt-0.5 w-6 text-center font-mono text-[9px] font-black uppercase tracking-widest text-primary">
              01
            </div>
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                ✍️ Write
              </span>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-0.5 mb-2">
                Plain text, coach-whiteboard style — reps, rounds, load, time.
              </p>
              {/* Find Content button — opens workout search palette */}
              <button
                onClick={onOpenSearch}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground transition-all group"
                aria-label="Find workout content"
              >
                <Search className="size-3 group-hover:text-primary transition-colors" />
                Find Content
              </button>
            </div>
          </div>

          {/* Step 02 — Run */}
          <div className="flex items-start gap-3">
            <div className="flex-none mt-0.5 w-6 text-center font-mono text-[9px] font-black uppercase tracking-widest text-primary">
              02
            </div>
            <div className="flex-1">
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                ▶ Run
              </span>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-0.5 mb-2">
                Smart timer counts every block and advances automatically.
              </p>
              {/* Real Run button — starts the workout */}
              <button
                onClick={onRun}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                aria-label="Run workout"
              >
                <Play className="size-3 fill-current" />
                Run →
              </button>
            </div>
          </div>

          {/* Step 03 — Analyze */}
          <div className="flex items-start gap-3">
            <div className="flex-none mt-0.5 w-6 text-center font-mono text-[9px] font-black uppercase tracking-widest text-primary">
              03
            </div>
            <div>
              <span className="text-sm font-black text-foreground uppercase tracking-wide">
                📊 Analyze
              </span>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-0.5">
                Results appear the moment you finish — volume, intensity, splits.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
