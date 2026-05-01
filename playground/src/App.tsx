import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { SidebarLayout } from '@/components/playground/sidebar-layout'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/playground/navbar'
import { NavProvider } from './nav/NavContext'
import { useNav } from './nav/NavContext'
import { NavSidebar } from './nav/NavSidebar'
import { buildAppNavTree } from './nav/appNavTree'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { AudioProvider } from '@/components/audio/AudioContext'
import { CommandProvider } from '@/components/command-palette/CommandContext'
import { useCommandPalette } from '@/components/command-palette/CommandContext'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { HomeView } from './views/HomeView'
import { findCanvasPage, canvasRoutes } from './canvas/canvasRoutes'
import { MarkdownCanvasPage } from './canvas/MarkdownCanvasPage'
import { JournalWeeklyPage } from './views/ListViews'
import { TextFilterStrip } from './views/queriable-list/TextFilterStrip'
import { CollectionsPage } from './views/CollectionsPage'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { CanvasPage } from '@/panels/page-shells'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import { playgroundDB, PlaygroundDBService } from './services/playgroundDB'
import { indexedDBService } from '@/services/db/IndexedDBService'
import type { WorkoutResult } from '@/types/storage'
import { EditorView } from '@codemirror/view'
import newPlaygroundTemplate from './templates/new-playground.md?raw'
import { 
  createStatementBuilderStrategy,
  createGlobalSearchStrategy,
} from './services/commandStrategies'
// ── Extracted page components ────────────────────────────────────────────────
import { TrackerPage } from './pages/TrackerPage'
import { ReviewPage } from './pages/ReviewPage'
import { JournalPage } from './pages/JournalPage'
import { PlaygroundNotePage } from './pages/PlaygroundNotePage'
import { WorkoutEditorPage } from './pages/WorkoutEditorPage'
import { LoadZipPage } from './pages/LoadZipPage'
// ── Toast ────────────────────────────────────────────────────────────────────
import { Toaster } from '@/components/ui/toaster'
// ── Shared page utilities ────────────────────────────────────────────────────
import { NewEntryButton, ThemeSwitcher, ActionsMenu } from './pages/shared/PageToolbar'
import { NotePageActions } from './pages/shared/NotePageActions'
import { mapIndexToL3, applyTemplate } from './pages/shared/pageUtils'
import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay'

// ── Constants for Sidebar Navigation ────────────────────────────────

const ZERO_TO_HERO_LINKS = [
  { id: 'introduction', label: 'Introduction', type: 'heading' as const },
  { id: 'statement', label: 'First Statement', type: 'heading' as const },
  { id: 'timer', label: 'Timers', type: 'heading' as const },
  { id: 'metrics', label: 'Metrics', type: 'heading' as const },
  { id: 'groups', label: 'Groups', type: 'heading' as const },
  { id: 'protocols', label: 'Protocols', type: 'heading' as const },
  { id: 'notebook', label: 'Notebook', type: 'heading' as const },
]

const SYNTAX_LINKS = [
  { id: 'introduction', label: 'Introduction', type: 'heading' as const },
  { id: 'anatomy', label: 'Statement Anatomy', type: 'heading' as const },
  { id: 'timers', label: 'Timers & Direction', type: 'heading' as const },
  { id: 'metrics', label: 'Measuring Effort', type: 'heading' as const },
  { id: 'groups', label: 'Groups & Repeaters', type: 'heading' as const },
  { id: 'protocols', label: 'Protocols', type: 'heading' as const },
  { id: 'supplemental', label: 'Supplemental', type: 'heading' as const },
  { id: 'document', label: 'Document', type: 'heading' as const },
]

const PLAYGROUND_TEMPLATE = applyTemplate(newPlaygroundTemplate)

// Load all markdown files from the markdown directory
const workoutFiles = import.meta.glob('../../markdown/**/*.md', { eager: true, query: '?raw', import: 'default' })

