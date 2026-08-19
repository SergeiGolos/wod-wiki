/**
 * TourHero — the interactive home page hero.
 *
 * Headline + live welcome-1.md demo in one viewport. The editor is a real
 * NoteEditor so a visitor can edit, run, share, or open the demo in the
 * journal without scrolling.
 */
import { TourEditorScreen } from './screens/TourEditorScreen'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { TOUR_ACCENTS } from './tourConstants'
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

/**
 * Headline, copy, and scroll cue — shared by the desktop hero (which adds
 * the live editor below) and the mobile runway (where the editor lives in
 * the pinned window instead).
 */
export function TourHeroHeading() {
  return (
    <>
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60">
        A plain-text fitness scripting language
      </div>
      <h1 className="text-[clamp(30px,5vw,64px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
        {ROWS.map((row) => (
          <span key={row.accentText} className="block">
            {row.before}
            <span
              className="underline decoration-[0.06em] underline-offset-[0.14em]"
              style={{ color: row.accent, textDecorationColor: row.accent }}
            >
              {row.accentText}
            </span>
            {row.after}.
          </span>
        ))}
      </h1>
      <p className="mt-4 max-w-xl text-[clamp(14px,1.2vw,16px)] leading-[1.6] text-muted-foreground">
        WOD Wiki compiles a <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.86em]">```time</code> block
        into a live WallClock timer, then logs every round straight back to your training
        journal — one file, one loop, no app-switching.
      </p>

      {/* Desktop-only: absolutely positioned against the full-height hero.
          On mobile the heading block is short, so the cue overlapped the intro
          paragraph — the short-circuit strip below already carries the
          "keep scrolling" hint there. */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 sm:block">
        ↓ Scroll — the app, part by part
      </div>
    </>
  )
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
      className="relative flex min-h-0 flex-col items-center justify-center px-6 pt-10 pb-8 text-center"
    >
      <TourHeroHeading />
      <div className="mt-6 w-full max-w-2xl text-left">
        <MacOSChrome title="welcome-1.md" className="h-[min(460px,52vh)] shadow-2xl">
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
        </MacOSChrome>
      </div>
    </section>
  )
}
