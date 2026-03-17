import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Avatar } from '@/components/playground/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/playground/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/playground/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/playground/sidebar'
import { SidebarAccordion } from '@/components/playground/SidebarAccordion'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import { SidebarLayout } from '@/components/playground/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import {
  Cog6ToothIcon,
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
  CodeBracketIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  RectangleStackIcon,
  BeakerIcon,
  CircleStackIcon,
  CommandLineIcon,
  DocumentTextIcon,
  FolderIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
  ArrowPathIcon,
  TableCellsIcon,
} from '@heroicons/react/20/solid'
import type { WorkoutResult } from '@/types/storage'

import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { CommandProvider } from '@/components/command-palette/CommandContext'
import { useCommandPalette } from '@/components/command-palette/CommandContext'
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { HomePageContent } from './HomePage'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { usePlaygroundContent } from './hooks/usePlaygroundContent'
import { playgroundDB, PlaygroundDBService } from './services/playgroundDB'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { decodeZip } from './services/decodeZip'
import { v4 as uuidv4 } from 'uuid'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import newPlaygroundTemplate from './templates/new-playground.md?raw'

const CURSOR_TOKEN = '$CURSOR'

/** Strip the $CURSOR token and return { content, cursorOffset }. */
function applyTemplate(raw: string): { content: string; cursorOffset: number } {
  const idx = raw.indexOf(CURSOR_TOKEN)
  if (idx === -1) return { content: raw, cursorOffset: raw.length }
  return {
    content: raw.slice(0, idx) + raw.slice(idx + CURSOR_TOKEN.length),
    cursorOffset: idx,
  }
}

const PLAYGROUND_TEMPLATE = applyTemplate(newPlaygroundTemplate)

// Load all markdown files from the wod directory
const workoutFiles = import.meta.glob('../../wod/**/*.md', { eager: true, query: '?raw', import: 'default' })

interface WorkoutItem {
  id: string
  name: string
  category: string
  content: string
}

/**
 * Wrapper that loads workout content via IndexedDB (or falls back to MD).
 * Keeps WodBlock IDs stable across page loads so results stay linked.
 */
function WorkoutEditorPage({
  category,
  name,
  mdContent,
  theme,
}: {
  category: string
  name: string
  mdContent: string
  theme: string
}) {
  const noteId = PlaygroundDBService.pageId(category, name)
  const { content, loading, onChange } = usePlaygroundContent({ category, name, mdContent })

  const handleCompleteWorkout = React.useCallback(
    (blockId: string, results: any) => {
      if (!results) return
      const result = {
        id: uuidv4(),
        noteId,
        segmentId: blockId,
        sectionId: blockId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }
      indexedDBService.saveResult(result).catch(() => {
        // IndexedDB unavailable — silently ignore
      })
    },
    [noteId],
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <UnifiedEditor
      value={content}
      onChange={onChange}
      noteId={noteId}
      onCompleteWorkout={handleCompleteWorkout}
      visibleCommands={2}
      className="flex-1 min-h-0 w-full"
      theme={theme}
    />
  )
}

// ---------------------------------------------------------------------------
// #/load?zip=<base64> — decode zip, save as page, redirect to playground
// ---------------------------------------------------------------------------

function LoadZipPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const zip = searchParams.get('zip') || searchParams.get('z')
    if (!zip) {
      // No zip param — just create an empty playground page
      navigate('/playground', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const content = await decodeZip(zip)
        if (cancelled) return
        const id = uuidv4()
        const now = Date.now()
        const pageId = PlaygroundDBService.pageId('playground', id)
        await playgroundDB.savePage({
          id: pageId,
          category: 'playground',
          name: id,
          content,
          updatedAt: now,
        })
        navigate(`/playground/${id}`, { replace: true })
      } catch {
        if (!cancelled) setError('Failed to decode the shared link.')
      }
    })()
    return () => { cancelled = true }
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Loading…
    </div>
  )
}

// ---------------------------------------------------------------------------
// #/playground (no id) — create empty page and redirect
// ---------------------------------------------------------------------------

function PlaygroundRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const id = uuidv4()
    const now = Date.now()
    const pageId = PlaygroundDBService.pageId('playground', id)
    playgroundDB.savePage({
      id: pageId,
      category: 'playground',
      name: id,
      content: PLAYGROUND_TEMPLATE.content,
      updatedAt: now,
    }).then(() => {
      navigate(`/playground/${id}`, { replace: true })
    })
  }, [navigate])

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Creating…
    </div>
  )
}

// ---------------------------------------------------------------------------
// #/playground/:id — load page by UUID from DB, render in editor
// ---------------------------------------------------------------------------

function PlaygroundNotePage({ theme }: { theme: string }) {
  const { id } = useParams<{ id: string }>()
  const noteId = id!
  const { content, loading, onChange } = usePlaygroundContent({
    category: 'playground',
    name: noteId,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  // Place cursor at the $CURSOR token position on first mount
  const cursorPlaced = useRef(false)
  const handleViewCreated = useCallback((view: EditorView) => {
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(PLAYGROUND_TEMPLATE.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [])

  const handleCompleteWorkout = useCallback(
    (blockId: string, results: any) => {
      if (!results) return
      indexedDBService.saveResult({
        id: uuidv4(),
        noteId,
        segmentId: blockId,
        sectionId: blockId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }).catch(() => {})
    },
    [noteId],
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <UnifiedEditor
      value={content}
      onChange={onChange}
      noteId={noteId}
      onCompleteWorkout={handleCompleteWorkout}
      onViewCreated={handleViewCreated}
      visibleCommands={2}
      className="flex-1 min-h-0 w-full"
      theme={theme}
    />
  )
}

function AppContent() {
  const navigate = useNavigate()
  const { category: urlCategory, name: urlName, id: playgroundId } = useParams<{ category: string; name: string; id: string }>()
  const location = useLocation()
  
  const { isOpen: isCommandPaletteOpen, setIsOpen: setIsCommandPaletteOpen } = useCommandPalette()
  const { theme } = useTheme()
  const [recentPages, setRecentPages] = useState<string[]>(['Home'])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [recentResults, setRecentResults] = useState<WorkoutResult[]>([])
  const [reviewSegments, setReviewSegments] = useState<Segment[] | null>(null)
  const [reviewTitle, setReviewTitle] = useState<string>('Workout Review')

  const isPlaygroundRoute = location.pathname.startsWith('/playground/')

  const workoutItems = useMemo(() => {
    return Object.entries(workoutFiles).map(([path, fileContent]) => {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1].replace('.md', '')
      const category = parts[parts.length - 2] === 'wod' ? 'General' : parts[parts.length - 2]
      return {
        id: path,
        name: fileName,
        category: category,
        content: fileContent as string,
      }
    })
  }, [])

  // Find current content based on URL
  const currentWorkout = useMemo(() => {
    if (isPlaygroundRoute) {
      return { name: 'Playground', content: '', category: 'playground' }
    }
    if (location.pathname === '/' || !urlName) {
      return { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
    }
    
    const name = decodeURIComponent(urlName)
    const category = urlCategory ? decodeURIComponent(urlCategory) : 'General'
    
    return workoutItems.find(item => item.name === name && item.category === category) || { name: 'Home', content: PLAYGROUND_CONTENT, category: 'General' }
  }, [urlCategory, urlName, workoutItems, location.pathname, isPlaygroundRoute])

  const collections = useMemo(() => {
    const categories = Array.from(new Set(workoutItems.map(item => item.category)))
    
    const groups = {
      Kettlebell: [
        'kettlebell', 'dan-john', 'geoff-neupert', 'girevoy-sport', 
        'joe-daniels', 'keith-weber', 'mark-wildman', 'steve-cotter', 'strongfirst'
      ],
      Crossfit: [
        'crossfit-games', 'crossfit-girls'
      ],
      Swimming: [
        'pre-hishschool', 'highschool', 'college', 'post-college', 
        'masters', 'olympic', 'triathlete'
      ],
      Other: [
        'unconventional'
      ]
    }

    return {
      Kettlebell: groups.Kettlebell.filter(c => categories.includes(c)),
      Crossfit: groups.Crossfit.filter(c => categories.includes(c)),
      Swimming: groups.Swimming.filter(c => categories.includes(c)),
      Other: groups.Other.filter(c => categories.includes(c))
    }
  }, [workoutItems])

  // Update recent pages whenever currentWorkout changes
  useEffect(() => {
    setRecentPages(prev => {
      const filtered = prev.filter(name => name !== currentWorkout.name)
      return [currentWorkout.name, ...filtered].slice(0, 5)
    })
  }, [currentWorkout.name])

  // Load recent workout results from IndexedDB
  useEffect(() => {
    let cancelled = false
    indexedDBService.getRecentResults(20).then(results => {
      if (!cancelled) setRecentResults(results)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])

  const handleSelectWorkout = (item: any) => {
    const workout = item as { name: string; category?: string; content?: string }
    if (workout.name === 'Home') {
      navigate('/')
    } else {
      const category = workout.category || 'General'
      navigate(`/workout/${encodeURIComponent(category)}/${encodeURIComponent(workout.name)}`)
    }
  }

  const handleCollectionClick = (category: string) => {
    setActiveCategory(category)
    setIsCommandPaletteOpen(true)
  }

  const handleSearchClick = () => {
    setActiveCategory(null)
    setIsCommandPaletteOpen(true)
  }

  const handleResetData = async () => {
    localStorage.clear()
    await playgroundDB.clearAll()
    window.location.reload()
  }

  const handleDownload = () => {
    const blob = new Blob([currentWorkout.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentWorkout.name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setActiveCategory(null)
        setIsCommandPaletteOpen(!isCommandPaletteOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setIsCommandPaletteOpen, isCommandPaletteOpen])

  const actualTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs'
    }
    return theme === 'dark' ? 'vs-dark' : 'vs'
  }, [theme])

  const ActionsMenu = () => (
    <Dropdown>
      <DropdownButton plain>
        <EllipsisVerticalIcon data-slot="icon" className="size-5 text-zinc-500" />
      </DropdownButton>
      <DropdownMenu className="min-w-48" anchor="bottom end">
        <DropdownItem onClick={handleDownload}>
          <ArrowDownTrayIcon data-slot="icon" />
          <DropdownLabel>Download Markdown</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="#/debug">
          <BugAntIcon data-slot="icon" />
          <DropdownLabel>Toggle Debug Mode</DropdownLabel>
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={handleResetData}>
          <ArrowPathIcon data-slot="icon" className="text-red-500" />
          <DropdownLabel className="text-red-500">Reset & Clear Cache</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <div className="flex items-center gap-3 lg:hidden truncate">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
              {currentWorkout.name}
            </span>
          </div>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem onClick={handleSearchClick} aria-label="Search">
              <MagnifyingGlassIcon data-slot="icon" />
              <kbd className="ml-auto hidden font-sans text-xs text-zinc-400 group-data-[hover]:text-zinc-500 lg:inline dark:text-zinc-500 dark:group-data-[hover]:text-zinc-400">
                <abbr title="Control" className="no-underline">
                  Ctrl
                </abbr>{' '}
                K
              </kbd>
            </NavbarItem>
            <div className="lg:hidden">
              <CastButtonRpc />
            </div>
            <NavbarItem href="/inbox" className="max-lg:hidden" aria-label="Inbox">
              <InboxIcon data-slot="icon" />
            </NavbarItem>
            <div className="lg:hidden">
              <ActionsMenu />
            </div>
            <div className="max-lg:hidden">
              <Dropdown>
                <DropdownButton as={NavbarItem}>
                  <Avatar initials="S" square className="bg-zinc-500 text-white" />
                </DropdownButton>
                <DropdownMenu className="min-w-64" anchor="bottom end">
                  <DropdownItem href="/my-profile">
                    <UserIcon data-slot="icon" />
                    <DropdownLabel>My profile</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem href="/settings">
                    <Cog8ToothIcon data-slot="icon" />
                    <DropdownLabel>Settings</DropdownLabel>
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem href="/privacy-policy">
                    <ShieldCheckIcon data-slot="icon" />
                    <DropdownLabel>Privacy policy</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem href="/share-feedback">
                    <LightBulbIcon data-slot="icon" />
                    <DropdownLabel>Share feedback</DropdownLabel>
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem href="/logout">
                    <ArrowRightStartOnRectangleIcon data-slot="icon" />
                    <DropdownLabel>Sign out</DropdownLabel>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center px-2 py-2.5">
              <Avatar initials="W" className="bg-blue-600 text-white size-6" />
              <span className="ml-3 text-sm font-semibold text-zinc-950 dark:text-white">Wod Wiki</span>
            </div>
            <SidebarSection>
              <SidebarItem onClick={() => navigate('/')} current={location.pathname === '/'}>
                <HomeIcon data-slot="icon" />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={handleSearchClick}>
                <MagnifyingGlassIcon data-slot="icon" />
                <SidebarLabel>Search</SidebarLabel>
                <kbd className="ml-auto hidden font-sans text-xs text-zinc-400 group-data-[hover]:text-zinc-500 lg:inline dark:text-zinc-500 dark:group-data-[hover]:text-zinc-400">
                  <abbr title="Control" className="no-underline">
                    Ctrl
                  </abbr>{' '}
                  K
                </kbd>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/playground')} current={isPlaygroundRoute}>
                <PlusIcon data-slot="icon" />
                <SidebarLabel>New Playground</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarAccordion title="Syntax" defaultOpen={location.pathname.startsWith('/workout/syntax')} count={7}>
              <SidebarItem onClick={() => navigate('/workout/syntax/basics')} current={location.pathname === '/workout/syntax/basics'}>
                <CodeBracketIcon data-slot="icon" />
                <SidebarLabel>The Basics</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/timers')} current={location.pathname === '/workout/syntax/timers'}>
                <ClockIcon data-slot="icon" />
                <SidebarLabel>Timers & Intervals</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/repeaters')} current={location.pathname === '/workout/syntax/repeaters'}>
                <ArrowsRightLeftIcon data-slot="icon" />
                <SidebarLabel>Repeaters</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/groups')} current={location.pathname === '/workout/syntax/groups'}>
                <RectangleStackIcon data-slot="icon" />
                <SidebarLabel>Groups</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/measurements')} current={location.pathname === '/workout/syntax/measurements'}>
                <BeakerIcon data-slot="icon" />
                <SidebarLabel>Measurements</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/supplemental')} current={location.pathname === '/workout/syntax/supplemental'}>
                <CircleStackIcon data-slot="icon" />
                <SidebarLabel>Supplemental Data</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/workout/syntax/agentic')} current={location.pathname === '/workout/syntax/agentic'}>
                <CommandLineIcon data-slot="icon" />
                <SidebarLabel>Agentic Skill</SidebarLabel>
              </SidebarItem>
            </SidebarAccordion>

            <SidebarAccordion title="Collections" count={Object.values(collections).flat().length}>
              {Object.entries(collections).map(([groupName, groupCategories]) => (
                groupCategories.length > 0 && (
                  <React.Fragment key={groupName}>
                    <div className="px-2 pt-4 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                      {groupName}
                    </div>
                    {groupCategories.map(category => (
                      <SidebarItem key={category} onClick={() => handleCollectionClick(category)} current={currentWorkout.category === category}>
                        <FolderIcon data-slot="icon" />
                        <SidebarLabel>{category}</SidebarLabel>
                      </SidebarItem>
                    ))}
                  </React.Fragment>
                )
              ))}
            </SidebarAccordion>

            <SidebarAccordion title="Recent" count={recentPages.length}>
              {recentPages.map(pageName => {
                const item = workoutItems.find(i => i.name === pageName) || (pageName === 'Home' ? { name: 'Home', content: PLAYGROUND_CONTENT } : null)
                if (!item) return null
                return (
                  <SidebarItem key={pageName} onClick={() => handleSelectWorkout(item as any)} current={currentWorkout.name === pageName}>
                    {pageName}
                  </SidebarItem>
                )
              })}
            </SidebarAccordion>

            <SidebarAccordion title="Results" count={recentResults.length}>
              {recentResults.length === 0 ? (
                <div className="px-2 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                  No workout results yet. Complete a workout to see results here.
                </div>
              ) : (
                recentResults.map(result => {
                  const noteLabel = result.noteId.includes('/')
                    ? result.noteId.split('/').pop()!
                    : result.noteId
                  const date = new Date(result.completedAt)
                  const duration = result.data?.duration
                    ? `${Math.floor(result.data.duration / 60000)}m ${Math.floor((result.data.duration % 60000) / 1000)}s`
                    : null
                  return (
                    <div key={result.id} className="group flex flex-col gap-0.5 px-2 py-1.5 rounded-lg hover:bg-zinc-950/5 dark:hover:bg-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            const parts = result.noteId.split('/')
                            if (parts.length >= 2 && parts[0] === 'playground') {
                              navigate(`/playground/${encodeURIComponent(parts[1])}`)
                            } else if (parts.length >= 2) {
                              navigate(`/workout/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`)
                            } else {
                              // Bare ID (no slash) — treat as playground page
                              navigate(`/playground/${encodeURIComponent(result.noteId)}`)
                            }
                          }}
                          className="flex-1 min-w-0 text-left text-sm font-medium text-zinc-950 dark:text-white truncate hover:underline"
                        >
                          {noteLabel}
                        </button>
                        <button
                          onClick={() => {
                            if (result.data?.logs && result.data.logs.length > 0) {
                              const { segments } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime)
                              setReviewSegments(segments)
                              setReviewTitle(noteLabel)
                            }
                          }}
                          title="View result details"
                          className="shrink-0 p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <TableCellsIcon className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span>{date.toLocaleDateString()}</span>
                        {duration && <span>· {duration}</span>}
                        {result.data?.completed && <span className="text-emerald-500">✓</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </SidebarAccordion>
          </SidebarBody>
        </Sidebar>
      }
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        {currentWorkout.name !== 'Home' && (
          <div className="sticky top-0 z-30 bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950 pt-4 lg:pt-6 max-lg:hidden">
            <div className="flex items-center justify-between px-6 lg:px-10">
              <h1 className="text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8 dark:text-white">{currentWorkout.name}</h1>
              <div className="flex items-center gap-4">
                <CastButtonRpc />
                <ActionsMenu />
              </div>
            </div>
            <hr role="presentation" className="mt-6 w-full border-t border-zinc-950/10 dark:border-white/10" />
          </div>
        )}
        
        <div className="flex-1 flex flex-col min-h-0">
          {isPlaygroundRoute && playgroundId ? (
            <PlaygroundNotePage key={playgroundId} theme={actualTheme} />
          ) : currentWorkout.name === 'Home' ? (
            <HomePageContent
              actualTheme={actualTheme}
              workoutItems={workoutItems}
              onSelectWorkout={handleSelectWorkout}
              isCommandPaletteOpen={isCommandPaletteOpen}
              setIsCommandPaletteOpen={setIsCommandPaletteOpen}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
          ) : (
            <WorkoutEditorPage
              key={`${currentWorkout.category}/${currentWorkout.name}`}
              category={currentWorkout.category}
              name={currentWorkout.name}
              mdContent={currentWorkout.content}
              theme={actualTheme}
            />
          )}
        </div>
      </div>

      {currentWorkout.name !== 'Home' && (
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
      )}

      {reviewSegments && (
        <FullscreenReview
          segments={reviewSegments}
          onClose={() => setReviewSegments(null)}
          title={reviewTitle}
        />
      )}
    </SidebarLayout>
  )
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="wod-wiki-playground-theme">
      <HashRouter>
        <CommandProvider>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/workout/:category/:name" element={<AppContent />} />
            <Route path="/load" element={<LoadZipPage />} />
            <Route path="/playground" element={<PlaygroundRedirect />} />
            <Route path="/playground/:id" element={<AppContent />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </CommandProvider>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
