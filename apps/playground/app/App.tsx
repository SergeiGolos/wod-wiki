import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { SidebarLayout } from '@/templates/SidebarLayout'
import { Navbar, NavbarSection } from '@/components/organisms/layout/Navbar'
import { NavProvider } from './nav/NavContext'
import { NavSidebar } from './nav/NavSidebar'
import { buildAppNavTree } from './nav/appNavTree'
import { useRouteView } from './lib/useRouteView'
import { useSelectWorkout } from './lib/useSelectWorkout'
import type { PageKind } from './lib/routeView'
import { DebugModeProvider } from '@/contexts/DebugModeContext'
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
import { ThemeProvider, useTheme } from '@/contexts/ThemeProvider'
import { AudioProvider } from '@/contexts/AudioContext'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  ROUTE_PATTERNS,
  PlanRedirect,
  SyntaxRedirect,
  TrackerRedirect,
  ReviewRedirect,
  NotePlaygroundRedirect,
  WorkoutRedirect,
} from './lib/routes'
import { DocumentTitleSync } from './lib/DocumentTitleSync'
import { PlaygroundLandingPage } from './pages/PlaygroundLandingPage'
import { canvasRoutes } from './canvas/canvasRoutes'
import { MarkdownCanvasPage } from './canvas/MarkdownCanvasPage'
import { ScrollCanvasPage } from './canvas/ScrollCanvasPage'
import { FeedDetailPage } from './pages/FeedDetailPage'
import { FeedItemPage } from './pages/FeedItemPage'
import { TextFilterStrip } from './views/queriable-list/TextFilterStrip'
import { HomeView } from './views/HomeView'
import { QueriableStreamView } from './views/stream/QueriableStreamView'
import { resolveStreamProfile } from './views/stream/streamProfile'
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc'
import { CanvasPage, MobileQuerySlotTarget } from '@/panels/page-shells'
import { ChallengeHeaderBadge } from './components/molecules/ChallengeHeaderBadge'
import { getChallengeSectionMap } from './canvas/parseCanvasMarkdown'
// ── Extracted page components ────────────────────────────────────────────────
import { WallClockPage } from './pages/WallClockPage'
import { JournalPage } from './pages/JournalPage'
import { PlaygroundNotePage } from './pages/PlaygroundNotePage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { LoadZipPage } from './pages/LoadZipPage'
import CalcAuthoringPrototypePage from './pages/CalcAuthoringPrototypePage'

import { CalcAuthoringPanel } from '@/components/organisms/calc-authoring/CalcAuthoringPanel'
import { JournalZipLoadPage } from './pages/JournalZipLoadPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { EffortDetailPage } from './pages/EffortDetailPage'
import { AnalyticsExplorerPage } from './views/analytics/AnalyticsExplorerPage'
import { SettingsPage } from './pages/SettingsPage'

import { DashboardViewPage } from './views/dashboards/DashboardViewPage'
import { Toaster } from '@/components/atoms/primitives/toaster'
import { PageActions } from './pages/shared/PageActions'
import { ActionsMenu } from './pages/shared/PageToolbar'
import { mapIndexToL3 } from './pages/shared/pageUtils'
import { EffortRegistryProvider } from './contexts/EffortRegistryContext'
import type { MenuSpec } from './nav/menuModel'
import { PlaygroundRedirect } from './pages/PlaygroundRedirect'

/** Library routes get a WQL-driven secondary section — recent entries, newest first. */
const LIBRARY_SECONDARY: MenuSpec = [
  {
    kind: 'wql',
    id: 'recent-entries',
    label: 'Recent entries',
    query: 'find:note{}',
    limit: 6,
    filterEntry: e => !!e.date,
    toEntry: e => `/journal/${e.date}?note=${e.id}`,
  },
]


