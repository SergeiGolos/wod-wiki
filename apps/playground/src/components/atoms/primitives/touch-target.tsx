import * as React from "react"

/**
 * Expand the hit area to at least 44×44px on touch devices.
 * Currently a pass-through; the actual hit-area expansion is done
 * via CSS padding/margin on the parent Button/NavbarItem/SidebarItem.
 * Kept as a named wrapper for documentation and future enhancement.
 */
export function TouchTarget({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
