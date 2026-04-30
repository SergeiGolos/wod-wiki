// playground/src/views/FeedsListPage.tsx
// Renders the /feeds list — date-grouped scrolling list of feed entries.
// Composed inside AppContent's CanvasPage shell (same as Journal list).
// Filtered by selected feed names from the URL via useFeedsQueryState.

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseFeedFiles } from '../services/parseFeedFiles'
import { useFeedsQueryState } from '../hooks/useFeedsQueryState'
import { JournalDateScroll } from './queriable-list/JournalDateScroll'
import type { FilteredListItem } from './queriable-list/types'

export function FeedsListPage() {
  const { selectedFeeds } = useFeedsQueryState()
  const navigate = useNavigate()
  const allFeeds = useMemo(() => parseFeedFiles(), [])

  const filtered = useMemo(() => {
    if (selectedFeeds.length === 0) return allFeeds
    return allFeeds.filter(item => selectedFeeds.includes(item.feedName))
  }, [allFeeds, selectedFeeds])

  const items: FilteredListItem[] = useMemo(() => filtered.map(item => ({
    id: item.stem,
    type: 'result' as const,
    title: item.title,
    subtitle: item.feedName,
    date: item.date.getTime(),
    group: 'feeds',
    payload: item,
  })), [filtered])

  const handleSelect = (item: FilteredListItem) => {
    navigate(`/feeds/${encodeURIComponent(item.id)}`)
  }

  return (
    <JournalDateScroll
      items={items}
      onSelect={handleSelect}
    />
  )
}