// `workoutFiles` (raw glob) and `WorkoutItem` (typed item) live in `lib/workoutIndex`.
// `workoutFiles` is passed through to `MarkdownCanvasPage` as `wodFiles`; the typed
// `workoutItems` array is passed to leaves that filter/search it. Both are kept as
// props to leaf components — see `MarkdownCanvasPage.test.tsx` for the contract.
import { workoutFiles, useWorkoutItems, type WorkoutItem } from './lib/workoutIndex'
export type { WorkoutItem }

/** Redirect /analytics/explorer → /dashboard, preserving the shareable ?q=
 *  (and ?weeks=) query string. The WQL explorer moved to /dashboard. */
function ExplorerRedirect(): ReactNode {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/dashboard', search }} replace />
}

function AppContent({ searchHandlerRef }: { searchHandlerRef: MutableRefObject<() => void> }) {
  const navigate = useNavigate()

  const { theme } = useTheme()

  const workoutItems = useWorkoutItems()

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
  const secondarySpec = view.page === 'library' ? LIBRARY_SECONDARY : view.shell.secondary

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
        withWqlText(canvasRouteSource(canvasRoutes)),
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
          wodFiles={workoutFiles as Record<string, string>}
          theme={actualTheme}
        />
      ) : view.canvasPage!.scroll ? (
        <ScrollCanvasPage
          page={view.canvasPage!}
          wodFiles={workoutFiles as Record<string, string>}
          theme={actualTheme}
          workoutItems={workoutItems}
          onSelect={handleSelectWorkout}
          onScrollToSection={scrollToSection}
        />
      ) : (
        <MarkdownCanvasPage
          page={view.canvasPage!}
          wodFiles={workoutFiles as Record<string, string>}
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
      const profile = resolveStreamProfile(location.pathname)
      return (
        <QueriableStreamView
          key={profile.route}
          profile={profile}
          actions={<PageActions mode="collection-readonly" currentWorkout={currentWorkout} index={[]} onSearch={openSearchPalette} showSearch={view.page !== 'library'} />}
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
      view.shell.subheader === 'filter-collections'
        ? <TextFilterStrip placeholder="Filter collections… Press / to start filtering" />
        : view.shell.subheader === 'filter-collection-workouts'
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
          {/* Mobile page slot: pages portal their mobile-critical header
              content here (stream query bar, note Edit toggle, …) — below lg
              there is no page-level header, so this slot is where it lands. */}
          <MobileQuerySlotTarget className="min-w-0 flex-1 lg:hidden" />
          {/* Cast / actions — mobile navbar only; search moved to the floating
              SearchFab (SidebarLayout), desktop keeps rail + page headers. */}
          <NavbarSection className="lg:hidden">
            <div className="flex items-center">
              <CastButtonRpc />
            </div>
            <ActionsMenu currentWorkout={currentWorkout} />
          </NavbarSection>
        </Navbar>
      }
      sidebar={<NavSidebar navSpec={view.shell.nav} />}
      secondary={secondarySpec}
      onSearch={openSearchPalette}
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="flex-1 flex flex-col min-h-0">
          {renderShell(renderInner[view.page]())}
        </div>
      </div>

      <PaletteShell />
    </SidebarLayout>
  )
}

