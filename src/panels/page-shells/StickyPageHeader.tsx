/**
 * StickyPageHeader — the standard playground page header.
 *
 * ONE sticky zone containing the title row and the optional subheader, so a
 * stateful subheader (e.g. the library's WqlComposer) mounts exactly once:
 *   - Desktop (lg+): the zone sticks to the viewport top (the app has no
 *     desktop navbar) — accent + title + optional subtitle + accessory,
 *     right-aligned actions, subheader below, then a rule.
 *   - Mobile: the title row is hidden (the SidebarLayout navbar covers page
 *     identity) and the zone sticks just below that navbar, leaving the
 *     subheader as the visible sticky bar.
 *
 * The zone carries `data-page-sticky-boundary="true"` so stacked sticky
 * elements (date-group headers, scroll targets) can measure the real
 * occupied height via `measureStickyBoundary` / `useStickyBoundaryOffset`
 * instead of hardcoding `top` values.
 *
 * Extracted from CanvasPage's title-bar mode so any page can adopt the
 * standard header directly, without routing through App's shell config.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StickyPageHeaderProps {
  /** Page title shown in the sticky bar (desktop only). */
  title: string;
  /** Secondary line under the title (e.g. a dynamic page description). */
  subtitle?: ReactNode;
  /** Content rendered next to the title (e.g. a challenge badge). */
  titleAccessory?: ReactNode;
  /** Right-side actions (e.g. search, cast, actions menu). */
  actions?: ReactNode;
  /**
   * Content rendered below the title row inside the sticky zone. Rendered
   * once for both viewports — on mobile it IS the visible sticky bar.
   */
  subheader?: ReactNode;
}

export function StickyPageHeader({
  title,
  subtitle,
  titleAccessory,
  actions,
  subheader,
}: StickyPageHeaderProps) {
  return (
    <div
      data-page-sticky-boundary="true"
      className={cn(
        subheader
          // Zone doubles as the mobile sticky bar below the SidebarLayout navbar.
          ? 'sticky top-[60px] sm:top-14 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 py-2 lg:top-0 lg:z-30 lg:bg-background/80 lg:border-b-0 lg:py-0 lg:pt-8'
          // Title-only: no mobile presence at all (navbar covers identity).
          : 'hidden lg:block lg:sticky lg:top-0 lg:z-30 lg:bg-background/80 lg:backdrop-blur-md lg:pt-8',
      )}
    >
      {/* Title row — desktop only */}
      <div className="hidden lg:flex items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-2 shrink-0 rounded-full bg-primary" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground leading-none truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            {titleAccessory}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {actions}
        </div>
      </div>

      {subheader && <div className="lg:mt-4">{subheader}</div>}

      <hr
        role="presentation"
        className="hidden lg:block mt-4 md:mt-6 w-full border-t border-border opacity-50"
      />
    </div>
  );
}
