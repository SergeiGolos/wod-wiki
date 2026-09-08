/**
 * ResponsiveActions — declare a page's actions once; render them inline on
 * desktop (lg+) and in the shared mobile thumb dock below lg.
 *
 * Composition model:
 *   - `ResponsiveActionsProvider` mounts once in SidebarLayout and owns the
 *     single mobile dock (fixed thumb-zone cluster: overflow sheet trigger +
 *     page primary + the search FAB, positioned per the fabAlignment
 *     preference). Pages never portal and never mount duplicate controls.
 *   - `<ResponsiveActions primary={…} label={…}>{actions}</ResponsiveActions>`
 *     in a page header renders inline on desktop and REGISTERS with the dock
 *     on mobile, where its children surface in the dock's overflow sheet
 *     (mounted lazily, only while the sheet is open). Page-only: the sheet
 *     never carries global chrome.
 *   - GLOBAL chrome (cast, page options with the L3 index) does NOT ride the
 *     dock — it lives in the header at every breakpoint: the page's
 *     PageActions bar on desktop, the app navbar cluster on mobile (see
 *     App.tsx Navbar).
 *   - Nesting: an inner ResponsiveActions inside an outer one renders inline
 *     only and never registers — a page's outer wrapper is the single
 *     registration point.
 *   - Standalone (no provider, e.g. Storybook/tests): renders inline on all
 *     viewports.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { EllipsisVerticalIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { cn } from '@/lib/utils'
import { useVisualViewportRect } from '@bitcobblers/wod-wiki-ui'
import { useIsMobile } from '../hooks/useIsMobile'
import { useFabAlignment } from '../lib/fabAlignment'
import { SearchFab } from './SearchFab'

// ── Registration ─────────────────────────────────────────────────────────────

interface ActionsRegistration {
  id: string
  primary?: ReactNode
  children?: ReactNode
  label: string
  fallback: boolean
}

interface ActionsRegistry {
  register: (entry: ActionsRegistration) => void
  unregister: (id: string) => void
}

const RegistryContext = createContext<ActionsRegistry | null>(null)
const InsideActionsContext = createContext(false)

/** True when rendered inside a ResponsiveActionsProvider (app shell). */
export function useInResponsiveActionsProvider(): boolean {
  return useContext(RegistryContext) !== null
}

export interface ResponsiveActionsProps {
  /** The page's single primary action — dock FAB on mobile, inline on desktop. */
  primary?: ReactNode
  /** Remaining page actions — dock overflow sheet on mobile, inline on desktop. */
  children?: ReactNode
  /** Accessible name for the mobile overflow group (defaults to 'Page options'). */
  label?: string
  /**
   * Global Page options: renders nothing inline; its children merge into
   * every page's dock sheet (below the page rows, under a rule) and serve
   * as the sheet's sole contents on pages that declare no actions. Mount
   * once inside the provider, near the app root.
   */
  fallback?: boolean
}
export function ResponsiveActions({
  primary,
  children,
  label,
  fallback = false,
}: ResponsiveActionsProps) {
  const registry = useContext(RegistryContext)
  const nested = useContext(InsideActionsContext)
  const isMobile = useIsMobile()
  const id = useId()

  const registers = registry !== null && !nested && isMobile && !fallback
  const fallbackRegisters = registry !== null && fallback

  // Registered children carry the nesting marker so a ResponsiveActions
  // declared INSIDE another's children renders inline (within the sheet)
  // and never registers — the outer wrapper stays the single owner.
  const registeredChildren = (
    <InsideActionsContext.Provider value={true}>
      {children}
    </InsideActionsContext.Provider>
  )

  useEffect(() => {
    if (!registers && !fallbackRegisters) return
    registry!.register({ id, primary, children: registeredChildren, label: label ?? 'Page options', fallback })
    return () => registry!.unregister(id)
  }, [registers, fallbackRegisters, registry, id, primary, registeredChildren, label, fallback])

  // Fallback never renders inline (desktop keeps its existing header
  // affordances); below lg the dock owns the surface.
  if (fallback) return null
  // Inside the provider on mobile the dock owns rendering; standalone (no
  // provider) always renders inline so Storybook/tests keep working.
  if (registry && isMobile && !nested) return null
  return (
    <InsideActionsContext.Provider value={true}>
      <div className="flex items-center gap-2">
        {primary}
        {children}
      </div>
    </InsideActionsContext.Provider>
  )
}

// ── Provider + dock ──────────────────────────────────────────────────────────

export interface ResponsiveActionsProviderProps {
  /** Opens the global search palette — integrated into the dock's search FAB. */
  onSearch?: () => void
  children?: ReactNode
}

export function ResponsiveActionsProvider({ onSearch, children }: ResponsiveActionsProviderProps) {
  const [registrations, setRegistrations] = useState<ActionsRegistration[]>([])
  const register = useCallback(
    (entry: ActionsRegistration) =>
      setRegistrations(prev => [...prev.filter(r => r.id !== entry.id), entry]),
    [],
  )
  const unregister = useCallback(
    (id: string) => setRegistrations(prev => prev.filter(r => r.id !== id)),
    [],
  )
  const registry = useMemo(() => ({ register, unregister }), [register, unregister])

  return (
    <RegistryContext.Provider value={registry}>
      {children}
      <ResponsiveActionsDock registrations={registrations} onSearch={onSearch} />
    </RegistryContext.Provider>
  )
}