export interface WorkoutItem {
  id: string
  name: string
  category: string
  content: string
  /** When true, this item is excluded from all search results (front matter: `search: hidden`) */
  searchHidden?: boolean
}


const MAX_TIMESTAMP_ID_RETRIES = 10

/**
 * Atomically create a new playground page.
 *
 * Tries `baseName`, then `baseName-1` … `baseName-N`. Each attempt uses
 * IndexedDB `add()` (via `addPage`), which throws a `ConstraintError` if the
 * key already exists — making the check-and-create race-free even when two
 * tabs open simultaneously.
 *
 * Returns the ID that was successfully written.
 */
async function createPlaygroundPage(content: string): Promise<string> {
  const baseName = formatPlaygroundTimestampId(Date.now())
  const now = Date.now()
  for (let attempt = 0; attempt <= MAX_TIMESTAMP_ID_RETRIES; attempt++) {
    const name = attempt === 0 ? baseName : `${baseName}-${attempt}`
    const pageId = PlaygroundDBService.pageId('playground', name)
    try {
      await playgroundDB.addPage({
        id: pageId,
        category: 'playground',
        name,
        content,
        updatedAt: now,
      })
      return name
    } catch (err) {
      if (err instanceof DOMException && err.name === 'ConstraintError') continue
      throw err
    }
  }
  throw new Error('Unable to allocate unique playground timestamp ID')
}

function PlaygroundRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const id = await createPlaygroundPage(PLAYGROUND_TEMPLATE.content)
      navigate(`/playground/${encodeURIComponent(id)}`, { replace: true })
    })()
  }, [navigate])

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Creating…
    </div>
  )
}

