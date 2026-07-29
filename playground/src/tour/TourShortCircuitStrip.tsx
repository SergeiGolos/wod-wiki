import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { journalNotes } from '../services/journalNotes'
import { journalNotePath } from '../lib/routes'
import { getTodayDateKey } from '../services/dateUtils'

export function TourShortCircuitStrip() {
  const navigate = useNavigate()

  const handleLibrary = useCallback(() => {
    telemetry.record(HOME_EVENTS.libraryOpened)
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
    <div
      data-testid="tour-short-circuit-strip"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-y border-border bg-muted/30 px-4 py-3 text-sm"
    >
      <span className="text-muted-foreground">Know where you&apos;re going?</span>
      <Link
        to="/collections"
        onClick={handleLibrary}
        className="font-medium text-primary hover:underline"
      >
        Jump to the Library
      </Link>
      <span className="text-border">·</span>
      <button
        type="button"
        onClick={handleNewNote}
        className="font-medium text-primary hover:underline"
      >
        New note
      </button>
      <span className="text-muted-foreground">— or keep scrolling ↓</span>
    </div>
  )
}
