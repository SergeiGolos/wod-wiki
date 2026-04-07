/**
 * useSetNavL3 — hook for route/page components to register their page-index items.
 *
 * Usage (inside any page component rendered inside NavProvider):
 *
 *   const l3Items = useMemo<NavItemL3[]>(() =>
 *     sections.map(s => ({
 *       id: s.id, label: s.label, level: 3,
 *       action: { type: 'scroll', sectionId: s.id },
 *     })), [sections])
 *
 *   useSetNavL3(l3Items)
 *
 * The items are automatically cleared when the component unmounts.
 * Pass a stable (memoized) array to avoid unnecessary re-registrations.
 */

import { useContext, useEffect } from 'react'
import { NavContext } from './NavContext'
import type { NavItemL3 } from './navTypes'

export function useSetNavL3(items: NavItemL3[]) {
  const { setL3Items } = useContext(NavContext)

  useEffect(() => {
    setL3Items(items)
    return () => setL3Items([])
  // items is compared by reference; callers should useMemo to keep it stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])
}
