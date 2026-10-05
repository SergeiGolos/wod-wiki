import React, { createContext, useContext } from 'react'

/**
 * Drawer-dismiss seam for the mobile navigation drawer (SidebarLayout).
 *
 * SidebarLayout supplies the drawer's close while its contents are mounted;
 * consumers (AppRail settings, filter panels) call it to dismiss explicitly —
 * modal/external flows and Apply only, never plain facet/L1 navigation.
 * Desktop renders without the provider and the hook degrades to a no-op.
 */
const NavigationDrawerContext = createContext<() => void>(() => {})

export function NavigationDrawerProvider({
  close,
  children,
}: React.PropsWithChildren<{ close: () => void }>) {
  return (
    <NavigationDrawerContext.Provider value={close}>{children}</NavigationDrawerContext.Provider>
  )
}

export function useCloseNavigationDrawer(): () => void {
  return useContext(NavigationDrawerContext)
}
