/**
 * GuideIndexFooter — the end-of-page chapter list for the canvas home page
 * and the /guide/* chapters. On lg+ those pages drop the desktop L2 sidebar
 * (AppContent's hideDesktopSidebar) and this list carries the chapter links
 * instead; below lg the mobile drawer keeps the L2 as well.
 */

import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useCanvasRoutes } from './canvasRoutes'
import { guideChildrenFrom } from '../nav/appNavTree'
import { cn } from '@/lib/utils'

const CHAPTER_LINK =
  'inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function GuideIndexFooter() {
  const routes = useCanvasRoutes()
  const { pathname } = useLocation()
  const chapters = useMemo(
    () =>
      guideChildrenFrom(routes).flatMap((c) =>
        c.action?.type === 'route' ? [{ id: c.id, label: c.label, to: c.action.to }] : [],
      ),
    [routes],
  )
  if (chapters.length === 0) return null

  return (
    <nav
      aria-label="Guides"
      data-testid="guide-index-footer"
      className="border-t border-border px-6 py-10 xl:py-14"
    >
      <div className="mx-auto flex max-w-3xl xl:max-w-4xl flex-col items-center gap-5 text-center">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Syntax &amp; Guides
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {chapters.map((c) => (
            <li key={c.id}>
              <Link
                to={c.to}
                aria-current={pathname === c.to ? 'page' : undefined}
                className={cn(
                  CHAPTER_LINK,
                  pathname === c.to
                    ? 'border-primary/60 text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
