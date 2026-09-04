/**
 *
 * Rendering layers (top → bottom):
 *   1. App logo + version
 *   2. L1 items
 *   3. L2 panel (children list or custom component for the active L1)
 *
 * "On this page" (L3) section links are intentionally excluded here — they
 * appear only in the "…" ActionsMenu so they don't duplicate the right TOC.
 */

import { useNavigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { BookOpen, Dumbbell } from 'lucide-react'

import { Sidebar, SidebarBody, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection } from '@/components/organisms/layout/Sidebar'
import { SidebarAccordion } from '@/components/organisms/layout/SidebarAccordion'
import { ShortcutBadge } from '@/components/atoms/ShortcutBadge'
import { AppVersion } from '@/components/atoms/AppVersion'
import { ButtonLink } from '@/components/molecules/ButtonLink'

import { useNav } from './NavContext'
import { executeNavAction } from './navTypes'
import type { NavItem, NavActionDeps, NavState } from './navTypes'
import { MenuList, useResolvedMenu } from './MenuList'
import type { MenuSpec } from './menuModel'

// App version injected by Vite define
declare const __APP_VERSION__: string | undefined
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.dev'

// ─── helpers ─────────────────────────────────────────────────────────────────

function useNavDeps(): NavActionDeps {
  const navigate = useNavigate()
  const { scrollToSection } = useNav()

  return {
    navigate: (to, opts) => navigate(to, { replace: opts?.replace }),
    setQueryParam: (_params, _replace) => {
      // Sidebar clicks on L3 section items use scrollToSection instead.
      // URL query params are updated by the page's IntersectionObserver.
    },
    scrollToSection,
  }
}

function useNavAction() {
  const deps = useNavDeps()

  return (item: NavItem) => executeNavAction(item.action, deps)
}

export function isItemActive(item: NavItem, navState: NavState, location: Location): boolean {
  if (item.isActive) return item.isActive(location as unknown as Location, navState)
  if (item.action.type === 'route') {
    return item.action.to === '/'
      ? location.pathname === '/' || location.pathname === ''
      : location.pathname === item.action.to
  }
  if (item.action.type === 'scroll') return navState.activeL3Id === item.action.sectionId
  if (item.action.type === 'query') return navState.activeL3Id === item.id
  return false
}

// ─── L2 children list renderer ────────────────────────────────────────────────

function L2ChildrenList({ items }: { items: NavItem[] }) {
  const { navState } = useNav()
  const location = useLocation()
  const handleAction = useNavAction()

  return (
    <SidebarSection>
      {items.map(child => {
        const active = isItemActive(child, navState, location)

        // Accordion group (e.g. Syntax with sub-pages)
        if (child.children && child.children.length > 0) {
          return (
            <SidebarAccordion
              key={child.id}
              title={child.label}
              count={child.children.length}
              defaultOpen={child.children.some(gc => isItemActive(gc, navState, location))}
              collapsible={child.id !== 'syntax-group'}
            >              
              {child.children.map(gc => {
                const gcActive = isItemActive(gc, navState, location)
                return (
                  <SidebarItem
                    key={gc.id}
                    onClick={() => handleAction(gc)}
                    current={gcActive}
                  >
                    {gc.icon && <gc.icon data-slot="icon" />}
                    <SidebarLabel>{gc.label}</SidebarLabel>
                  </SidebarItem>
                )
              })}
            </SidebarAccordion>
          )
        }

        // Flat item
        return (
          <SidebarItem
            key={child.id}
            onClick={child.disabled ? undefined : () => handleAction(child)}
            current={active}
            disabled={child.disabled}
            aria-label={child.disabled ? `${child.label} (coming soon)` : undefined}
            className={child.disabled ? 'opacity-60' : undefined}
          >
            {child.icon && <child.icon data-slot="icon" />}
            <SidebarLabel>{child.disabled ? '+' : child.label}</SidebarLabel>
          </SidebarItem>
        )
      })}
    </SidebarSection>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NavSidebar({ navSpec }: { navSpec?: MenuSpec }) {
  const { tree, navState, dispatch } = useNav()
  const location = useLocation()
  const handleAction = useNavAction()
  const resolvedNav = useResolvedMenu(navSpec)

  // Find which L1 is currently active
  const activeL1 = tree.find(item => item.id === navState.activeL1Id) ?? null

  // Render the L2 zone for the active L1
  const renderL2 = () => {
    if (!activeL1) return null

    // Custom panel (Journal, Collections, Search)
    if (activeL1.panel) {
      const Panel = activeL1.panel
      return (
        <div className="border-b border-border/40 pb-2 mb-2">
          <Panel item={activeL1} navState={navState} dispatch={dispatch} />
        </div>
      )
    }

    // Children list (Home docs/syntax)
    if (activeL1.children && activeL1.children.length > 0) {
      return (
        <div className="border-b border-border/40 pb-2 mb-2">
          <L2ChildrenList items={activeL1.children} />
        </div>
      )
    }

    return null
  }

  return (
    <Sidebar>
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <SidebarHeader>
        {/* Logo + L1 items — mobile drawer only; the desktop icon rail owns L1 */}
        <div className="lg:hidden">
          <div className="flex items-center px-2 py-4">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 rotate-3">
              <Dumbbell size={18} />
            </div>
            <span className="ml-3 text-lg font-black tracking-tighter text-foreground uppercase">
              Wod Wiki
            </span>
            <AppVersion
              version={appVersion}
              className="ml-1.5 text-[9px] font-bold text-muted-foreground self-end mb-1 opacity-50 uppercase tracking-widest"
            />
          </div>

          <SidebarSection>
            {tree.map(item => {
              const active = isItemActive(item, navState, location)
              return (
                <SidebarItem
                  key={item.id}
                  onClick={() => handleAction(item)}
                  current={active}
                >
                  {item.icon && <item.icon data-slot="icon" />}
                  <SidebarLabel className="font-semibold tracking-tight">
                    {item.label}
                  </SidebarLabel>
                  {item.id === 'search' && <ShortcutBadge tokens={['ctrl', '/']} delimiter="+" />}
                </SidebarItem>
              )
            })}
          </SidebarSection>
        </div>

        {/* Context heading — names the active section above its L2 panel.
            Mobile drawer: sits under the L1 selector section (Home | Library
            | Dashboards | Efforts); desktop: tops the context sidebar. */}
        <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {activeL1?.label ?? 'Wod Wiki'}
        </div>
      </SidebarHeader>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <SidebarBody>
        {/* L2 — context-specific panel or doc children */}
        {renderL2()}
        {/* Route-declared nav panel (zone 2 contract) — same standardized
            rendering as the secondary rail. */}
        {resolvedNav.length > 0 && (
          <div className="pt-1">
            <MenuList entries={resolvedNav} />
          </div>
        )}
      </SidebarBody>
    </Sidebar>
  )
}
