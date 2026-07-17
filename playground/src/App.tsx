import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { SidebarLayout } from '@/templates/SidebarLayout'
import { Navbar, NavbarSection, NavbarSpacer } from '@/components/organisms/layout/Navbar'
import { NavProvider } from './nav/NavContext'
import { NavSidebar } from './nav/NavSidebar'
import { buildAppNavTree } from './nav/appNavTree'
import { NavSearchInput } from '@/components/molecules/NavSearchInput'
import { useRouteView } from './lib/useRouteView'
import { useSelectWorkout } from './lib/useSelectWorkout'
import type { PageKind, SelectWorkoutItem } from './lib/routeView'
import { DebugModeProvider } from '@/contexts/DebugModeContext'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { PaletteShell } from '@/components/organisms/command-palette/PaletteShell'
import { globalSearchSource } from './services/paletteDataSources'
import { useCreateJournalEntry } from './hooks/useCreateJournalEntry'
import { usePageScrollSync } from './hooks/usePageScrollSync'
import { ThemeProvider, useTheme } from '@/contexts/ThemeProvider'
import { AudioProvider } from '@/contexts/AudioContext'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import {
  ROUTE_PATTERNS,
  reviewPath,
  NotePlaygroundRedirect,
  WorkoutRedirect,
  GettingStartedRedirect,
  SyntaxRedirect,
  TrackerRedirect,
  PlanRedirect,
} from './lib/routes'
import { Concept3LandingPage } from './pages/Concept3LandingPage'
import { PlaygroundLandingPage } from './pages/PlaygroundLandingPage'
import { canvasRoutes } from './canvas/canvasRoutes'
import { MarkdownCanvasPage } from './canvas/MarkdownCanvasPage'
import { JournalListPage } from './views/JournalListPage'
import { FeedsPage } from './views/FeedsPage'
import { FeedDetailPage } from './pages/FeedDetailPage'
import { FeedItemPage } from './pages/FeedItemPage'
import { TextFilterStrip } from './views/queriable-list/TextFilterStrip'
import { CollectionsPage } from './views/CollectionsPage'
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc'
import { CanvasPage } from '@/panels/page-shells'
import { ChallengeHeaderBadge } from './components/molecules/ChallengeHeaderBadge'
import { OnboardingBanner } from './components/onboarding/OnboardingBanner'
import { getChallengeSectionMap } from './canvas/parseCanvasMarkdown'
// ── Extracted page components ────────────────────────────────────────────────
import { WallClockPage } from './pages/WallClockPage'
import { ReviewPage } from './pages/ReviewPage'
import { JournalPage } from './pages/JournalPage'
import { PlaygroundNotePage } from './pages/PlaygroundNotePage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { LoadZipPage } from './pages/LoadZipPage'
import { JournalZipLoadPage } from './pages/JournalZipLoadPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { EffortsCatalogPage } from './pages/EffortsCatalogPage'
import { EffortDetailPage } from './pages/EffortDetailPage'
import { Toaster } from '@/components/atoms/primitives/toaster'
import { PageActions } from './pages/shared/PageActions'
import { ActionsMenu } from './pages/shared/PageToolbar'
import { mapIndexToL3 } from './pages/shared/pageUtils'
import { PlaygroundRedirect } from './pages/PlaygroundRedirect'
import { EffortRegistryProvider } from './contexts/EffortRegistryContext'


