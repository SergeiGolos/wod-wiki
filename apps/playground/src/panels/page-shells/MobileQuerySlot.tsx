/**
 * MobileQuerySlot — the portal target where a page's query bar floats into
 * the app-level mobile thumb footer: a fixed bar at the bottom of the
 * screen (the thumb-control zone), mounted by SidebarLayout.
 *
 * Stream routes render no page-level header on mobile (the page header is
 * desktop-only). Instead the page portals its StreamQueryBar — the WQL
 * composer — into this slot:
 *
 *   navbar:  [hamburger] [breadcrumb]            [cast] [actions]
 *   footer:  [· · · query bar (WQL composer) · · ·]        ← thumb zone
 *
 * The ResponsiveActionsDock reads `--thumb-dock-lift` (published by the
 * footer) so the FAB cluster stacks above the bar.
 *
 * Desktop rendering is untouched — the same bar renders inline inside
 * StickyPageHeader's title row via its `queryBar` prop.
 *
 * Provider/target split: SidebarLayout wraps its content in the provider
 * and mounts the target inside MobileQueryFooter; the page consumes
 * `useMobileQuerySlot()` and portals into it while the node exists.
 */

import { createContext, useContext, useState, type ReactNode } from 'react'

const MobileQuerySlotNodeContext = createContext<HTMLElement | null>(null)
const MobileQuerySlotSetterContext = createContext<((node: HTMLElement | null) => void) | null>(null)

export function MobileQuerySlotProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  return (
    <MobileQuerySlotSetterContext.Provider value={setNode}>
      <MobileQuerySlotNodeContext.Provider value={node}>
        {children}
      </MobileQuerySlotNodeContext.Provider>
    </MobileQuerySlotSetterContext.Provider>
  )
}

/** Mount inside the mobile app header to claim the query bar. */
export function MobileQuerySlotTarget({ className }: { className?: string }) {
  const setNode = useContext(MobileQuerySlotSetterContext)
  return (
    <div
      ref={setNode}
      className={className}
      data-testid="mobile-query-slot"
    />
  )
}

/** Portal target for the page's query bar; null outside the mobile header. */
export function useMobileQuerySlot(): HTMLElement | null {
  return useContext(MobileQuerySlotNodeContext)
}
