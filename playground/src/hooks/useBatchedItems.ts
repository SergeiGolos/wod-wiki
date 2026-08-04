/**
 * useBatchedItems — progressive rendering for large result lists (#861).
 *
 * The Library renders the first `batchSize` items and grows by another
 * batch whenever the sentinel scrolls near the viewport (IntersectionObserver,
 * 400px root margin). Grouping/sticky headers operate on the visible subset;
 * group counts come from the full set, so "showing 40 of 21,329" stays
 * truthful. The batch resets when the result set identity changes (new query).
 */
import { useEffect, useRef, useState } from 'react'

export const LIBRARY_BATCH_SIZE = 200

export interface BatchedItems<T> {
  /** The first N items — render these. */
  visible: T[]
  /** True when items remain beyond the current batch. */
  hasMore: boolean
  /** Ref for the sentinel element rendered after the visible list. */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** Total items in the full set (for "N more" messaging). */
  total: number
}

export function useBatchedItems<T>(items: T[], batchSize = LIBRARY_BATCH_SIZE): BatchedItems<T> {
  const [count, setCount] = useState(batchSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // New result set → start from the first batch again.
  useEffect(() => {
    setCount(batchSize)
  }, [items, batchSize])

  const hasMore = count < items.length

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setCount(c => Math.min(c + batchSize, items.length))
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, items.length, batchSize])

  return { visible: items.slice(0, count), hasMore, sentinelRef, total: items.length }
}
