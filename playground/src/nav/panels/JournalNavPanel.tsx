/**
 * JournalNavPanel — L2 context panel shown when Journal is the active L1 item.
 *
 * Features:
 *   - Mini month-view calendar (CalendarDatePicker)
 *   - Tag chip filter (ready for future tag data)
 *
 * Dispatches:
 *   SET_JOURNAL_DATE  — updates navState.journalFilter.selectedDate
 *   SET_JOURNAL_TAGS  — updates navState.journalFilter.selectedTags
 */

import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker'
import { cn } from '@/lib/utils'
import type { NavPanelProps } from '../navTypes'

const PLACEHOLDER_TAGS = ['strength', 'cardio', 'mobility', 'kettlebell', 'swim']

export function JournalNavPanel({ navState, dispatch }: NavPanelProps) {
  const { selectedDate, selectedTags } = navState.journalFilter

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null

  const handleDateSelect = (date: Date) => {
    const iso = date.toISOString().slice(0, 10)
    // Toggle off if same date is already selected
    if (iso === selectedDate) {
      dispatch({ type: 'SET_JOURNAL_DATE', date: null })
    } else {
      dispatch({ type: 'SET_JOURNAL_DATE', date: iso })
    }
  }

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    dispatch({ type: 'SET_JOURNAL_TAGS', tags: next })
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {/* Mini calendar */}
      <CalendarDatePicker
        selectedDate={selectedDateObj}
        onDateSelect={handleDateSelect}
        className="scale-95 origin-top-left"
      />

      {/* Active date badge */}
      {selectedDate && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Filtered to</span>
          <button
            onClick={() => dispatch({ type: 'SET_JOURNAL_DATE', date: null })}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {selectedDate} ×
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
