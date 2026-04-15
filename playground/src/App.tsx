import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as Headless from '@headlessui/react'

import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSection,
  DropdownHeading,
} from '@/components/playground/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/playground/navbar'
import { NavProvider } from './nav/NavContext'
import { useNav } from './nav/NavContext'
import { NavSidebar } from './nav/NavSidebar'
import { buildAppNavTree } from './nav/appNavTree'
import type { NavItemL3 } from './nav/navTypes'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WodBlock } from '@/components/Editor/types'
import { SidebarLayout } from '@/components/playground/sidebar-layout'
import {
  PlusIcon,
} from '@heroicons/react/16/solid'
import {
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
} from '@heroicons/react/20/solid'
import type { WorkoutResult } from '@/types/storage'

import { NoteEditor } from '@/components/Editor/NoteEditor'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { AudioProvider } from '@/components/audio/AudioContext'
import { CommandProvider } from '@/components/command-palette/CommandContext'
import { useCommandPalette } from '@/components/command-palette/CommandContext'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { HomeView } from './views/HomeView'
import { findCanvasPage } from './canvas/canvasRoutes'
import { MarkdownCanvasPage } from './canvas/MarkdownCanvasPage'
import { JournalWeeklyPage } from './views/ListViews'
import { TextFilterStrip } from './views/queriable-list/TextFilterStrip'
import { CollectionsPage } from './views/CollectionsPage'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { Button } from '@/components/ui/button'
import { usePlaygroundContent } from './hooks/usePlaygroundContent'
import { CanvasPage, JournalPageShell } from '@/panels/page-shells'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import { playgroundDB, PlaygroundDBService } from './services/playgroundDB'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { decodeZip } from './services/decodeZip'
import { v4 as uuidv4 } from 'uuid'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import newPlaygroundTemplate from './templates/new-playground.md?raw'
import { 
  createStatementBuilderStrategy,
  createGlobalSearchStrategy,
} from './services/commandStrategies'

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

import { WorkoutActionButton } from '@/components/workout/WorkoutActionButton'

// ── New Journal Entry Button ───────────────────────────────────────

function NewEntryButton() {
  const navigate = useNavigate()
  
  const pick = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    navigate(`/journal/${y}-${m}-${d}`)
  }

  return (
    <WorkoutActionButton
      mode="create"
      label="New"
      onAction={pick}
      variant="ghost"
      className="h-8"
    />
  )
}

// Shared in-memory store for pending runtimes (also used by CanvasPage).
import { pendingRuntimes } from './runtimeStore'

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

// Load all markdown files from the markdown directory
const workoutFiles = import.meta.glob('../../markdown/**/*.md', { eager: true, query: '?raw', import: 'default' })

export interface WorkoutItem {
  id: string
  name: string
  category: string
  content: string
}

/**
 * Wrapper that loads workout content via IndexedDB (or falls back to MD).
 * Keeps WodBlock IDs stable across page loads so results stay linked.
 */
/** Syntax and documentation pages use in-page popup; collections use route navigation. */
const INLINE_RUNTIME_CATEGORIES = new Set(['syntax'])

function WorkoutEditorPage({
  category,
  name,
  mdContent,
  theme,
  onViewCreated,
}: {
  category: string
  name: string
  mdContent: string
  theme: string
  onViewCreated?: (view: EditorView) => void
}) {
  const usePopup = INLINE_RUNTIME_CATEGORIES.has(category)
  const noteId = PlaygroundDBService.pageId(category, name)
  const navigate = useNavigate()
  const { content, loading, onChange } = usePlaygroundContent({ category, name, mdContent })

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      const runtimeId = uuidv4()
      pendingRuntimes.set(runtimeId, { block, noteId })
      navigate(`/tracker/${runtimeId}`)
    },
    [noteId, navigate],
  )

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([])
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks.find(b => b.startLine + 1 === lineNum)
      if (!block) return link
      return { ...link, onRun: () => handleStartWorkout(block) }
    })
  }, [content, wodBlocks, handleStartWorkout])

  const { setL3Items: setEditorL3 } = useNav()
  useEffect(() => {
    setEditorL3(index.map(link => ({
      id: link.id,
      label: link.label,
      level: 3 as const,
      action: { type: 'scroll' as const, sectionId: link.id },
      secondaryAction: link.onRun ? { id: link.id + '-run', label: 'Run', action: { type: 'call' as const, handler: link.onRun } } : undefined,
    })))
    return () => setEditorL3([])
  }, [index, setEditorL3])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <JournalPageShell
      title={name}
      index={index}
      actions={
        <div className="flex items-center gap-4">
          <NewEntryButton />
          <CastButtonRpc />
          <AudioToggle />
          <ActionsMenu currentWorkout={{ name: noteId, content }} />
        </div>
      }
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
          noteId={noteId}
          onStartWorkout={usePopup ? undefined : handleStartWorkout}
          enableInlineRuntime={usePopup}
          onViewCreated={onViewCreated}
          theme={theme}
          showLineNumbers={false}
          onBlocksChange={setWodBlocks}
        />
      }
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

