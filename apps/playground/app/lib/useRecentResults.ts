/**
 * useRecentResults — the recent workout results shown in the journal nav.
 *
 * Refreshed on every route change. Extracted from `AppContent` so it can be
 * injected as a dependency into the route-view derivation, keeping
 * `resolveRouteView` free of I/O.
 */
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { WorkoutResult } from '@/types/storage'
import { indexedDBService } from '@/services/db/IndexedDBService'

export function useRecentResults(limit = 20): WorkoutResult[] {
  const [results, setResults] = useState<WorkoutResult[]>([])
  const { pathname } = useLocation()

  const refresh = useCallback(() => {
    indexedDBService
      .getRecentResults(limit)
      .then(setResults)
      .catch(() => {})
  }, [limit])

  useEffect(() => {
    refresh()
  }, [pathname, refresh])

  return results
}
