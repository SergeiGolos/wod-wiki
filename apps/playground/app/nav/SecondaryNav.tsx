/**
 * SecondaryNav — shell zone 4: the right-hand "On this page" rail.
 *
 * Content = the stream surface's Properties (the shared facet accordion
 * over the CURRENT query — the same model the L2 context panel renders) +
 * stream controls + route-declared spec (shell.secondary) + the page's own
 * index (NavContext l3Items — published by useNotePageNav / CanvasPage /
 * HomeTour). Desktop (2xl+) renders this rail; below 2xl the same entries
 * collapse into the ⋯ header menu (ActionsMenu) and the mobile right
 * drawer, per the responsive shell contract.
 */

import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { MenuList, useActiveSectionId, useResolvedMenu } from './MenuList'
import { useNav, type StreamNavControls } from './NavContext'
import { l3ToMenuEntries } from './menuModel'
import type { MenuSpec } from './menuModel'
import { FacetProperties } from './panels/FacetProperties'
import { WqlWindowPicker } from '../views/stream/WqlWindowPicker'
import { isStreamRoute, resolveStreamProfile } from '../views/stream/streamProfile'

/**
 * StreamControlsNav — the L3 stream-controls block (date window picker +
 * group-by toggles). Rendered by the 2xl+ rail AND by the ⋯ fallback
 * (dropdown + dock sheet) below 2xl, so every surface carries the same
 * components bound to the same NavContext streamControls.
 */
export function StreamControlsNav({ streamControls }: { streamControls: StreamNavControls }) {
  return (
    <div className="flex flex-col gap-3" data-testid="l3-stream-controls">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Date window
        </span>
        <WqlWindowPicker
          query={streamControls.query}
          onQueryChange={streamControls.onQueryChange}
          className="w-full justify-between"
        />
      </div>

      {/* Group by properties as items to check under it */}
      {streamControls.availableGroupDims.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Group by
          </span>
          <div className="flex flex-col gap-0.5" data-testid="l3-groupby-options">
            {streamControls.availableGroupDims.map(opt => {
              const checked = streamControls.groupDims.some(
                d => d.toLowerCase() === opt.id.toLowerCase()
              )
              return (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-foreground/80 hover:bg-muted/60 transition-colors"
                  data-testid={`l3-groupby-${opt.id}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => streamControls.onToggleGroupDim(opt.id)}
                    className="size-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function SecondaryNav({ spec, pageAction }: { spec?: MenuSpec; pageAction?: ReactNode }) {
  const { l3Items, streamControls } = useNav()
  const location = useLocation()
  const resolved = useResolvedMenu(spec)
  const toc = useMemo(() => l3ToMenuEntries(l3Items), [l3Items])
  const activeId = useActiveSectionId()
  // Stream routes carry the shared facet model in L3 — the properties the
  // current query's target supports, over the committed results. Detail/date
  // routes resolve their own profile from the pathname; legacy /results*
  // land on the library fallback (isStreamRoute classifies them, the
  // profile registry does not).
  const streamRouteProfile = isStreamRoute(location.pathname) ? resolveStreamProfile(location.pathname) : undefined

  if (resolved.length === 0 && toc.length === 0 && !streamControls && !pageAction && !streamRouteProfile) return null

  return (
    <div className="flex flex-col px-3 py-4 gap-4">
      {streamRouteProfile && (
        <div className="pb-3 border-b border-border/50" data-testid="l3-properties">
          <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Properties
          </div>
          <FacetProperties profile={streamRouteProfile} />
        </div>
      )}

      {streamControls && (
        <div className="pb-3 border-b border-border/50">
          <StreamControlsNav streamControls={streamControls} />
        </div>
      )}

      {resolved.length > 0 && <MenuList entries={resolved} activeId={activeId} />}
      {toc.length > 0 && (
        <div className="flex flex-col">
          <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            On this page
          </div>
          <MenuList entries={toc} activeId={activeId} />
        </div>
      )}
      {pageAction && <div className="pt-2 border-t border-border/50">{pageAction}</div>}
    </div>
  )
}