/** Generate a date-based name: YYYY-MM-DD HH-MM, with -SS.mmm if collision */
async function generatePlaygroundName(): Promise<string> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}`
  const basePageId = PlaygroundDBService.pageId('playground', base)
  const existing = await playgroundDB.getPage(basePageId)
  if (!existing) return base
  const precise = `${base}-${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}`
  return precise
}

function PlaygroundRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const id = await generatePlaygroundName()
      const now = Date.now()
      const pageId = PlaygroundDBService.pageId('playground', id)
      await playgroundDB.savePage({
        id: pageId,
        category: 'playground',
        name: id,
        content: PLAYGROUND_TEMPLATE.content,
        updatedAt: now,
      })
      navigate(`/playground/${encodeURIComponent(id)}`, { replace: true })
    })()
  }, [navigate])

  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400">
      Creating…
    </div>
  )
}

// ── Actions Menu (Theme, Download, Reset) ──────────────────────────

function ActionsMenu({ 
  currentWorkout, 
  onDownload 
}: { 
  currentWorkout: { name: string, content: string },
  onDownload?: () => void
}) {
  const { theme, setTheme } = useTheme()
  const { l3Items, scrollToSection } = useNav()
  const [debugMode, setDebugMode] = useState(
    () => localStorage.getItem('debugMode') === 'true'
  )

  const handleToggleDebug = () => {
    const next = !debugMode
    setDebugMode(next)
    localStorage.setItem('debugMode', String(next))
  }

  const handleResetData = async () => {
    localStorage.clear()
    await playgroundDB.clearAll()
    window.location.reload()
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }
    const blob = new Blob([currentWorkout.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentWorkout.name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dropdown>
      <DropdownButton plain>
        <EllipsisVerticalIcon data-slot="icon" className="size-5 text-zinc-500" />
      </DropdownButton>
      <DropdownMenu className="min-w-56" anchor="bottom end">
        {l3Items.length > 0 && (
          <>
            <DropdownSection>
              <DropdownHeading>On this page</DropdownHeading>
              {l3Items.map(item => (
                <DropdownItem key={item.id} onClick={() => scrollToSection(item.id)}>
                  <DropdownLabel>{item.label}</DropdownLabel>
                </DropdownItem>
              ))}
            </DropdownSection>
            <DropdownDivider />
          </>
        )}
        <DropdownItem onClick={handleDownload}>
          <ArrowDownTrayIcon data-slot="icon" />
          <DropdownLabel>Download Markdown</DropdownLabel>
        </DropdownItem>
        <DropdownItem onClick={handleToggleDebug}>
          <BugAntIcon data-slot="icon" />
          <DropdownLabel>Debug Mode</DropdownLabel>
          {debugMode && <span className="col-start-5 text-blue-500">✓</span>}
        </DropdownItem>
        <DropdownDivider />

        <DropdownSection>
          <DropdownHeading>Theme</DropdownHeading>
          <DropdownItem onClick={() => setTheme('light')}>
            <SunIcon data-slot="icon" />
            <DropdownLabel>Light</DropdownLabel>
            {theme === 'light' && <span className="col-start-5 text-blue-500">✓</span>}
          </DropdownItem>
          <DropdownItem onClick={() => setTheme('dark')}>
            <MoonIcon data-slot="icon" />
            <DropdownLabel>Dark</DropdownLabel>
            {theme === 'dark' && <span className="col-start-5 text-blue-500">✓</span>}
          </DropdownItem>
          <DropdownItem onClick={() => setTheme('system')}>
            <ComputerDesktopIcon data-slot="icon" />
            <DropdownLabel>System</DropdownLabel>
            {theme === 'system' && <span className="col-start-5 text-blue-500">✓</span>}
          </DropdownItem>
        </DropdownSection>

        <DropdownDivider />
        <DropdownItem onClick={handleResetData}>
          <ArrowPathIcon data-slot="icon" className="text-red-500" />
          <DropdownLabel className="text-red-500">Reset & Clear Cache</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}

function extractPageIndex(content: string): PageNavLink[] {
  const lines = content.split('\n')
  const links: PageNavLink[] = []
  let wodCount = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (match) {
      const label = match[2].trim()
      const id = label.toLowerCase().replace(/[^\w]+/g, '-')
      links.push({ id, label, type: 'heading' })
      continue
    }
    if (/^```(wod|log|plan)\s*$/.test(line.trim())) {
      wodCount++
      links.push({ id: `wod-line-${i + 1}`, label: `Workout ${wodCount}`, type: 'wod' })
    }
  }
  return links
}

