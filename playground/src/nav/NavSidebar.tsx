/**
 * NavSidebar — renders the left sidebar from NavContext.
 *
 * Replaces the inline sidebar JSX previously hardcoded in App.tsx.
 *
 * Rendering layers (top → bottom):
 *   1. App logo + version
 *   2. L1 items  (Home, Journal, Collections, Search)
 *   3. L2 panel  (children list OR custom component for the active L1)
 *   4. L3 "On this page" accordion (hidden at 3xl+ — right panel takes over)
 */

import { useNavigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { DocumentTextIcon, PlayIcon } from '@heroicons/react/20/solid'

import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/playground/sidebar'
import { SidebarAccordion } from '@/components/playground/SidebarAccordion'

import { useNav } from './NavContext'
import type { NavItem, NavItemL3 } from './navTypes'

// App version injected by Vite define
declare const __APP_VERSION__: string | undefined
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.dev'

// ─── helpers ─────────────────────────────────────────────────────────────────

function useNavAction() {
  const navigate = useNavigate()
  const { scrollToSection } = useNav()

  return (item: NavItem | NavItemL3) => {
    const { action } = item
    if (action.type === 'route')  navigate(action.to)
    if (action.type === 'scroll') scrollToSection(action.sectionId)
    if (action.type === 'call')   action.handler()
  }
}

function isItemActive(item: NavItem, navState: ReturnType<typeof useNav>['navState'], location: ReturnType<typeof useLocation>): boolean {
  if (item.isActive) return item.isActive(location as unknown as Location, navState)
  if (item.action.type === 'route') {
    return item.action.to === '/'
      ? location.pathname === '/' || location.pathname === ''
      : location.pathname === item.action.to
  }
  if (item.action.type === 'scroll') return navState.activeL3Id === item.action.sectionId
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
            onClick={() => handleAction(child)}
            current={active}
          >
            {child.icon && <child.icon data-slot="icon" />}
            <SidebarLabel>{child.label}</SidebarLabel>
          </SidebarItem>
        )
      })}
    </SidebarSection>
  )
}

// ─── L3 accordion ─────────────────────────────────────────────────────────────

function L3Accordion({ items }: { items: NavItemL3[] }) {
  const { navState, scrollToSection } = useNav()

  if (items.length === 0) return null

  return (
    <SidebarAccordion
      title="On this page"
      count={items.length}
      defaultOpen
      className="3xl:hidden"
    >
      {items.map(item => {
        const isActive = navState.activeL3Id === item.id
        const sectionId = item.action.type === 'scroll' ? item.action.sectionId : item.id

        return (
          <div key={item.id} className="flex items-center group">
            <SidebarItem
              onClick={() => scrollToSection(sectionId)}
              current={isActive}
              className="flex-1"
            >
              <DocumentTextIcon data-slot="icon" />
              <SidebarLabel>{item.label}</SidebarLabel>
            </SidebarItem>

            {item.secondaryAction && (
              <button
                onClick={item.secondaryAction.handler}
                title={item.secondaryAction.label ?? 'Run'}
                className="opacity-0 group-hover:opacity-100 mr-2 flex items-center justify-center size-6 rounded text-primary hover:bg-primary/10 transition-all"
              >
                <PlayIcon className="size-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </SidebarAccordion>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NavSidebar() {
  const { tree, navState, dispatch, l3Items } = useNav()
  const location = useLocation()
  const handleAction = useNavAction()

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
        <div className="flex items-center px-2 py-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 rotate-3">
            <Dumbbell size={18} />
          </div>
          <span className="ml-3 text-lg font-black tracking-tighter text-foreground uppercase">
            Wod Wiki
          </span>
          <span className="ml-1.5 text-[9px] font-bold text-muted-foreground self-end mb-1 opacity-50 uppercase tracking-widest">
            v{appVersion}
          </span>
        </div>

        {/* ── L1 items ───────────────────────────────────────────────────── */}
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
              </SidebarItem>
            )
          })}
        </SidebarSection>
      </SidebarHeader>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <SidebarBody>
        {/* L2 — context-specific panel or doc children */}
        {renderL2()}
      </SidebarBody>
    </Sidebar>
  )
}
