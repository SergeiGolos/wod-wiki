/**
 * SecondaryNav — shell zone 4: the right-hand "On this page" rail.
 *
 * Content = route-declared spec (shell.secondary) + the page's own index
 * (NavContext l3Items — published by useNotePageNav / CanvasPage). Desktop
 * (2xl+) renders this rail; below 2xl the same entries collapse into the ⋯
 * header menu (ActionsMenu), per the responsive shell contract.
 * On the home page (/), this rail renders the HomeChallengesNav view.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { MenuList, useActiveSectionId, useResolvedMenu } from './MenuList'
import { useNav } from './NavContext'
import { l3ToMenuEntries } from './menuModel'
import type { MenuSpec } from './menuModel'
import { HomeChallengesNav } from './HomeChallengesNav'


export function SecondaryNav({ spec }: { spec?: MenuSpec }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  const { l3Items } = useNav()
  const resolved = useResolvedMenu(spec)
  const toc = useMemo(() => l3ToMenuEntries(l3Items), [l3Items])
  const activeId = useActiveSectionId()

  if (isHome) {
    return <HomeChallengesNav />
  }

  if (resolved.length === 0 && toc.length === 0) return null

  return (
    <div className="flex flex-col px-3 py-4">
      <MenuList entries={resolved} activeId={activeId} />
      {toc.length > 0 && (
        <>
          <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            On this page
          </div>
          <MenuList entries={toc} activeId={activeId} />
        </>
      )}
    </div>
  )
}
