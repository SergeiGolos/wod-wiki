/**
 * JournalNavPanel — L2 context panel shown when Journal is the active L1 item.
 *
 * Features:
 *   - Mini month-view calendar (CalendarDatePicker)
 *   - Tag chip filter
 *
 * All state is backed by nuqs URL parameters (`d`, `month`, `tags`)
 * so the URL is the single source of truth across every journal control.
 */

import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker'
import { cn } from '@/lib/utils'
import { useJournalQueryState } from '../../hooks/useJournalQueryState'
import type { NavPanelProps } from '../navTypes'

const PLACEHOLDER_TAGS = ['strength', 'cardio', 'mobility', 'kettlebell', 'swim']

export function JournalNavPanel(_props: NavPanelProps) {
  const { selectedDate, setSelectedDate, dateParam, selectedTags, toggleTag } =
    useJournalQueryState()

  const selectedDateObj = dateParam ? selectedDate : null

  const handleDateSelect = (date: Date) => {
    const iso = date.toISOString().slice(0, 10)
    // Toggle off if same date is already selected
    if (iso === dateParam) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
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

      {/* Active date badge */}
      {dateParam && (
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
