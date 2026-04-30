/**
 * FeedsNavPanel — L2 context panel for the Feeds L1 item.
 *
 * Mirrors JournalNavPanel: mini calendar for date filtering + feed-name
 * chips for channel filtering. Hidden on /feeds/:stem (entry view).
 */

import { useMatch } from 'react-router-dom'
import { CalendarCard } from '@/components/ui/CalendarCard'
import { cn } from '@/lib/utils'
import { useFeedsQueryState } from '../../hooks/useFeedsQueryState'
import { getFeedNames } from '../../services/parseFeedFiles'
import type { NavPanelProps } from '../navTypes'

export function FeedsNavPanel(_props: NavPanelProps) {
  const { selectedDate, setSelectedDate, dateParam, selectedFeeds, toggleFeed } =
    useFeedsQueryState()

  const entryMatch = useMatch('/feeds/:stem')
  const isEntryPage = Boolean(entryMatch)

  // On the entry page: highlight the date from the stem; otherwise use filter param
  const selectedDateObj = isEntryPage
    ? (() => {
        const stem = entryMatch!.params.stem ?? ''
        const parts = stem.split('-')
        if (parts.length < 3) return null
        const d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`)
        return isNaN(d.getTime()) ? null : d
      })()
    : dateParam
      ? selectedDate
      : null

  const handleDateSelect = (date: Date) => {
    if (isEntryPage) return // no-op on entry page — nav is read-only indicator
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (iso === dateParam) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
    }
  }

  const feedNames = getFeedNames()

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {/* Mini calendar */}
      <CalendarCard
        selectedDate={selectedDateObj}
        onDateSelect={handleDateSelect}
        className="scale-95 origin-top-left"
      />

      {/* Active date badge — only on list page */}
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

      {/* Feed-name chips — only on list page */}
      {!isEntryPage && feedNames.length > 0 && (
        <div className="flex flex-col gap-1 px-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
            Feeds
          </div>
          <div className="flex flex-wrap gap-1">
            {feedNames.map(name => (
              <button
                key={name}
                onClick={() => toggleFeed(name)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors capitalize',
                  selectedFeeds.includes(name)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
                )}
              >
                {name.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