// ---------------------------------------------------------------------------
// #/playground/:id — load page by UUID from DB, render in editor
// ---------------------------------------------------------------------------

function PlaygroundNotePage({ theme, onViewCreated }: { theme: string, onViewCreated?: (view: EditorView) => void }) {
  const { id } = useParams<{ id: string }>()
  const noteId = id!
  const navigate = useNavigate()
  const { content, loading, onChange } = usePlaygroundContent({
    category: 'playground',
    name: noteId,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  // Place cursor at the $CURSOR token position on first mount
  const cursorPlaced = useRef(false)
  const handleInternalViewCreated = useCallback((view: EditorView) => {
    onViewCreated?.(view)
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(PLAYGROUND_TEMPLATE.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [onViewCreated])

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      const runtimeId = uuidv4()
      pendingRuntimes.set(runtimeId, { block, noteId })
      navigate(`/tracker/${runtimeId}`)
    },
    [noteId, navigate],
  )

  const [wodBlocks_pnp, setWodBlocks_pnp] = useState<WodBlock[]>([])
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks_pnp.find(b => b.startLine + 1 === lineNum)
      if (!block) return link
      return { ...link, onRun: () => handleStartWorkout(block) }
    })
  }, [content, wodBlocks_pnp, handleStartWorkout])

  const { setL3Items: setPnpL3 } = useNav()
  useEffect(() => {
    setPnpL3(index.map(link => ({
      id: link.id,
      label: link.label,
      level: 3 as const,
      action: { type: 'scroll' as const, sectionId: link.id },
      secondaryAction: link.onRun ? { id: link.id + '-run', label: 'Run', action: { type: 'call' as const, handler: link.onRun } } : undefined,
    })))
    return () => setPnpL3([])
  }, [index, setPnpL3])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <JournalPageShell
      title={noteId}
      index={index}
      actions={
        <div className="flex items-center gap-4">
          <NewEntryButton />
          <CastButtonRpc />
          <AudioToggle />
        </div>
      }
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
          noteId={noteId}
          onStartWorkout={handleStartWorkout}
          enableInlineRuntime={false}
          onViewCreated={handleInternalViewCreated}
          theme={theme}
          showLineNumbers={false}
          onBlocksChange={setWodBlocks_pnp}
        />
      }
    />
  )
}

// ---------------------------------------------------------------------------
// #/review/:resultId — load result from IndexedDB and show FullscreenReview
// ---------------------------------------------------------------------------

function ReviewPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [title, setTitle] = useState('Workout Review')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resultId = runtimeId
    if (!resultId) return
    let cancelled = false
    indexedDBService.getResultById(resultId).then(result => {
      if (cancelled) return
      if (!result) {
        setError('Result not found.')
        return
      }
      const noteLabel = result.noteId.includes('/')
        ? result.noteId.split('/').pop()!
        : result.noteId
      setTitle(noteLabel)
      if (result.data?.logs && result.data.logs.length > 0) {
        const { segments: s } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime)
        setSegments(s)
      } else {
        setSegments([])
      }
    }).catch(() => {
      if (!cancelled) setError('Failed to load result.')
    })
    return () => { cancelled = true }
  }, [runtimeId])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {error}
      </div>
    )
  }

  if (segments === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <FullscreenReview
      segments={segments}
      onClose={() => navigate(-1)}
      title={title}
    />
  )
}

// ---------------------------------------------------------------------------
// #/tracker/:runtimeId — run a workout from a pending runtime
// ---------------------------------------------------------------------------

function TrackerPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const pendingRef = useRef(runtimeId ? pendingRuntimes.get(runtimeId) : undefined)

  // Consume from the pending store on mount so it doesn't leak
  useEffect(() => {
    if (runtimeId) pendingRuntimes.delete(runtimeId)
  }, [runtimeId])

  const pending = pendingRef.current

  const handleComplete = useCallback(
    (blockId: string, results: any) => {
      if (!results || !runtimeId || !pending) return
      indexedDBService.saveResult({
        id: runtimeId,
        noteId: pending.noteId,
        segmentId: blockId,
        sectionId: blockId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }).then(() => {
        if (results.completed) {
          navigate(`/review/${runtimeId}`, { replace: true })
        }
      }).catch(() => {})
    },
    [runtimeId, pending, navigate],
  )

  const handleClose = useCallback(() => {
    if (!pending) { navigate('/'); return }
    // Go back to the note
    const parts = pending.noteId.split('/')
    if (parts.length >= 2 && parts[0] === 'playground') {
      navigate(`/playground/${encodeURIComponent(parts[1])}`, { replace: true })
    } else if (parts.length >= 2) {
      navigate(`/workout/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [pending, navigate])

  if (!pending) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Runtime not found. Please start the workout from the editor.
      </div>
    )
  }

  return (
    <FullscreenTimer
      block={pending.block}
      onClose={handleClose}
      onCompleteWorkout={handleComplete}
      autoStart
    />
  )
}

// ---------------------------------------------------------------------------
// #/journal/:id — stored-note page using JournalPageShell
// ---------------------------------------------------------------------------

function JournalPage({ theme, onViewCreated }: { theme: string, onViewCreated?: (view: EditorView) => void }) {
  const { id } = useParams<{ id: string }>()
  const noteId = id!
  const [isTimerOpen, setIsTimerOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [timerBlock, setTimerBlock] = useState<WodBlock | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  const { content, loading, onChange } = usePlaygroundContent({
    category: 'journal',
    name: noteId,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  // Place cursor at the $CURSOR token position on first mount (new entries only)
  const cursorPlaced = useRef(false)
  const handleInternalViewCreated = useCallback((view: EditorView) => {
    onViewCreated?.(view)
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(PLAYGROUND_TEMPLATE.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [onViewCreated])

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      setTimerBlock(block)
      setIsTimerOpen(true)
    },
    [],
  )

  const handleTimerComplete = useCallback(
    (_blockId: string, results: any) => {
      setIsTimerOpen(false)
      if (results?.data?.logs) {
        const { segments } = getAnalyticsFromLogs(results.data.logs, results.data.startTime)
        setReviewSegments(segments)
        setIsReviewOpen(true)
      }
    },
    [],
  )

  const handleCloseReview = useCallback(() => {
    setIsReviewOpen(false)
    setReviewSegments([])
  }, [])

  const [wodBlocks_jp, setWodBlocks_jp] = useState<WodBlock[]>([])
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks_jp.find(b => b.startLine + 1 === lineNum)
      if (!block) return link
      return { ...link, onRun: () => handleStartWorkout(block) }
    })
  }, [content, wodBlocks_jp, handleStartWorkout])

  const { setL3Items: setJpL3 } = useNav()
  useEffect(() => {
    setJpL3(index.map(link => ({
      id: link.id,
      label: link.label,
      level: 3 as const,
      action: { type: 'scroll' as const, sectionId: link.id },
      secondaryAction: link.onRun ? { id: link.id + '-run', label: 'Run', action: { type: 'call' as const, handler: link.onRun } } : undefined,
    })))
    return () => setJpL3([])
  }, [index, setJpL3])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <JournalPageShell
      title={noteId}
      index={index}
      actions={
        <div className="flex items-center gap-4">
          <NewEntryButton />
          <CastButtonRpc />
          <AudioToggle />
          <ActionsMenu currentWorkout={{ name: noteId, content }} />
        </div>
      }
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
          noteId={noteId}
          onStartWorkout={handleStartWorkout}
          enableInlineRuntime={false}
          onViewCreated={handleInternalViewCreated}
          theme={theme}
          showLineNumbers={false}
          onBlocksChange={setWodBlocks_jp}
        />
      }
      timerOverlay={
        timerBlock ? (
          <FullscreenTimer
            block={timerBlock}
            onClose={() => setIsTimerOpen(false)}
            onCompleteWorkout={handleTimerComplete}
            autoStart
          />
        ) : undefined
      }
      reviewOverlay={
        reviewSegments.length > 0 ? (
          <FullscreenReview
            segments={reviewSegments}
            onClose={handleCloseReview}
            title="Workout Review"
          />
        ) : undefined
      }
      isTimerOpen={isTimerOpen}
      isReviewOpen={isReviewOpen}
      onCloseTimer={() => setIsTimerOpen(false)}
      onCloseReview={handleCloseReview}
    />
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

      return {
        id: path,
        name: fileName,
        category: category,
        content: fileContent as string,
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

  const handleCloneWorkout = useCallback((item: WorkoutItem, date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    const entryId = `journal/${iso}`
    
    playgroundDB.savePage({
      id: entryId,
      name: item.name,
      category: 'journal',
      content: item.content,
      updatedAt: Date.now()
    }).then(() => {
      navigate(`/journal/${iso}`)
    })
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
          
          if (isCollection && collectionSlug && s.prose.includes('{{workouts}}')) {
             const collectionItems = workoutItems.filter(item => 
               item.category === collectionSlug && item.name.toLowerCase() !== 'readme'
             )
             collectionItems.forEach(item => {
               links.push({
                 id: `workout-${item.id}`,
                 label: item.name,
                 type: 'wod' as const,
                 onRun: () => handleSelectWorkout(item)
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
              onRun: () => handleSelectWorkout(item)
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
    const strategy = createGlobalSearchStrategy(workoutItems, handleSelectWorkout, navigate)
    setStrategy(strategy)
    setIsCommandPaletteOpen(true)
  }, [workoutItems, handleSelectWorkout, setStrategy, setIsCommandPaletteOpen])

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
    // The ID format from extractHeaders is typically lowercase-slugified-header
    if (editorViewRef.current) {
      const view = editorViewRef.current
      const content = view.state.doc.toString()
      const lines = content.split('\n')
      
      const lineIdx = lines.findIndex(line => {
        const match = line.match(/^(#{1,6})\s+(.*)$/)
        if (match) {
          const label = match[2].trim()
          const headerId = label.toLowerCase().replace(/[^\w]+/g, '-')
          return headerId === id
        }
        return false
      })

      if (lineIdx !== -1) {
        const pos = view.state.doc.line(lineIdx + 1).from
        view.dispatch({
          selection: { anchor: pos, head: pos },
          scrollIntoView: true
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
    const l3: NavItemL3[] = currentNavLinks.map(link => ({
      id: link.id,
      label: link.label,
      level: 3 as const,
      action: { type: 'scroll' as const, sectionId: link.id },
      secondaryAction: link.onRun
        ? { id: link.id + '-run', label: 'Run', action: { type: 'call' as const, handler: link.onRun } }
        : undefined,
    }))
    setL3Items(l3)
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
            </div>
            <ActionsMenu currentWorkout={currentWorkout} />
          </NavbarSection>
        </Navbar>
      }
      sidebar={<NavSidebar />}
    >
      <div className="flex flex-col h-full min-h-[calc(100vh-theme(spacing.20))]">
        <div className="flex-1 flex flex-col min-h-0">
          {location.pathname === '/' || location.pathname === '' ? (
            <CanvasPage title="Home" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <HomeView
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </CanvasPage>
          ) : location.pathname === '/journal' ? (
            <CanvasPage title="Journal" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <JournalWeeklyPage 
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
                onCreateEntry={handleCreateJournalEntry}
              />
            </CanvasPage>
          ) : location.pathname === '/collections' ? (
            <CanvasPage title="Collections" subheader={<TextFilterStrip placeholder="Filter collections…" />} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <CollectionsPage />
            </CanvasPage>
          ) : canvasPage ? (
            <CanvasPage title={currentWorkout.name} index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <MarkdownCanvasPage
                page={canvasPage}
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
                onClone={handleCloneWorkout}
              />
            </CanvasPage>
          ) : (
            <>
              {isPlaygroundRoute && effectivePlaygroundId ? (
                <PlaygroundNotePage key={effectivePlaygroundId} theme={actualTheme} onViewCreated={handleViewCreated} />
              ) : isJournalEntryRoute && journalEntryId ? (
                <JournalPage key={journalEntryId} theme={actualTheme} onViewCreated={handleViewCreated} />
              ) : (
                <WorkoutEditorPage
                  key={`${currentWorkout.category}/${currentWorkout.name}`}
                  category={currentWorkout.category}
                  name={currentWorkout.name}
                  mdContent={currentWorkout.content}
                  theme={actualTheme}
                  onViewCreated={handleViewCreated}
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
            <ScrollToTop />
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
