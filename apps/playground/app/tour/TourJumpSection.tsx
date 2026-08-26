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
import { journalNotePath } from '../lib/routes'
import { getTodayDateKey } from '../services/dateUtils'

const CARD_BASE =
  'group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'

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
    navigate(journalNotePath(today, note.id))
  }, [navigate])

  return (
    <section
      data-testid="tour-jump-section"
      className="flex min-h-[55vh] flex-col items-center justify-center border-b border-border bg-muted/30 px-6 py-10"
    >
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        Know where you&apos;re going?
      </h2>

      <div className="mt-6 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        <Link
          to="/feeds"
          onClick={handleFeeds}
          data-testid="jump-feeds"
          className={CARD_BASE}
        >
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="size-4 text-muted-foreground" />
              <span className="text-base font-semibold">Feeds</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Programming feeds you follow, newest first.
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Work in progress
            </p>
          </div>
          <ArrowRight className="absolute right-4 top-4 size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <Link
          to="/collections"
          onClick={handleLibrary}
          data-testid="jump-library"
          className={CARD_BASE}
        >
          <div>
            <div className="flex items-center gap-2">
              <Library className="size-4 text-muted-foreground" />
              <span className="text-base font-semibold">Collections library</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Curated workouts and sessions, ready to run.
            </p>
          </div>
          <ArrowRight className="absolute right-4 top-4 size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>

        <button
          type="button"
          onClick={handleNewNote}
          data-testid="jump-new-note"
          className={CARD_BASE}
        >
          <div>
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-muted-foreground" />
              <span className="text-base font-semibold">Start your own journal</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Create today&apos;s note and log your first workout.
            </p>
          </div>
          <ArrowRight className="absolute right-4 top-4 size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        — or keep scrolling ↓
      </p>
    </section>
  )
}
