/**
 * TourJumpSection.tsx — the "Know where you're going?" direct-exit section.
 *
 * A ~half-viewport sliding section right under the hero: three eye-catching
 * cards that jump straight into the app's sub views (Feeds, the Collections
 * library, and creating a new journal note) for visitors who don't want the
 * full walkthrough. Feeds carries a small work-in-progress note.
 */
import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Library, Newspaper, NotebookPen } from 'lucide-react'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { journalNotes } from '../services/journalNotes'
import { noteByIdPath } from '../lib/routes'
import { getTodayDateKey } from '../services/dateUtils'

const ITEM_BASE =
  'group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function TourJumpSection() {
  const navigate = useNavigate()

  const handleLibrary = useCallback(() => {
    telemetry.record(HOME_EVENTS.libraryOpened)
  }, [])

  const handleFeeds = useCallback(() => {
    telemetry.record(HOME_EVENTS.feedsOpened)
  }, [])

  const handleNewNote = useCallback(async () => {
    const today = getTodayDateKey()
    const note = await journalNotes.create({
      journalDate: today,
      title: today,
      rawContent: '',
    })
    telemetry.record(HOME_EVENTS.noteCreated)
    navigate(noteByIdPath(note.id))
  }, [navigate])

  return (
    <section
      data-testid="tour-jump-section"
      className="flex flex-col items-center border-b border-border bg-muted/30 px-6 py-8"
    >
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Know where you&apos;re going?
      </h2>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          to="/feeds"
          onClick={handleFeeds}
          data-testid="jump-feeds"
          className={ITEM_BASE}
          title="Programming feeds you follow, newest first."
        >
          <Newspaper className="size-4 text-muted-foreground" />
          Feeds
          <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <Link
          to="/collections"
          onClick={handleLibrary}
          data-testid="jump-library"
          className={ITEM_BASE}
          title="Curated workouts and sessions, ready to run."
        >
          <Library className="size-4 text-muted-foreground" />
          Collections library
          <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <button
          type="button"
          onClick={handleNewNote}
          data-testid="jump-new-note"
          className={ITEM_BASE}
          title="Create today's note and log your first workout."
        >
          <NotebookPen className="size-4 text-muted-foreground" />
          Start your own journal
          <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        — or keep scrolling ↓
      </p>
    </section>
  )
}
