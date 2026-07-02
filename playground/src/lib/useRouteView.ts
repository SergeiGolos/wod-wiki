/**
 * useRouteView — the React adapter over the pure {@link resolveRouteView}.
 *
 * Injects the URL params + data deps (workoutItems, canvasPage,
 * recentResults, selectWorkout) and memoises the result. `AppContent`
 * consumes the flags + workout + nav; the render ternary is unchanged
 * in Phase 1.
 */
import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useWorkoutItems } from './workoutIndex'
import { findCanvasPage } from '../canvas/canvasRoutes'
import { resolveRouteView, type RouteView } from './routeView'
import { useRecentResults } from './useRecentResults'
import { useSelectWorkout } from './useSelectWorkout'

export function useRouteView(): RouteView {
  const params = useParams()
  const { pathname } = useLocation()
  const workoutItems = useWorkoutItems()
  const recentResults = useRecentResults()
  const selectWorkout = useSelectWorkout()

  return useMemo(
    () => {
      const canvasPage = findCanvasPage(pathname)
      return resolveRouteView(pathname, params, {
        workoutItems,
        canvasPage,
        recentResults,
        selectWorkout,
      })
    },
    // `params` is referentially stable across renders for a given route match.
    [pathname, params, workoutItems, recentResults, selectWorkout],
  )
}
