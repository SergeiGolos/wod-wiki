/**
 * TourHero — the interactive home page hero.
 *
 * Headline + live welcome-1.md demo in one viewport. The editor is a real
 * NoteEditor so a visitor can edit, run, share, or open the demo in the
 * journal without scrolling.
 */

import { TourEditorScreen } from './screens/TourEditorScreen'
import { TOUR_ACCENTS } from './tourStages'
import type { ScriptBlock } from '@/components/Editor/types'

const ROWS: Array<{ before?: string; accentText: string; after?: string; accent: string }> = [
  { before: 'Write it in ', accentText: 'Markdown', accent: TOUR_ACCENTS.editor },
  { before: 'Run it as a ', accentText: 'Timer', accent: TOUR_ACCENTS.timer },
  { before: 'Own the ', accentText: 'Metrics', accent: TOUR_ACCENTS.library },
  { accentText: 'Explore', after: ' your analytics', accent: TOUR_ACCENTS.analytics },
]

export interface TourHeroProps {
  theme: string
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  onOpenInEditor: () => void
  /** Shared-script attribution + reset, forwarded to the editor screen (#882). */
  sharedBy?: string
  onResetShared?: () => void
}

export function TourHero({
  theme,
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onOpenInEditor,
  sharedBy,
  onResetShared,
}: TourHeroProps) {
  return (
    <section
      data-testid="tour-hero"
      className="relative flex min-h-[calc(100vh-104px)] flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60">
        A plain-text fitness scripting language
      </div>
      <h1 className="text-[clamp(34px,7vw,88px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
        {ROWS.map((row) => (
          <span key={row.accentText} className="block">
            {row.before}
            <span
              className="underline decoration-[0.06em] underline-offset-[0.14em]"
              style={{ color: row.accent, textDecorationColor: row.accent }}
            >
              {row.accentText}
            </span>
            {row.after}
            .
          </span>
        ))}
      </h1>
      <p className="mt-6 max-w-xl text-[clamp(15px,1.4vw,18px)] leading-[1.65] text-muted-foreground">
        WOD Wiki compiles a <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.86em]">```wod</code> block
        into a live WallClock timer, then logs every round straight back to your training
        journal — one file, one loop, no app-switching.
      </p>

      <div className="mt-8 w-full max-w-2xl text-left">
        <div className="h-[min(420px,50vh)] overflow-hidden rounded-xl border border-border shadow-lg">
          <TourEditorScreen
            doc={doc}
            onDocChange={onDocChange}
            onBlocksChange={onBlocksChange}
            onRun={onRun}
            onShare={onShare}
            onOpenInEditor={onOpenInEditor}
            theme={theme}
            sharedBy={sharedBy}
            onResetShared={onResetShared}
          />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        ↓ Scroll — the app, part by part
      </div>
    </section>
  )
}