// ---------------------------------------------------------------------------
// ScrollToTop — reset scroll position on route change; honor hash anchors
// when they resolve to an element id (used by construct lookup links).
// ---------------------------------------------------------------------------

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const { scrollToSection } = useNav()

  useEffect(() => {
    if (hash) {
      const targetId = hash.slice(1)
      scrollToSection(targetId)
      const timer = setTimeout(() => {
        scrollToSection(targetId)
      }, 50)
      return () => clearTimeout(timer)
    }
    window.scrollTo(0, 0)
    // Only run on location change (pathname or hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash])
  return null
}

import { NuqsAdapter } from 'nuqs/adapters/react-router'
import { useZipProcessor } from './hooks/useZipProcessor'
import { useJournalZipProcessor } from './hooks/useJournalZipProcessor'

function GlobalState() {
  useZipProcessor()
  useJournalZipProcessor()
  return null
}

export function App() {
  // Stable ref so AppContent can inject its openSearchPalette callback after mount.
  // The nav tree is built once; the search item calls the ref's current value.
  const searchHandlerRef = useRef<() => void>(() => {})
  const navTree = useMemo(() => buildAppNavTree(() => searchHandlerRef.current()), [])

  return (
    <ThemeProvider defaultTheme="system" storageKey="wod-wiki-playground-theme">
      <DebugModeProvider>
        <EffortRegistryProvider>
          <AudioProvider>
            <BrowserRouter>
              <NuqsAdapter>
              <GlobalState />
              <Toaster />
              <NavProvider tree={navTree}>
                <ScrollToTop />
                <Routes>
                  <Route path="/proto/calc-authoring" element={<CalcAuthoringPrototypePage />} />

                  <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
                  <Route path="/settings/appearance" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path="/settings/system" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path="/settings/library/calcs" element={<div className="p-6"><CalcAuthoringPanel /></div>} />
                  <Route path="/legacy" element={<PlaygroundLandingPage />} />
                  <Route path="/chapters/basics" element={<Navigate to="/guide/syntax/basics" replace />} />
                  <Route path="/chapters/sequences" element={<Navigate to="/guide/syntax" replace />} />
                  <Route path="/chapters/protocols" element={<Navigate to="/guide/syntax/protocols" replace />} />
                  <Route path="/challenge" element={<Navigate to="/" replace />} />
                  <Route path="/syntax" element={<SyntaxRedirect />} />
                  <Route path="/syntax/*" element={<SyntaxRedirect />} />
                  <Route path={ROUTE_PATTERNS.plan} element={<PlanRedirect />} />
                  <Route path={ROUTE_PATTERNS.feeds} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feed} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feedDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feedItem} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.collections} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.collectionDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.collectionWorkout} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.load} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><LoadZipPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournal} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><JournalZipLoadPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournalDate} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><JournalZipLoadPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.playgroundRoot} element={<PlaygroundRedirect />} />
                  <Route path={ROUTE_PATTERNS.playground} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.notePlaygroundAlias} element={<NotePlaygroundRedirect />} />
                  <Route path={ROUTE_PATTERNS.note} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journalNote} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journalEntry} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journal} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.library} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.run} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><WallClockPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.tracker} element={<TrackerRedirect />} />
                  {/* Dedicated execution telemetry streams and result detail (#946, Ticket 005). */}
                  <Route path={ROUTE_PATTERNS.results} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.resultsSegments} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.resultDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  {/* Retired review screens (#946, Ticket 005) — bookmarks land on dedicated results routes. */}
                  <Route path="/review/:runtimeId" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review/:sectionId" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review/:sectionId/:resultId" element={<ReviewRedirect />} />
                  <Route path="/workout/:category/:name" element={<WorkoutRedirect />} />
                  {canvasRoutes.map(({ route }) => (
                    <Route key={route} path={route} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  ))}
                  <Route path={ROUTE_PATTERNS.efforts} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.effort} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  {/* The dashboard namespace (/dashboard = WQL explorer, /dashboard/:slug = a
                      saved or prebuilt dashboard). Legacy /analytics/* redirect here. */}
                  <Route path={ROUTE_PATTERNS.dashboard} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.dashboardView} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.analytics} element={<Navigate to="/dashboard" replace />} />
                  <Route path={ROUTE_PATTERNS.analyticsExplorer} element={<ExplorerRedirect />} />
                  <Route path={ROUTE_PATTERNS.analyticsDashboard} element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <DocumentTitleSync />
              </NavProvider>
            </NuqsAdapter>
          </BrowserRouter>
        </AudioProvider>
      </EffortRegistryProvider>
      </DebugModeProvider>
    </ThemeProvider>
  )
}

export default App
