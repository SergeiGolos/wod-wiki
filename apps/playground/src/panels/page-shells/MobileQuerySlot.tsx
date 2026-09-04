/**
 * MobileQuerySlot — the portal target where a page's query bar floats up into
 * the app-level mobile header (the sticky navbar that carries the hamburger).
 *
 * Stream routes render no page-level header on mobile (it would double-stack
 * over the navbar and hide the menu trigger). Instead the page portals its
 * StreamQueryBar into this slot, which the app navbar mounts between the
 * breadcrumb and the right-hand actions:
 *
 *   [hamburger] [breadcrumb] [· · · slot · · ·] [cast] [actions]
 *
 * Desktop rendering is untouched — the same bar renders inline inside
 * StickyPageHeader's title row via its `queryBar` prop.
 *
 * Provider/target split: SidebarLayout wraps its content in the provider;
 * the App navbar (stream routes only) renders the target; the page consumes
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
