/**
 * JournalNavPanel — L2 context panel shown when Journal is the active L1 item.
 *
 * Features:
 *   - Mini month-view calendar (CalendarDatePicker)
 *   - Tag chip filter
 *
 * Context-aware date click behaviour:
 *   - On /journal        → updates the ?d= filter query param (scroll to date)
 *   - On /journal/:date  → navigates to the clicked date's entry page
 */

import { useMatch, useNavigate } from 'react-router-dom'
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker'
import { cn } from '@/lib/utils'
import { useJournalQueryState } from '../../hooks/useJournalQueryState'
import type { NavPanelProps } from '../navTypes'

const PLACEHOLDER_TAGS = ['strength', 'cardio', 'mobility', 'kettlebell', 'swim']

export function JournalNavPanel(_props: NavPanelProps) {
  const { selectedDate, setSelectedDate, dateParam, selectedTags, toggleTag } =
    useJournalQueryState()

  // Detect if we're viewing a specific journal entry (/journal/:date)
  const entryMatch = useMatch('/journal/:date')
  const navigate = useNavigate()

  const isEntryPage = Boolean(entryMatch)

  // On the entry page, highlight the date from the URL; otherwise use the filter param
  const selectedDateObj = isEntryPage
    ? (() => {
        const d = new Date((entryMatch!.params.date ?? '') + 'T00:00:00')
        return isNaN(d.getTime()) ? null : d
      })()
    : dateParam
      ? selectedDate
      : null

  const handleDateSelect = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    if (isEntryPage) {
      // On the note page: navigate to the selected date's entry
      navigate(`/journal/${iso}`)
    } else {
      // On the list page: toggle the ?d= filter
      if (iso === dateParam) {
        setSelectedDate(null)
      } else {
        setSelectedDate(date)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {/* Mini calendar */}
      <CalendarDatePicker
        selectedDate={selectedDateObj}
        onDateSelect={handleDateSelect}
        className="scale-95 origin-top-left"
      />

      {/* Active date badge — only meaningful on the list page */}
      {!isEntryPage && dateParam && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Filtered to</span>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {dateParam} ×
          </button>
        </div>
      )}

      {/* Tag chips */}
      {PLACEHOLDER_TAGS.length > 0 && (
        <div className="flex flex-col gap-1 px-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {PLACEHOLDER_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                  selectedTags.includes(tag)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
