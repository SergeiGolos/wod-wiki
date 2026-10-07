/**
 * TourHero — the home page hero.
 *
 * Headline + a compact preview of the welcome script. The hero hosts NO
 * editor: the single NoteEditor for the page lives in the write section's
 * sticky stage (one mounted editor through hero → write). The preview keeps
 * the arrival contract visible (#882: /load?z= shared script + attribution).
 */
import { Pencil } from 'lucide-react'
import { TOUR_ACCENTS } from './tourConstants'

const ROWS: Array<{
  sectionId: 'write' | 'run' | 'own' | 'explore'
  before?: string
  accentText: string
  after?: string
  accent: string
}> = [
  { sectionId: 'write', before: 'Write it in ', accentText: 'Markdown', accent: TOUR_ACCENTS.editor },
  { sectionId: 'run', before: 'Run it as a ', accentText: 'Timer', accent: TOUR_ACCENTS.timer },
  { sectionId: 'own', before: 'Own the ', accentText: 'Metrics', accent: TOUR_ACCENTS.library },
  { sectionId: 'explore', accentText: 'Explore', after: ' your analytics', accent: TOUR_ACCENTS.analytics },
]

export interface TourHeroProps {
  /** The shared run document — previewed read-only; edits happen in the write stage. */
  doc: string
  /** Shared-script attribution + reset, shown when a /load?z= script is loaded. */
  sharedBy?: string
  onResetShared?: () => void
  onNavigateSection?: (sectionId: 'write' | 'run' | 'own' | 'explore') => void
}

/**
 * Headline, copy, and scroll cue — shared by the desktop hero and the mobile
 * runway (where the editor lives in the pinned window).
 */
export function TourHeroHeading({ onNavigateSection }: { onNavigateSection?: TourHeroProps['onNavigateSection'] } = {}) {
  const handleJump = (sectionId: 'write' | 'run' | 'own' | 'explore') => {
    if (onNavigateSection) {
      onNavigateSection(sectionId)
      return
    }
    const el = document.getElementById(`tour-section-${sectionId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60">
        A plain-text fitness scripting language
      </div>
      <h1 className="text-[clamp(30px,5vw,64px)] font-extrabold leading-[0.98] tracking-[-0.045em] pb-3 sm:pb-4">
        {ROWS.map((row) => (
          <span key={row.accentText} className="block">
            {row.before}
            <button
              type="button"
              data-testid={`hero-tagline-${row.sectionId}`}
              onClick={() => handleJump(row.sectionId)}
              className="group inline cursor-pointer text-left font-inherit underline decoration-[0.06em] underline-offset-[0.14em] transition-all hover:opacity-80 active:translate-y-0.5"
              style={{ color: row.accent, textDecorationColor: row.accent }}
              title={`Jump to ${row.accentText} section`}
              aria-label={`Jump to ${row.accentText} section`}
            >
              {row.accentText}
            </button>
            {row.after}.
          </span>
        ))}
      </h1>
      {/* Desktop-only: absolutely positioned against the full-height hero. */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 sm:block">
        ↓ Scroll — the app, part by part
      </div>
    </>
  )
}

export function TourHero({
  doc,
  sharedBy,
  onResetShared,
  onNavigateSection,
}: TourHeroProps) {
  return (
    <section
      id="tour-hero"
      data-testid="tour-hero"
      className="relative flex min-h-0 flex-col items-center justify-center px-6 pt-10 pb-8 text-center"
    >
      <TourHeroHeading onNavigateSection={onNavigateSection} />
      {/* Compact script preview — read-only; the editable NoteEditor is the
          write section's sticky stage (one editor, no duplicate). */}
      <div className="mt-6 w-full max-w-2xl text-left">
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <Pencil className="size-3" />
            Editable playground — below
          </span>
          <span>{sharedBy ? (sharedBy.toLowerCase().startsWith('shared by') ? sharedBy : `shared by: ${sharedBy}`) : 'welcome-1.md'}</span>
        </div>
        <div className="relative rounded-xl border border-border bg-card shadow-2xl">
          {sharedBy && onResetShared && (
            <button
              type="button"
              onClick={onResetShared}
              title="Reset"
              className="absolute right-3 top-3 z-10 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent"
              data-testid="tour-hero-reset-shared"
            >
              Reset
            </button>
          )}
          <pre
            data-testid="tour-hero-preview"
            className="max-h-[min(300px,34vh)] overflow-auto p-4 font-mono text-[12px] leading-[1.6] text-foreground/90"
          >
            {doc}
          </pre>
        </div>
      </div>
    </section>
  )
}

export default TourHero