// `workoutFiles` (raw glob) and `WorkoutItem` (typed item) live in `lib/workoutIndex`.
// `workoutFiles` is passed through to `MarkdownCanvasPage` as `wodFiles`; the typed
// `workoutItems` array is passed to leaves that filter/search it. Both are kept as
// props to leaf components — see `MarkdownCanvasPage.test.tsx` for the contract.
import { workoutFiles, useWorkoutItems, type WorkoutItem } from './lib/workoutIndex'
export type { WorkoutItem }

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

  const handleCreateJournalEntry = useCreateJournalEntry({ workoutItems })

  // Open the palette for global search (Ctrl+/ or search button)
  const openSearchPalette = useCallback(() => {
    usePaletteStore.getState().open({
      placeholder: 'Search workouts, results, pages…',
      sources: [globalSearchSource(workoutItems, canvasRoutes)],
    }).then(result => {
      if (result.dismissed) return
      const item = result.item
      if (item.type === 'route') {
        navigate((item.payload as { route: string }).route)
      } else if (item.type === 'workout') {
        handleSelectWorkout(item.payload as SelectWorkoutItem)
      } else if (item.type === 'journal-entry') {
        navigate(reviewPath(item.id))
      }
    })
  }, [workoutItems, handleSelectWorkout, navigate])

  // Keep the parent's searchHandlerRef up-to-date so the nav tree CallAction always
  // fires the latest callback (workoutItems may change after initial mount).
  useEffect(() => {
    searchHandlerRef.current = openSearchPalette
  }, [openSearchPalette, searchHandlerRef])

  // Keyboard shortcut: Ctrl/Cmd+/ (also Ctrl/Cmd+P) opens global search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
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
    journal: () => (
      <JournalListPage onSelect={handleSelectWorkout} onCreateEntry={handleCreateJournalEntry} workoutItems={workoutItems} />
    ),
    feeds: () => <FeedsPage />,
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
    collections: () => <CollectionsPage />,
    effortsCatalog: () => <EffortsCatalogPage />,
    effortDetail: () => <EffortDetailPage />,
    canvas: () => (
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
        onScrollToSection={scrollToSection}
        onSearch={openSearchPalette}
      />
    ),
  }

  const canvasTitleAccessory =
    view.page === 'canvas' && view.canvasPage
      ? (
        <>
          {view.canvasPage.quests.length > 0 && (
            <ChallengeHeaderBadge
              pageRoute={view.canvasPage.route}
              quests={view.canvasPage.quests}
              challengeSectionMap={getChallengeSectionMap(view.canvasPage)}
              onScrollToSection={scrollToSection}
            />
          )}
          {view.canvasPage.route === '/' && view.canvasPage.chapters.length > 0 && (
            <OnboardingBanner chapters={view.canvasPage.chapters} />
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
        onScrollToSection={view.shell.withIndex ? scrollToSection : undefined}
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
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
              {currentWorkout.name}
            </span>
            {canvasTitleAccessory}
          </div>
          <NavbarSpacer />
          <NavbarSection>
            <NavSearchInput onOpen={openSearchPalette} />
            <div className="flex items-center">
              <CastButtonRpc />
            </div>
            <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(currentNavLinks)} />
          </NavbarSection>
        </Navbar>
      }
      sidebar={<NavSidebar />}
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
// ScrollToTop — reset scroll position on route change
// ---------------------------------------------------------------------------

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

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
              <ScrollToTop />
              <Toaster />
              <NavProvider tree={navTree}>
                <Routes>
                  <Route path="/legacy" element={<PlaygroundLandingPage />} />
                  <Route path="/concept3" element={<Concept3LandingPage />} />
                  <Route path="/getting-started" element={<GettingStartedRedirect />} />
                  <Route path="/getting-started/*" element={<GettingStartedRedirect />} />
                  <Route path="/chapters/basics" element={<Navigate to="/guide/syntax/basics" replace />} />
                  <Route path="/chapters/sequences" element={<Navigate to="/guide/syntax" replace />} />
                  <Route path="/chapters/protocols" element={<Navigate to="/guide/syntax/protocols" replace />} />
                  <Route path="/challenge" element={<Navigate to="/" replace />} />
                  <Route path="/syntax" element={<SyntaxRedirect />} />
                  <Route path="/syntax/*" element={<SyntaxRedirect />} />
                  <Route path={ROUTE_PATTERNS.plan} element={<PlanRedirect />} />
                  <Route path={ROUTE_PATTERNS.feeds} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
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
                  <Route path={ROUTE_PATTERNS.run} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><WallClockPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.tracker} element={<TrackerRedirect />} />
                  <Route path={ROUTE_PATTERNS.review} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><ReviewPage /></Suspense>} />
                  <Route path="/workout/:category/:name" element={<WorkoutRedirect />} />
                  {canvasRoutes.map(({ route }) => (
                    <Route key={route} path={route} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  ))}
                  <Route path={ROUTE_PATTERNS.efforts} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.effort} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
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