function AppContent({ searchHandlerRef }: { searchHandlerRef: MutableRefObject<() => void> }) {
  const navigate = useNavigate()
  const { category: urlCategory, name: urlName, id: playgroundId } = useParams<{ category: string; name: string; id: string }>()
  const location = useLocation()
  
  const { isOpen: isCommandPaletteOpen, setIsOpen: setIsCommandPaletteOpen, setStrategy } = useCommandPalette()
  const { theme } = useTheme()
  const [activeCategory, setActiveCategory] = useQueryState('cat')
  const [recentResults, setRecentResults] = useState<WorkoutResult[]>([])

  // Unified note route: /note/playground/:name behaves like /playground/:name
  const isNotePlayground = location.pathname.startsWith('/note/playground/')
  const isPlaygroundRoute = location.pathname.startsWith('/playground/') || isNotePlayground
  // For /note/playground/:name, use urlName as the playground ID
  const effectivePlaygroundId = playgroundId || (isNotePlayground ? urlName : undefined)
  // Journal entry route: /journal/:id  — note: the route param is :id → playgroundId
  const isJournalEntryRoute = location.pathname.startsWith('/journal/') && (!!urlName || !!playgroundId)
  const journalEntryId = isJournalEntryRoute ? decodeURIComponent(urlName ?? playgroundId!) : undefined

  const workoutItems = useMemo(() => {
    return Object.entries(workoutFiles).map(([path, fileContent]) => {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1].replace('.md', '')
      
      // Path format: ../../markdown/{collections|canvas}/{category}/{file}.md
      // or ../../markdown/{collections|canvas}/{file}.md
      let category = 'General'
      const markdownIdx = parts.indexOf('markdown')
      if (markdownIdx !== -1 && parts.length > markdownIdx + 2) {
        category = parts[markdownIdx + 2]
      }

      // Parse front matter to check for `search: hidden`
      const raw = fileContent as string
      let searchHidden = false
      const fmMatch = raw.match(/^---[\r\n]([\s\S]*?)[\r\n]---/)
      if (fmMatch) {
        const searchLine = fmMatch[1].match(/^search:\s*(\S+)/m)
        if (searchLine && searchLine[1].toLowerCase() === 'hidden') {
          searchHidden = true
        }
      }

      return {
        id: path,
        name: fileName,
        category: category,
        content: raw,
        searchHidden,
      }
    })
  }, [workoutFiles])

  // Canvas page for the current pathname (null if not a canvas route)
  const canvasPage = findCanvasPage(location.pathname)

  // Find current content based on URL
  const currentWorkout = useMemo(() => {
    if (isPlaygroundRoute) {
      return { name: 'Playground', content: '', category: 'playground' }
    }
    if (isJournalEntryRoute && journalEntryId) {
      return { name: journalEntryId, content: '', category: 'journal' }
    }
    if (canvasPage) {
      return { name: canvasPage.sections[0]?.heading ?? 'Canvas', content: '', category: 'canvas' }
    }
    // Named routes without params
    const named: Record<string, string> = {
      '/': 'Home',
      '/journal': 'Journal',
      '/getting-started': 'Zero to Hero',
      '/syntax': 'Syntax',
      '/collections': 'Collections',
    }
    const namedMatch = named[location.pathname]
    if (namedMatch) {
      return { name: namedMatch, content: PLAYGROUND_CONTENT, category: 'General' }
    }
    if (!urlName) {
      return { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
    }
    const name = decodeURIComponent(urlName)
    const category = urlCategory ? decodeURIComponent(urlCategory) : 'General'
    return workoutItems.find(item => item.name === name && item.category === category) || { name, content: PLAYGROUND_CONTENT, category: 'General' }
  }, [urlCategory, urlName, workoutItems, location.pathname, isPlaygroundRoute, isJournalEntryRoute, journalEntryId])

  // Load recent workout results from IndexedDB
  const refreshResults = useCallback(() => {
    indexedDBService.getRecentResults(20).then(results => {
      setRecentResults(results)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    refreshResults()
  }, [location.pathname, refreshResults])

  const handleSelectWorkout = useCallback((item: any) => {
    const workout = item as { name: string; category?: string; content?: string }
    if (workout.name === 'Home') {
      navigate('/')
    } else {
      const category = workout.category || 'General'
      navigate(`/workout/${encodeURIComponent(category)}/${encodeURIComponent(workout.name)}`)
    }
  }, [navigate])

  // Nav links for the current page (used in the sticky header dropdown)
  const currentNavLinks = useMemo((): PageNavLink[] => {
    // 1. Canvas pages (including Home)
    if (canvasPage) {
      const isCollection = location.pathname.startsWith('/collections/')
      const collectionSlug = isCollection ? location.pathname.split('/').pop() : null
      
      const links: PageNavLink[] = []
      canvasPage.sections
        .filter(s => s.level > 1)
        .forEach(s => {
          links.push({ id: s.id, label: s.heading, type: 'heading' as const })

          // Extract standard WOD blocks from prose
          const lines = s.prose.split('\n')
          let wodCount = 0
          lines.forEach((line, i) => {
            if (/^```(wod|log|plan)\s*$/.test(line.trim())) {
              wodCount++
              // Standard canvas WOD blocks don't have a direct 'onRun' handler in the index
              // yet, because MarkdownCanvasPage manages its own runtime state.
              // However, we can identify them so the UI can at least show the icon
              // or we can add a handler if we have access to the blocks.
              links.push({ 
                id: `${s.id}-wod-${i + 1}`, 
                label: `Workout ${wodCount}`, 
                type: 'wod' as const 
              })
            }
          })
          
          if (isCollection && collectionSlug && s.prose.includes('{{workouts}}')) {
             const collectionItems = workoutItems.filter(item => 
               item.category === collectionSlug && item.name.toLowerCase() !== 'readme'
             )
             collectionItems.forEach(item => {
               links.push({
                 id: `workout-${item.id}`,
                 label: item.name,
                 type: 'wod' as const,
                 onRun: () => handleSelectWorkout(item),
                 runIcon: 'link' as const
               })
             })
          }
        })
        
        // Fallback: if it's a collection but no section has the {{workouts}} tag,
        // we might still want to list them if they are appended at the bottom.
        const hasWorkoutsTag = canvasPage.sections.some(s => s.prose.includes('{{workouts}}'))
        if (isCollection && collectionSlug && !hasWorkoutsTag) {
          links.push({ id: 'collection-workouts', label: 'Explore', type: 'heading' as const })
          const collectionItems = workoutItems.filter(item => 
            item.category === collectionSlug && item.name.toLowerCase() !== 'readme'
          )
          collectionItems.forEach(item => {
            links.push({
              id: `workout-${item.id}`,
              label: item.name,
              type: 'wod' as const,
              onRun: () => handleSelectWorkout(item),
              runIcon: 'link' as const
            })
          })
        }
      return links
    }

    // 2. Docs pages
    if (location.pathname === '/getting-started') return ZERO_TO_HERO_LINKS
    if (location.pathname === '/syntax') return SYNTAX_LINKS
    
    // 3. Journal list page
    if (location.pathname === '/journal') {
      const dates = new Set<string>()
      recentResults.forEach(r => {
        const d = new Date(r.completedAt).toISOString().split('T')[0]
        dates.add(d)
      })
      workoutItems.forEach(item => {
        const d = (item as any).payload?.targetDate || (item as any).payload?.updatedAt
        if (d) {
          const ds = new Date(d).toISOString().split('T')[0]
          dates.add(ds)
        }
      })
      const sorted = Array.from(dates).sort().reverse()
      return sorted.slice(0, 10).map(d => ({
        id: d,
        label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        type: 'heading' as const
      }))
    }

    return []
  }, [location.pathname, canvasPage, recentResults, workoutItems, handleSelectWorkout])

  /**
   * Navigate to a journal entry for the given date.
   * If a page already exists for that date, opens it. If not, the JournalPageShell
   * creates a new entry. No conflict dialog needed from the scroll view.
   */
  const handleCreateJournalEntry = useCallback((date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    navigate(`/journal/${y}-${m}-${d}`)
  }, [navigate])

  // Open the command palette with the global search strategy
  const openSearchPalette = useCallback(() => {
    const strategy = createGlobalSearchStrategy(workoutItems, handleSelectWorkout, navigate, canvasRoutes)
    setStrategy(strategy)
    setIsCommandPaletteOpen(true)
  }, [workoutItems, handleSelectWorkout, setStrategy, setIsCommandPaletteOpen])

  // Open palette in "load into home editor" mode — selection injects content,
  // does NOT navigate. onContentSelected receives the raw markdown string.
  const openHomePalette = useCallback((onContentSelected: (content: string) => void) => {
    const strategy = createGlobalSearchStrategy(
      workoutItems,
      (item: any) => {
        // Resolve raw markdown content from the item
        const content: string =
          item.content ?? item.markdown ?? item.source ?? item.description ?? ''
        onContentSelected(content)
        setIsCommandPaletteOpen(false)
      },
      navigate,
      canvasRoutes,
    )
    setStrategy(strategy)
    setIsCommandPaletteOpen(true)
  }, [workoutItems, navigate, canvasRoutes, setStrategy, setIsCommandPaletteOpen])

  // Keep the parent's searchHandlerRef up-to-date so the nav tree CallAction always
  // fires the latest callback (workoutItems may change after initial mount).
  useEffect(() => {
    searchHandlerRef.current = openSearchPalette
  }, [openSearchPalette, searchHandlerRef])

  // Reset strategy when palette closes
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      // Small delay to avoid visual jump during close animation
      const t = setTimeout(() => setStrategy(null), 300)
      return () => clearTimeout(t)
    }
  }, [isCommandPaletteOpen, setStrategy])

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Global Search
      if ((e.key === 'k' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        openSearchPalette()
      }
      // Ctrl/Cmd + .: Statement Builder (Interactive Segments)
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        
        const line = "10 Kettlebell Swings 24kg"
        const segments = ["10", "Kettlebell Swings", "24kg"]
        
        const strategy = createStatementBuilderStrategy({
          line,
          segments,
          activeSegmentIndex: 0,
          onModifyLine: (newLine) => console.log('Modify line to:', newLine),
          updateStrategy: (newStrategy) => setStrategy(newStrategy)
        })
        
        setStrategy(strategy)
        setIsCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [openSearchPalette, setStrategy, setIsCommandPaletteOpen])

  const [isSystemDark, setIsSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // ── NavContext integration ────────────────────────────────────────────────
  const { setL3Items, registerScrollFn, dispatch: navDispatch } = useNav()

  const editorViewRef = useRef<EditorView | null>(null)
  const handleViewCreated = useCallback((view: EditorView) => {
    editorViewRef.current = view
  }, [])

  const scrollToSection = useCallback((id: string) => {
    // 1. Try standard DOM element (Canvas/List pages)
    //    Use scrollIntoView so the browser finds the correct scroll container
    //    (works inside nested flex layouts like HomeView > CanvasPage).
    const el = document.getElementById(id)
    if (el) {
      // Apply a temporary scroll-margin so the sticky header is not covered.
      const prev = el.style.scrollMarginTop
      el.style.scrollMarginTop = '96px'
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Restore after animation frame so the style doesn't persist.
      requestAnimationFrame(() => { el.style.scrollMarginTop = prev })
      return
    }

    // 2. Try CodeMirror line (Editor pages)
    if (editorViewRef.current) {
      const view = editorViewRef.current
      const content = view.state.doc.toString()
      const lines = content.split('\n')
      
      let lineIdx = -1

      if (id.startsWith('wod-line-')) {
        const lineNum = parseInt(id.replace('wod-line-', ''), 10)
        lineIdx = lineNum - 1
      } else {
        lineIdx = lines.findIndex(line => {
          const match = line.match(/^(#{1,6})\s+(.*)$/)
          if (match) {
            let label = match[2].trim()
            const timeMatch = label.match(/(\d{1,2}:\d{2})/)
            if (timeMatch) {
              const timestamp = timeMatch[1]
              label = label.replace(timestamp, '').replace(/\s+/g, ' ').trim()
              if (!label) label = timestamp
            }
            const headerId = label.toLowerCase().replace(/[^\w]+/g, '-')
            return headerId === id
          }
          return false
        })
      }

      if (lineIdx >= 0 && lineIdx < lines.length) {
        const pos = view.state.doc.line(lineIdx + 1).from
        view.dispatch({
          selection: { anchor: pos, head: pos },
          effects: [EditorView.scrollIntoView(pos, { y: 'start', yMargin: 20 })]
        })
        // Also scroll the window to the editor's container if needed
        const editorEl = view.dom.parentElement
        if (editorEl) {
          const y = editorEl.getBoundingClientRect().top + window.scrollY - 120
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }
    }
  }, [])

  // Register the scroll function with NavContext so NavSidebar L3 clicks scroll correctly
  useEffect(() => {
    registerScrollFn(scrollToSection)
  }, [scrollToSection, registerScrollFn])

  // Track scroll position to keep NavContext activeL3Id in sync
  useEffect(() => {
    if (currentNavLinks.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        let bestId: string | null = null
        let bestRatio = -1
        entries.forEach(e => {
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio
            bestId = e.target.id
          }
        })
        if (bestId) navDispatch({ type: 'SET_ACTIVE_L3', id: bestId })
      },
      { rootMargin: '-10% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    currentNavLinks.forEach(link => {
      const el = document.getElementById(link.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [currentNavLinks, navDispatch])

  // Sync currentNavLinks → NavContext L3 items (feeds sidebar accordion + right panel)
  useEffect(() => {
    setL3Items(mapIndexToL3(currentNavLinks))
  }, [currentNavLinks, setL3Items])

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

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
              {currentWorkout.name}
            </span>
          </div>
          <NavbarSpacer />
          <NavbarSection>
            <NewEntryButton />
            <NavbarItem onClick={openSearchPalette} aria-label="Search">
              <MagnifyingGlassIcon data-slot="icon" />
            </NavbarItem>
            <div className="flex items-center">
              <CastButtonRpc />
              <AudioToggle />
              <ThemeSwitcher />
            </div>
            <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(currentNavLinks)} />
          </NavbarSection>
        </Navbar>
      }
      sidebar={<NavSidebar />}
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="flex-1 flex flex-col min-h-0">
          {location.pathname === '/' || location.pathname === '' ? (
            <CanvasPage title="WOD Wiki" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<NotePageActions currentWorkout={currentWorkout} index={currentNavLinks} />}>
              <HomeView
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
                onOpenHomePalette={openHomePalette}
              />
            </CanvasPage>
          ) : location.pathname === '/journal' ? (
            <CanvasPage title="Journal" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<NotePageActions currentWorkout={currentWorkout} index={currentNavLinks} />}>
              <JournalWeeklyPage 
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
                onCreateEntry={handleCreateJournalEntry}
              />
            </CanvasPage>
          ) : location.pathname === '/collections' ? (
            <CanvasPage title="Collections" subheader={<TextFilterStrip placeholder="Filter collections…" />} actions={<NotePageActions currentWorkout={currentWorkout} index={currentNavLinks} />}>
              <CollectionsPage />
            </CanvasPage>
          ) : canvasPage ? (
            <CanvasPage title={currentWorkout.name} index={currentNavLinks} onScrollToSection={scrollToSection} actions={<NotePageActions currentWorkout={currentWorkout} index={currentNavLinks} />}>
              <MarkdownCanvasPage
                page={canvasPage}
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </CanvasPage>
          ) : (
            <>
              {isPlaygroundRoute && effectivePlaygroundId ? (
                <PlaygroundNotePage key={effectivePlaygroundId} theme={actualTheme} onViewCreated={handleViewCreated} onScrollToSection={scrollToSection} />
              ) : isJournalEntryRoute && journalEntryId ? (
                <JournalPage key={journalEntryId} theme={actualTheme} onViewCreated={handleViewCreated} onScrollToSection={scrollToSection} />
              ) : (
                <WorkoutEditorPage
                  key={`${currentWorkout.category}/${currentWorkout.name}`}
                  category={currentWorkout.category}
                  name={currentWorkout.name}
                  mdContent={currentWorkout.content}
                  theme={actualTheme}
                  onViewCreated={handleViewCreated}
                  onScrollToSection={scrollToSection}
                />
              )}
            </>
          )}
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={handleSelectWorkout}
        initialCategory={activeCategory}
      />
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
import { useQueryState } from 'nuqs'
import { useZipProcessor } from './hooks/useZipProcessor'

function GlobalState() {
  useZipProcessor()
  return null
}

export function App() {
  // Stable ref so AppContent can inject its openSearchPalette callback after mount.
  // The nav tree is built once; the search item calls the ref's current value.
  const searchHandlerRef = useRef<() => void>(() => {})
  const navTree = useMemo(() => buildAppNavTree(() => searchHandlerRef.current()), [])

  return (
    <ThemeProvider defaultTheme="system" storageKey="wod-wiki-playground-theme">
      <AudioProvider>
        <BrowserRouter>
          <NuqsAdapter>
            <GlobalState />
            <ScrollToTop />
            <Toaster />
            <CommandProvider>
              <NavProvider tree={navTree}>
              <Routes>
                <Route path="/" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/getting-started" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/syntax" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/journal" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/collections" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/collections/:slug" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/workout/:category/:name" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/load" element={<LoadZipPage />} />
                <Route path="/playground" element={<PlaygroundRedirect />} />
                <Route path="/playground/:id" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/note/:category/:name" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/journal/:id" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
                <Route path="/tracker/:runtimeId" element={<TrackerPage />} />
                <Route path="/review/:runtimeId" element={<ReviewPage />} />
                <Route path="*" element={<AppContent searchHandlerRef={searchHandlerRef} />} />
              </Routes>
              </NavProvider>
            </CommandProvider>
          </NuqsAdapter>
        </BrowserRouter>
      </AudioProvider>
    </ThemeProvider>
  )
}

export default App
