/**
 * AppContent — the routed page surface. Resolves the current RouteView,
 * renders the page for the active PageKind through the `renderInner` record,
 * and wraps it in the canvas shell when the view calls for one. All routing
 * classification stays in lib/routeView (see docs/adr/app-route-view.md).
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SidebarLayout } from '@/templates/SidebarLayout'
import { Navbar } from '@/components/organisms/layout/Navbar'
import { NavSidebar } from './nav/NavSidebar'
import { useRouteView } from './lib/useRouteView'
import { useSelectWorkout } from './lib/useSelectWorkout'
import { ResponsiveActions, NavbarActions } from './nav/ResponsiveActions'
import type { PageKind } from './lib/routeView'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { PaletteShell } from '@/components/organisms/command-palette/PaletteShell'
import { canvasRouteSource, constructSource } from './services/paletteDataSources'
import {
  wqlSearchSource,
  withWqlText,
  searchPaletteQuery,
  paletteExecute,
  navigatePaletteResult,
} from './services/wqlSearchSource'
import { usePageScrollSync } from './hooks/usePageScrollSync'
import { useNav } from './nav/NavContext'
import { useTheme } from '@/contexts/ThemeProvider'
import { useCanvasRoutes } from './canvas/canvasRoutes'
import { MarkdownCanvasPage } from './canvas/MarkdownCanvasPage'
import { ScrollCanvasPage } from './canvas/ScrollCanvasPage'
import { FeedDetailPage } from './pages/FeedDetailPage'
import { FeedItemPage } from './pages/FeedItemPage'
import { TextFilterStrip } from './views/queriable-list/TextFilterStrip'
import { HomeView } from './views/HomeView'
import { QueriableStreamView } from './views/stream/QueriableStreamView'
import { resolveStreamProfile } from './views/stream/streamProfile'
import { applyRouteWqlConfig } from './lib/routeWqlConfig'
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc'
import { CanvasPage } from '@/panels/page-shells'
import { ChallengeHeaderBadge } from './components/molecules/ChallengeHeaderBadge'
import { getChallengeSectionMap } from './canvas/parseCanvasMarkdown'
import { JournalPage } from './pages/JournalPage'
import { PlaygroundNotePage } from './pages/PlaygroundNotePage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { EffortDetailPage } from './pages/EffortDetailPage'
import { NoteByIdPage } from './pages/NoteByIdPage'
import { CollectionDatePage } from './pages/CollectionDatePage'
import { AnalyticsExplorerPage } from './views/analytics/AnalyticsExplorerPage'
import { SettingsPage } from './pages/SettingsPage'
import { DashboardViewPage } from './views/dashboards/DashboardViewPage'
import { PageActions } from './pages/shared/PageActions'
import { PageOptionsSheetRows } from './pages/shared/PageToolbar'
import { mapIndexToL3 } from './pages/shared/pageUtils'
import { useWorkoutItems, EMPTY_WOD_FILES } from './lib/workoutIndex'
import { useSeedContent } from '@/services/content/seedContent'

export function AppContent({ searchHandlerRef }: { searchHandlerRef: MutableRefObject<() => void> }) {
  const navigate = useNavigate()
  const location = useLocation()

  const { theme } = useTheme()

  const seedFiles = useSeedContent()
  const wodFiles = seedFiles ?? EMPTY_WOD_FILES
  const workoutItems = useWorkoutItems()
  const canvasRouteList = useCanvasRoutes()

  // Route classification + view derivation live in the pure `routeView` module;
  // `useRouteView` is its React adapter. `handleSelectWorkout` is the shared
  // navigation callback for nav onRun closures and page onSelect handlers.
  // See docs/adr/app-route-view.md.
  const view = useRouteView()
  const handleSelectWorkout = useSelectWorkout()
  const { workout: currentWorkout, nav: currentNavLinks } = view
  // General layout shell state: breadcrumb (active L1 › page identity) and
  // the L3 index channel (canvas pages publish here; note pages publish via
  // useNotePageNav — bare shells, so the writers never overlap).
  const { tree: l1Items, navState, setL3Items, setSecondarySpec } = useNav()
  const activeL1Id = (navState as { activeL1Id?: string | null }).activeL1Id ?? null
  const activeL1 = l1Items.find(item => item.id === activeL1Id) ?? null
  // Shell title first; bare pages fall back to the route-derived workout name
  // (journal date, workout/effort/feed/dashboard slug) — on mobile the navbar
  // crumb is the ONLY page identity, since the page header is hidden below lg.
  const crumbTitle = view.shell.title ?? currentWorkout.name
  // Stream surfaces resolve their profile once per path — the profile owns the
  // surface's secondary rail (composition: same view, per-route variation).
  const streamProfile = useMemo(
    () => (view.page === 'library' ? applyRouteWqlConfig(resolveStreamProfile(location.pathname)) : undefined),
    [view.page, location.pathname],
  )
  const secondarySpec = streamProfile ? streamProfile.secondary : view.shell.secondary

  useEffect(() => {
    setSecondarySpec(secondarySpec)
    return () => setSecondarySpec(undefined)
  }, [secondarySpec, setSecondarySpec])

  useEffect(() => {
    if (!view.shell.withIndex) return
    setL3Items(mapIndexToL3(currentNavLinks))
    return () => setL3Items([])
  }, [view.shell.withIndex, currentNavLinks, setL3Items])
  // Open the palette for global search (Ctrl/Cmd+K — WQL mode, issue #834)
  const openSearchPalette = useCallback(() => {
    usePaletteStore.getState().open({
      wql: { initialQuery: searchPaletteQuery(), execute: paletteExecute },
      sources: [
        wqlSearchSource(),
        withWqlText(canvasRouteSource(canvasRouteList)),
        withWqlText(constructSource()),
      ],
    }).then(result => {
      if (result.dismissed) return
      navigatePaletteResult(result.item, navigate)
    })
  }, [navigate])

  // Keep the parent's searchHandlerRef up-to-date so the nav tree CallAction always
  // fires the latest callback (workoutItems may change after initial mount).
  useEffect(() => {
    searchHandlerRef.current = openSearchPalette
  }, [openSearchPalette, searchHandlerRef])

  // Keyboard shortcut: Ctrl/Cmd+K (also Ctrl/Cmd+/ and Ctrl/Cmd+P) opens global search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === '/' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        openSearchPalette()
      }
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [openSearchPalette])

  const [isSystemDark, setIsSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const { handleViewCreated, scrollToSection } = usePageScrollSync(currentNavLinks)

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => setIsSystemDark(e.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  const actualTheme = useMemo(() => {
    if (theme === 'system') {
      return isSystemDark ? 'vs-dark' : 'vs'
    }
    return theme === 'dark' ? 'vs-dark' : 'vs'
  }, [theme, isSystemDark])
  // Route → page dispatch (Phase 2). `renderInner` maps each PageKind to its exact
  // page element (props + `key` preserved verbatim from the old ternary); `renderShell`
  // wraps it in the CanvasPage shell when `view.shell` calls for it. Both close over
  // AppContent state, so no callback plumbing is needed. See docs/adr/app-route-view.md.
  const renderInner: Record<PageKind, () => ReactNode> = {
    feedDetail: () => <FeedDetailPage feedSlug={decodeURIComponent(view.feedDetailMatch!)} />,
    feedItem: () => (
      <FeedItemPage
        feedSlug={decodeURIComponent(view.feedItemMatch![0])}
        feedDate={decodeURIComponent(view.feedItemMatch![1])}
        feedItem={decodeURIComponent(view.feedItemMatch![2])}
        theme={actualTheme}
        onViewCreated={handleViewCreated}
        onScrollToSection={scrollToSection}
        onSearch={openSearchPalette}
      />
    ),
    effortDetail: () => <EffortDetailPage />,
    analyticsExplorer: () => (
      <AnalyticsExplorerPage
        actions={<PageActions mode="collection-readonly" currentWorkout={currentWorkout} index={[]} onSearch={openSearchPalette} showSearch={view.page !== 'library'} />}
      />
    ),

    dashboardExplorer: () => (
      <AnalyticsExplorerPage
        actions={<PageActions mode="collection-readonly" currentWorkout={currentWorkout} index={[]} onSearch={openSearchPalette} showSearch={view.page !== 'library'} />}
      />
    ),
    dashboardView: () => <DashboardViewPage />,

    canvas: () =>
      view.canvasPage!.route === '/' ? (
        <HomeView
          wodFiles={wodFiles}
          theme={actualTheme}
        />
      ) : view.canvasPage!.scroll ? (
        <ScrollCanvasPage
          page={view.canvasPage!}
          wodFiles={wodFiles}
          theme={actualTheme}
          workoutItems={workoutItems}
          onSelect={handleSelectWorkout}
          onScrollToSection={scrollToSection}
        />
      ) : (
        <MarkdownCanvasPage
          page={view.canvasPage!}
          wodFiles={wodFiles}
          theme={actualTheme}
          workoutItems={workoutItems}
          onSelect={handleSelectWorkout}
          onScrollToSection={scrollToSection}
        />
      ),
    playground: () => (
      <PlaygroundNotePage key={view.effectivePlaygroundId} theme={actualTheme} onViewCreated={handleViewCreated} onScrollToSection={scrollToSection} onSearch={openSearchPalette} />
    ),
    journalEntry: () => (
      <JournalPage key={view.journalEntryId} theme={actualTheme} onViewCreated={handleViewCreated} onScrollToSection={scrollToSection} onSearch={openSearchPalette} />
    ),
    note: () => (
      <NoteByIdPage key={view.noteById} noteId={view.noteById!} theme={actualTheme} />
    ),
    collectionDate: () => (
      <CollectionDatePage key={`${view.collectionDate!.slug}/${view.collectionDate!.date}`} slug={view.collectionDate!.slug} date={view.collectionDate!.date} theme={actualTheme} />
    ),
    workout: () => (
      <WorkoutEditorPage
        key={`${view.workout.category}/${view.workout.name}`}
        category={view.workout.category}
        name={view.workout.name}
        mdContent={view.workout.content}
        theme={actualTheme}
        onViewCreated={handleViewCreated}
        onSearch={openSearchPalette}
      />
    ),
    library: () => {
      const profile = streamProfile ?? applyRouteWqlConfig(resolveStreamProfile(location.pathname))
      return (
        <QueriableStreamView
          key={profile.route}
          profile={profile}
          actions={<PageActions mode="collection-readonly" currentWorkout={currentWorkout} index={[]} onSearch={openSearchPalette} showSearch={false} />}
        />
      )
    },
    settings: () => <SettingsPage />,
  }

  const canvasTitleAccessory =
    view.page === 'canvas' && view.canvasPage
      ? (
        <>
          {/* On `/` this badge is the single header control — it tracks
              only the home page's own quests (qs-arrive / qs-tour-* /
              qs-edit / qs-run). The cross-page chapter list lives in the
              tour outro's quest section instead of the header. */}
          {view.canvasPage.quests.length > 0 && (
            <ChallengeHeaderBadge
              pageRoute={view.canvasPage.route}
              quests={view.canvasPage.quests}
              challengeSectionMap={getChallengeSectionMap(view.canvasPage)}
              onScrollToSection={scrollToSection}
            />
          )}
        </>
      )
      : undefined

  const renderShell = (inner: ReactNode): ReactNode => {
    if (view.shell.wrap === 'bare') return inner
    const subheader =
      view.shell.subheader === 'filter-collection-workouts'
        ? <TextFilterStrip placeholder="Filter collection workouts… Press / to start filtering" />
        : undefined
    return (
      <CanvasPage
        title={view.shell.title}
        titleAccessory={canvasTitleAccessory}
        subheader={subheader}
        index={view.shell.withIndex ? currentNavLinks : undefined}
        actions={view.shell.actionsMode
          ? <PageActions mode={view.shell.actionsMode} currentWorkout={currentWorkout} index={currentNavLinks} onSearch={openSearchPalette} />
          : undefined}
      >
        {inner}
      </CanvasPage>
    )
  }

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 shrink-2 truncate text-sm">
            {activeL1 && (
              <button
                type="button"
                onClick={() => activeL1.action.type === 'route' && navigate(activeL1.action.to)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {activeL1.label}
              </button>
            )}
            {activeL1 && !!crumbTitle && crumbTitle.toLowerCase() !== activeL1.label.toLowerCase() && (
              <span aria-hidden="true" className="text-muted-foreground/50 shrink-0">›</span>
            )}
            {crumbTitle && crumbTitle.toLowerCase() !== activeL1?.label.toLowerCase() && (
              <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                {crumbTitle}
              </span>
            )}
            {canvasTitleAccessory}
          </nav>
          {/* Cast stays in the header at every breakpoint (navbar here on
              mobile, PageActions bar in desktop page headers). Page-pinned
              actions (the note Edit toggle) stay up beside it via
              NavbarActions. The Page options ⋮ lives in the thumb dock
              instead — its functions (secondary nav, On this page, download)
              surface as stacked buttons in the dock sheet via the global
              fallback registration below. */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <NavbarActions />
            <CastButtonRpc />
          </div>
        </Navbar>
      }
      sidebar={<NavSidebar navSpec={view.shell.nav} />}
      secondary={secondarySpec}
      onSearch={openSearchPalette}
    >
      {/* Global Page options for the mobile thumb dock — stacked function
          rows (secondary nav, On this page, download) under every
          page's own sheet rows. */}
      <ResponsiveActions fallback label="Page options">
        <PageOptionsSheetRows currentWorkout={currentWorkout} />
      </ResponsiveActions>
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="flex-1 flex flex-col min-h-0">
          {renderShell(renderInner[view.page]())}
        </div>
      </div>

      <PaletteShell />
    </SidebarLayout>
  )
}