/**
 * The single mounted mobile dock. Fixed thumb-zone cluster anchored to the
 * fabAlignment corner; rises with the on-screen keyboard via visualViewport.
 * Renders nothing on desktop — page headers own actions there. The ⋮ trigger
 * only appears for registrations whose children actually render content;
 * pages contributing nothing on mobile (their generic controls are
 * dock/navbar-owned) leave just the primary FAB + search FAB.
 */
function ResponsiveActionsDock({
  registrations,
  onSearch,
}: {
  registrations: ActionsRegistration[]
  onSearch?: () => void
}) {
  const isMobile = useIsMobile()
  const [alignment] = useFabAlignment()
  const viewport = useVisualViewportRect()
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Most recent page registration wins; the most recent fallback supplies
  // the global Page options rows merged into every page's sheet.
  const active = useMemo(() => {
    for (let i = registrations.length - 1; i >= 0; i -= 1) {
      if (!registrations[i].fallback) return registrations[i]
    }
    return undefined
  }, [registrations])
  const globalActions = useMemo(() => {
    for (let i = registrations.length - 1; i >= 0; i -= 1) {
      if (registrations[i].fallback) return registrations[i]
    }
    return undefined
  }, [registrations])

  // Route change: collapse the sheet (registered page actions unmount with
  // the page; a stale open sheet must not outlive them).
  useEffect(() => {
    setSheetOpen(false)
  }, [location.pathname])

  // Focus the sheet when it opens so keyboard users land inside it.
  useLayoutEffect(() => {
    if (sheetOpen) sheetRef.current?.focus()
  }, [sheetOpen])

  // Sheets whose content renders nothing (shell-owned generic bars
  // suppressed on mobile) must not be offered: measured on open, remembered
  // per registration, trigger suppressed.
  const [emptySheetIds, setEmptySheetIds] = useState<ReadonlySet<string>>(() => new Set())
  useLayoutEffect(() => {
    if (!sheetOpen) return
    const empty = sheetRef.current !== null && sheetRef.current.childElementCount === 0
    if (empty) {
      setEmptySheetIds(prev => {
        const next = new Set(prev)
        if (active) next.add(active.id)
        if (globalActions) next.add(globalActions.id)
        return next
      })
      setSheetOpen(false)
    }
  }, [sheetOpen, active, globalActions])

  const hasContent = (reg?: { id: string; children?: ReactNode }) =>
    !!reg?.children && !emptySheetIds.has(reg.id)
  const showOverflow = hasContent(active) || hasContent(globalActions)

  if (!isMobile) return null
  if (!onSearch && !active && !globalActions) return null

  return (
    <div
      className={cn(
        'lg:hidden fixed z-40 flex flex-col items-center gap-3',
        alignment === 'left' ? 'left-4 items-start' : 'right-4 items-end',
      )}
      style={{ bottom: `calc(1rem + var(--thumb-dock-lift, 0px) + ${viewport.offsetBottom}px + env(safe-area-inset-bottom))` }}
    >
      {/* Overflow sheet — mounts its contents lazily, only while open, so
          page controls are never double-mounted. Page rows stack first at
          ≥44px touch targets; the global Page options rows (secondary nav,
          On this page, download, coffee) follow under a rule as stacked
          buttons. Cast lives in the navbar, never here. */}
      {sheetOpen && showOverflow && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setSheetOpen(false)}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-label={active?.label ?? globalActions?.label ?? 'Page options'}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setSheetOpen(false)
              }
            }}
            className={cn(
              'relative z-40 mb-1 flex w-60 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-2xl bg-card p-3 shadow-xl ring-1 ring-foreground/5 outline-none',
              '[&_button]:min-h-11 [&_button]:min-w-11',
            )}
            style={{ maxHeight: `calc(${viewport.height === null ? '100dvh' : `${viewport.height}px`} - 6rem - env(safe-area-inset-bottom))` }}
          >
            {active?.children}
            {active?.children && globalActions?.children && (
              <div className="my-1 border-t border-border/60" aria-hidden="true" />
            )}
            {globalActions?.children}
          </div>
        </>
      )}

      {/* Buttons stack vertically, rising from the thumb corner — the
          search FAB stays lowest (the corner position it held in the old
          horizontal row); the page primary sits on top. */}
      <div className="relative z-40 flex flex-col items-center gap-2">
        {active?.primary && (
          <div className="[&_button]:min-h-11 [&_button]:min-w-11">{active.primary}</div>
        )}

      {showOverflow && (
        <button
          type="button"
          onClick={() => setSheetOpen(open => !open)}
          aria-label={active?.label ?? globalActions?.label ?? 'Page options'}
          aria-expanded={sheetOpen}
          data-testid="actions-overflow"
          className={cn(
            'flex size-12 items-center justify-center rounded-full',
            'bg-card text-foreground shadow-lg ring-1 ring-foreground/10',
            'hover:bg-muted active:scale-95 transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          )}
        >
          {sheetOpen ? <XMarkIcon className="size-6" /> : <EllipsisVerticalIcon className="size-6" />}
        </button>
      )}

        {onSearch && <SearchFab onOpen={() => { setSheetOpen(false); onSearch() }} />}
      </div>
    </div>
  )
}
