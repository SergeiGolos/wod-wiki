/**
 * App root — providers, the browser router, and the route table. Page
 * rendering lives in AppContent; per-route classification in
 * lib/routeView (see docs/adr/app-route-view.md).
 */
import { useMemo, useRef, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { NuqsAdapter } from 'nuqs/adapters/react-router'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { DebugModeProvider } from '@/contexts/DebugModeContext'
import { AudioProvider } from '@/contexts/AudioContext'
import { EffortRegistryProvider } from './contexts/EffortRegistryContext'
import { Toaster } from '@/components/atoms/primitives/toaster'
import { NavProvider, useNav } from './nav/NavContext'
import { buildAppNavTree } from './nav/appNavTree'
import { useCanvasRoutes } from './canvas/canvasRoutes'
import { AppContent } from './AppContent'
import { ROUTE_PATTERNS } from './lib/routes'
import {
  PlanRedirect,
  SyntaxRedirect,
  TrackerRedirect,
  ReviewRedirect,
  NotePlaygroundRedirect,
  WorkoutRedirect,
  CollectionItemRedirect,
  EffortRedirect,
  ResultsRedirect,
  SegmentsRedirect,
  ResultDetailRedirect,
  DashboardLandingRedirect,
  ExplorerRedirect,
} from './lib/routeRedirects'
import { DocumentTitleSync } from './lib/DocumentTitleSync'
import { PlaygroundLandingPage } from './pages/PlaygroundLandingPage'
import CalcAuthoringPrototypePage from './pages/CalcAuthoringPrototypePage'
import QueryBlockComposerPrototypePage from './pages/QueryBlockComposerPrototypePage'
import { CalcAuthoringPanel } from '@/components/organisms/calc-authoring/CalcAuthoringPanel'
import { LoadZipPage } from './pages/LoadZipPage'
import { JournalZipLoadPage } from './pages/JournalZipLoadPage'
import { WallClockPage } from './pages/WallClockPage'
import { StartPageGate } from './lib/startPage'
import { PlaygroundRedirect } from './pages/PlaygroundRedirect'
import { useZipProcessor } from './hooks/useZipProcessor'
import { useJournalZipProcessor } from './hooks/useJournalZipProcessor'
import { runSeedSync } from '@/services/seed/seedSync'
import { initSeedContentBroadcast } from '@/services/content/seedContent'
import type { WorkoutItem } from './lib/workoutIndex'

export type { WorkoutItem }

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

// Global bootstrap — zip-intake hooks and the default-on seed import
// (docs/prototypes/seed-data-unification.md); the seed broadcast refreshes
// every seed-content consumer. Opt out with
// localStorage['wodwiki.seedImport.enabled'] = '0'.
function GlobalState() {
  useZipProcessor()
  useJournalZipProcessor()
  useEffect(() => { void runSeedSync() }, [])
  return null
}


export function App() {
  // Stable ref so AppContent can inject its openSearchPalette callback after mount.
  const searchHandlerRef = useRef<() => void>(() => {})
  // Canvas routes hydrate from the seeded corpus; the nav tree and the
  // dynamic <Route> table re-derive when the seed lands or refreshes.
  const canvasRouteList = useCanvasRoutes()
  const navTree = useMemo(
    () => buildAppNavTree(() => searchHandlerRef.current(), canvasRouteList),
    [canvasRouteList],
  )

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
                  <Route path="/proto/query-block-composer" element={<QueryBlockComposerPrototypePage />} />

                  <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
                  <Route path="/settings/appearance" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path="/settings/system" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.settingsQueries} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path="/settings/library/calcs" element={<div className="p-6"><CalcAuthoringPanel /></div>} />
                  <Route path="/legacy" element={<PlaygroundLandingPage />} />
                  <Route path="/chapters/basics" element={<Navigate to="/p/syntax/basics" replace />} />
                  <Route path="/chapters/sequences" element={<Navigate to="/p/syntax" replace />} />
                  <Route path="/chapters/protocols" element={<Navigate to="/p/syntax/protocols" replace />} />
                  <Route path="/challenge" element={<Navigate to="/" replace />} />
                  <Route path="/syntax" element={<SyntaxRedirect />} />
                  <Route path="/syntax/*" element={<SyntaxRedirect />} />
                  <Route path={ROUTE_PATTERNS.plan} element={<PlanRedirect />} />
                  <Route path={ROUTE_PATTERNS.feeds} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feed} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feedDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.feedItem} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.collections} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  {/* /collections item paths redirect into the /c prefix (note UUIDs → /notes/:noteId). */}
                  <Route path="/collections/:slug" element={<CollectionItemRedirect />} />
                  <Route path="/collections/:slug/:target" element={<CollectionItemRedirect />} />
                  <Route path={ROUTE_PATTERNS.collection} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.collectionTarget} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.load} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><LoadZipPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournal} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><JournalZipLoadPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.loadJournalDate} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><JournalZipLoadPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.playgroundRoot} element={<PlaygroundRedirect />} />
                  <Route path={ROUTE_PATTERNS.playground} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.playgrounds} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.notePlaygroundAlias} element={<NotePlaygroundRedirect />} />
                  <Route path={ROUTE_PATTERNS.note} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journalNote} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journalEntry} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.noteById} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.journal} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.library} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.pages} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.run} element={<Suspense fallback={<div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>}><WallClockPage /></Suspense>} />
                  <Route path={ROUTE_PATTERNS.tracker} element={<TrackerRedirect />} />
                  {/* Sessions — execution telemetry streams and detail (#946, Ticket 005);
                      /results rebranded to /sessions with redirects. */}
                  <Route path="/results" element={<ResultsRedirect />} />
                  <Route path="/results/segments" element={<SegmentsRedirect />} />
                  <Route path="/results/:resultId" element={<ResultDetailRedirect />} />
                  <Route path={ROUTE_PATTERNS.sessions} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.sessionDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.sessionDate} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  {/* Retired review screens (#946, Ticket 005) — bookmarks land on the sessions family. */}
                  <Route path="/review/:runtimeId" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review/:sectionId" element={<ReviewRedirect />} />
                  <Route path="/note/:noteId/review/:sectionId/:resultId" element={<ReviewRedirect />} />
                  <Route path="/workout/:category/:name" element={<WorkoutRedirect />} />
                  <Route path={ROUTE_PATTERNS.efforts} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.effort} element={<EffortRedirect />} />
                  <Route path={ROUTE_PATTERNS.effortSlug} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  {/* Dashboards: /dashboards = list + WQL explorer, /dashboard/:slug = a
                      saved dashboard by id, /d/:slug = by page slug. Legacy
                      /dashboard and /analytics/* redirect here. */}
                  <Route path={ROUTE_PATTERNS.dashboard} element={<DashboardLandingRedirect />} />
                  <Route path={ROUTE_PATTERNS.dashboards} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.dashboardView} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.dashboardSlug} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                  <Route path={ROUTE_PATTERNS.analytics} element={<Navigate to="/dashboards" replace />} />
                  <Route path={ROUTE_PATTERNS.analyticsExplorer} element={<ExplorerRedirect />} />
                  {canvasRouteList.map(({ route }) => (
                    <Route
                      key={route}
                      path={route}
                      element={route === ROUTE_PATTERNS.home ? (
                        <StartPageGate>
                          <AppContent searchHandlerRef={searchHandlerRef} />
                        </StartPageGate>
                      ) : (
                        <AppContent searchHandlerRef={searchHandlerRef} />
                      )}
                    />
                  ))}
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


