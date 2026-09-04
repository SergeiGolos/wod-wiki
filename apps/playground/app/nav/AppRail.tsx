/**
 * AppRail — 56px icon rail (general layout, leftmost column).
 *
 * Carries the L1 destinations (Home / Library / Dashboards / Efforts) as
 * icon-only buttons, the app avatar on top, and search pinned to the bottom.
 * Labels/children live in the context sidebar (NavSidebar); the rail is the
 * only constant chrome across sections.
 */

import { Dumbbell, Settings } from 'lucide-react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { useNavigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'

import { useNav } from './NavContext'
import { executeNavAction } from './navTypes'
import { isItemActive } from './NavSidebar'
import type { NavItem, NavActionDeps } from './navTypes'

export function AppRail({ onSearch }: { onSearch: () => void }) {
  const { tree, navState } = useNav()
  const navigate = useNavigate()
  const location = useLocation()

  const deps: NavActionDeps = {
    navigate: (to, opts) => navigate(to, { replace: opts?.replace }),
    setQueryParam: () => {},
    scrollToSection: () => {},
  }

  const items = tree.filter((item): item is NavItem => item.icon != null && item.id !== 'settings')
  const isSettingsActive = location.pathname.startsWith('/settings')

  return (
    <>
      {/* Avatar → home */}
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Wod Wiki home"
        className="mb-3 grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 rotate-3"
      >
        <Dumbbell size={17} />
      </button>

      <nav aria-label="Primary" className="flex flex-col items-center gap-1.5">
        {items.map(item => {
          const Icon = item.icon as unknown as ComponentType<{ className?: string }>
          const active = isItemActive(item, navState, location as unknown as Location)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => executeNavAction(item.action, deps)}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative grid size-9 place-items-center rounded-lg transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute -left-[14px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="size-5" />
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onSearch}
        title="Search (⌘K)"
        aria-label="Search"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <MagnifyingGlassIcon className="size-5" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings/appearance')}
        title="Settings"
        aria-label="Settings"
        aria-current={isSettingsActive ? 'page' : undefined}
        data-testid="nav-settings"
        className={cn(
          'relative grid size-9 place-items-center rounded-lg transition-colors mt-1.5',
          isSettingsActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
      >
        {isSettingsActive && (
          <span className="absolute -left-[14px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Settings className="size-5" />
      </button>
    </>
  )
}
