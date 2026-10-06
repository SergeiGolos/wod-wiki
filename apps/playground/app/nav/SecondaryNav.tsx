/**
 * SecondaryNav — shell zone 4: the right-hand "On this page" rail.
 *
 * Content = route-declared spec (shell.secondary) + the page's own index
 * (NavContext l3Items — published by useNotePageNav / CanvasPage / HomeTour).
 * Desktop (2xl+) renders this rail; below 2xl the same entries collapse into
 * the ⋯ header menu (ActionsMenu), per the responsive shell contract.
 */

import { useMemo } from 'react'

import { MenuList, useActiveSectionId, useResolvedMenu } from './MenuList'
import { useNav } from './NavContext'
import { l3ToMenuEntries } from './menuModel'
import type { MenuSpec } from './menuModel'
import { WqlWindowPicker } from '../views/stream/WqlWindowPicker'

export function SecondaryNav({ spec }: { spec?: MenuSpec }) {
  const { l3Items, streamControls } = useNav()
  const resolved = useResolvedMenu(spec)
  const toc = useMemo(() => l3ToMenuEntries(l3Items), [l3Items])
  const activeId = useActiveSectionId()

  if (resolved.length === 0 && toc.length === 0 && !streamControls) return null

  return (
    <div className="flex flex-col px-3 py-4 gap-4">
      {streamControls && (
        <div className="flex flex-col gap-3 pb-3 border-b border-border/50" data-testid="l3-stream-controls">
          {/* First level item: Date component */}
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
    </div>
  )
}
