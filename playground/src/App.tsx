import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import * as Headless from '@headlessui/react'
import { Avatar } from '@/components/playground/avatar'
import { Dumbbell } from 'lucide-react'

declare const __APP_VERSION__: string | undefined;
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.dev';
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
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/playground/sidebar'
import { SidebarAccordion } from '@/components/playground/SidebarAccordion'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WodBlock } from '@/components/Editor/types'
import { SidebarLayout } from '@/components/playground/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  AcademicCapIcon,
} from '@heroicons/react/16/solid'
import {
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
  ClockIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  FolderIcon,
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
  ArrowPathIcon,
  TableCellsIcon,
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
import { findCanvasPage, canvasRoutes } from './canvas/canvasRoutes'
import { CanvasPage } from './canvas/CanvasPage'
import { CalendarPage, JournalWeeklyPage, SearchPage } from './views/ListViews'
import { CollectionsPage } from './views/CollectionsPage'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { Button } from '@/components/ui/button'
import { usePlaygroundContent } from './hooks/usePlaygroundContent'
import { SimplePageShell, JournalPageShell } from '@/panels/page-shells'
import { PageNavDropdown, type PageNavLink } from '@/components/playground/PageNavDropdown'
import { playgroundDB, PlaygroundDBService } from './services/playgroundDB'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { decodeZip } from './services/decodeZip'
import { v4 as uuidv4 } from 'uuid'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import newPlaygroundTemplate from './templates/new-playground.md?raw'
import { 
  createStatementBuilderStrategy 
} from './services/commandStrategies'

// ── Constants for Sidebar Navigation ────────────────────────────────

const HOME_LINKS = [
  { id: 'editor', label: 'Live Demo' },
  { id: 'features', label: 'Features' },
  { id: 'explore', label: 'Library' },
  { id: 'deep-dive', label: 'Getting Started' },
]

const ZERO_TO_HERO_LINKS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'statement', label: 'First Statement' },
  { id: 'timer', label: 'Timers' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'groups', label: 'Groups' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'notebook', label: 'Notebook' },
]

const SYNTAX_LINKS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'anatomy', label: 'Statement Anatomy' },
  { id: 'timers', label: 'Timers & Direction' },
  { id: 'metrics', label: 'Measuring Effort' },
  { id: 'groups', label: 'Groups & Repeaters' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'supplemental', label: 'Supplemental' },
  { id: 'document', label: 'Document' },
]

// ── New Journal Entry Split Button ─────────────────────────────────

function NewEntryButton() {
  const navigate = useNavigate()
  const [conflictIso, setConflictIso] = useState<string | null>(null)

  const todayISO = () => new Date().toISOString().slice(0, 10)

  const offsetISO = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const [selectedIso, setSelectedIso] = useState(todayISO)

  const formatLabel = (iso: string) => {
    const today = todayISO()
    const yesterday = offsetISO(-1)
    const tomorrow = offsetISO(1)
    if (iso === today) return 'Today'
    if (iso === yesterday) return 'Yesterday'
    if (iso === tomorrow) return 'Tomorrow'
    // Short date: "Mar 25"
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const pick = async (iso: string) => {
    setSelectedIso(iso)
    const pageId = PlaygroundDBService.pageId('journal', iso)
    const existing = await playgroundDB.getPage(pageId)
    if (existing) {
      setConflictIso(iso)
      return
    }
    navigate(`/journal/${iso}`)
  }

  const handleOpenExisting = () => {
    if (!conflictIso) return
    const iso = conflictIso
    setConflictIso(null)
    navigate(`/journal/${iso}`)
  }

  const handleCreateNew = () => {
    if (!conflictIso) return
    const iso = conflictIso
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const uniqueId = `${iso}-${pad(now.getHours())}-${pad(now.getMinutes())}`
    setConflictIso(null)
    navigate(`/journal/${uniqueId}`)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => pick(selectedIso)}
          aria-label={`New journal entry for ${selectedIso}`}
          className="gap-1.5 text-xs font-semibold"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="hidden sm:inline">{formatLabel(selectedIso)}</span>
        </Button>
        <Dropdown>
          <DropdownButton plain aria-label="New entry for a specific date">
            <CalendarDaysIcon data-slot="icon" className="size-5 text-zinc-500" />
          </DropdownButton>
          <DropdownMenu className="min-w-40" anchor="bottom end">
            <DropdownItem onClick={() => pick(offsetISO(0))}>
              <DropdownLabel>Today</DropdownLabel>
            </DropdownItem>
            <DropdownItem onClick={() => pick(offsetISO(-1))}>
              <DropdownLabel>Yesterday</DropdownLabel>
            </DropdownItem>
            <DropdownItem onClick={() => pick(offsetISO(1))}>
              <DropdownLabel>Tomorrow</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={() => navigate('/calendar')}>
              <CalendarDaysIcon data-slot="icon" />
              <DropdownLabel>Calendar…</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      <Headless.Dialog open={conflictIso !== null} onClose={() => setConflictIso(null)} className="relative z-50">
        <Headless.DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Headless.DialogPanel className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-xs w-full">
            <Headless.DialogTitle className="text-xs font-black uppercase tracking-widest text-foreground mb-2">
              Entry already exists
            </Headless.DialogTitle>
            <p className="text-xs text-muted-foreground mb-5">
              A journal entry for <span className="font-bold text-foreground">{conflictIso}</span> already exists. Open it or create a separate entry timestamped to now?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleOpenExisting} className="w-full justify-center">Open existing</Button>
              <Button variant="outline" onClick={handleCreateNew} className="w-full justify-center">Create new entry</Button>
              <Button variant="ghost" onClick={() => setConflictIso(null)} className="w-full justify-center text-muted-foreground">Cancel</Button>
            </div>
          </Headless.DialogPanel>
        </div>
      </Headless.Dialog>
    </>
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

const syntaxPages = canvasRoutes

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
        <DropdownItem onClick={handleDownload}>
          <ArrowDownTrayIcon data-slot="icon" />
          <DropdownLabel>Download Markdown</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="#/debug">
          <BugAntIcon data-slot="icon" />
          <DropdownLabel>Toggle Debug Mode</DropdownLabel>
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

function AppContent() {
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
      '/calendar': 'Calendar',
      '/journal': 'Journal',
      '/search': 'Search',
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

  // Nav links for the current page (used in the sticky header dropdown)
  const currentNavLinks = useMemo(() => {
    // 1. Canvas pages (including Home)
    if (canvasPage) {
      return canvasPage.sections.map(s => ({ id: s.id, label: s.heading }))
    }

    // 2. Docs pages
    if (location.pathname === '/getting-started') return ZERO_TO_HERO_LINKS
    if (location.pathname === '/syntax') return SYNTAX_LINKS
    
    // 3. List based pages (Calendar, Search, etc.)
    if (location.pathname === '/calendar' || location.pathname === '/journal' || location.pathname === '/search') {
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
        label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      }))
    }

    return []
  }, [location.pathname, canvasPage, recentResults, workoutItems])

  const handleSelectWorkout = useCallback((item: any) => {
    const workout = item as { name: string; category?: string; content?: string }
    if (workout.name === 'Home') {
      navigate('/')
    } else {
      const category = workout.category || 'General'
      navigate(`/workout/${encodeURIComponent(category)}/${encodeURIComponent(workout.name)}`)
    }
  }, [navigate])

  // Reset strategy when palette closes
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      // Small delay to avoid visual jump during close animation
      const t = setTimeout(() => setStrategy(null), 300)
      return () => clearTimeout(t)
    }
  }, [isCommandPaletteOpen, setStrategy])

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
      // Ctrl/Cmd + K: Global Search
      if ((e.key === 'k' || e.key === 'p') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        navigate('/search')
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
  }, [navigate, setStrategy, setIsCommandPaletteOpen])

  const [isSystemDark, setIsSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const editorViewRef = useRef<EditorView | null>(null)
  const handleViewCreated = useCallback((view: EditorView) => {
    editorViewRef.current = view
  }, [])

  const scrollToSection = useCallback((id: string) => {
    // 1. Try standard DOM element (Canvas/List pages)
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
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

  const { setTheme } = useTheme()

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
            {currentNavLinks.length > 0 && (
              <div className="lg:hidden">
                <PageNavDropdown links={currentNavLinks} scrollToSection={scrollToSection} />
              </div>
            )}
            <NewEntryButton />
            <NavbarItem href="/search" aria-label="Search">
              <MagnifyingGlassIcon data-slot="icon" />
            </NavbarItem>
            <div className="lg:hidden">
              <CastButtonRpc />
              <AudioToggle />
            </div>
            <NavbarItem href="/inbox" className="max-lg:hidden" aria-label="Inbox">
              <InboxIcon data-slot="icon" />
            </NavbarItem>
            <div className="lg:hidden">
              <ActionsMenu currentWorkout={currentWorkout} />
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
            <div className="flex items-center px-2 py-4">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 rotate-3">
                <Dumbbell size={18} />
              </div>
              <span className="ml-3 text-lg font-black tracking-tighter text-foreground uppercase">Wod Wiki</span>
              <span className="ml-1.5 text-[9px] font-bold text-muted-foreground self-end mb-1 opacity-50 uppercase tracking-widest">v{appVersion}</span>
            </div>
            <SidebarSection>
              <SidebarItem onClick={() => navigate('/')} current={location.pathname === '/' || location.pathname === ''}>
                <HomeIcon data-slot="icon" />
                <SidebarLabel className="font-semibold tracking-tight">Home</SidebarLabel>
              </SidebarItem>
              <SidebarItem onClick={() => navigate('/collections')} current={location.pathname.startsWith('/collections')}>
                <FolderIcon data-slot="icon" />
                <SidebarLabel>Collections</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/journal" current={location.pathname === '/journal'}>
                <RectangleStackIcon data-slot="icon" />
                <SidebarLabel>Journal</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/calendar" current={location.pathname === '/calendar'}>
                <ClockIcon data-slot="icon" />
                <SidebarLabel>Calendar</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/search" current={location.pathname === '/search'}>
                <MagnifyingGlassIcon data-slot="icon" />
                <SidebarLabel>Search</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <div className="px-2 pt-3 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">Docs</div>
              <SidebarItem onClick={() => navigate('/getting-started')} current={location.pathname === '/getting-started'}>
                <AcademicCapIcon data-slot="icon" />
                <SidebarLabel>Zero to Hero</SidebarLabel>
              </SidebarItem>
            </SidebarSection>

            <SidebarAccordion title="Syntax" count={syntaxPages.length}>
              {syntaxPages.map(page => (
                <SidebarItem key={page.route} onClick={() => navigate(page.route)} current={location.pathname === page.route}>
                  <CodeBracketIcon data-slot="icon" />
                  <SidebarLabel>{page.label}</SidebarLabel>
                </SidebarItem>
              ))}
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
                            if (parts.length >= 2) {
                              navigate(`/note/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`)
                            } else {
                              // Bare ID (no slash) — treat as playground page
                              navigate(`/note/playground/${encodeURIComponent(result.noteId)}`)
                            }
                          }}
                          className="flex-1 min-w-0 text-left text-sm font-medium text-zinc-950 dark:text-white truncate hover:underline"
                        >
                          {noteLabel}
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/review/${result.id}`)
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
        <div className="flex-1 flex flex-col min-h-0">
          {location.pathname === '/' || location.pathname === '' ? (
            <SimplePageShell title="Home" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <HomeView
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </SimplePageShell>
          ) : location.pathname === '/calendar' ? (
            <SimplePageShell title="Calendar" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <CalendarPage 
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </SimplePageShell>
          ) : location.pathname === '/journal' ? (
            <SimplePageShell title="Journal" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <JournalWeeklyPage 
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </SimplePageShell>
          ) : location.pathname === '/search' ? (
            <SimplePageShell title="Search" index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <SearchPage 
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </SimplePageShell>
          ) : location.pathname === '/collections' ? (
            <SimplePageShell title="Collections" actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <CollectionsPage />
            </SimplePageShell>
          ) : canvasPage ? (
            <SimplePageShell title={currentWorkout.name} index={currentNavLinks} onScrollToSection={scrollToSection} actions={<div className="flex items-center gap-4"><NewEntryButton /><CastButtonRpc /><AudioToggle /><ActionsMenu currentWorkout={currentWorkout} /></div>}>
              <CanvasPage
                page={canvasPage}
                wodFiles={workoutFiles as Record<string, string>}
                theme={actualTheme}
                workoutItems={workoutItems}
                onSelect={handleSelectWorkout}
              />
            </SimplePageShell>
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
  return (
    <ThemeProvider defaultTheme="system" storageKey="wod-wiki-playground-theme">
      <AudioProvider>
        <BrowserRouter>
          <NuqsAdapter>
            <ScrollToTop />
            <CommandProvider>
              <Routes>
                <Route path="/" element={<AppContent />} />
                <Route path="/getting-started" element={<AppContent />} />
                <Route path="/syntax" element={<AppContent />} />
                <Route path="/calendar" element={<AppContent />} />
                <Route path="/journal" element={<AppContent />} />
                <Route path="/search" element={<AppContent />} />
                <Route path="/collections" element={<AppContent />} />
                <Route path="/collections/:slug" element={<AppContent />} />
                <Route path="/workout/:category/:name" element={<AppContent />} />
                <Route path="/load" element={<LoadZipPage />} />
                <Route path="/playground" element={<PlaygroundRedirect />} />
                <Route path="/playground/:id" element={<AppContent />} />
                <Route path="/note/:category/:name" element={<AppContent />} />
                <Route path="/journal/:id" element={<AppContent />} />
                <Route path="/tracker/:runtimeId" element={<TrackerPage />} />
                <Route path="/review/:runtimeId" element={<ReviewPage />} />
                <Route path="*" element={<AppContent />} />
              </Routes>
            </CommandProvider>
          </NuqsAdapter>
        </BrowserRouter>
      </AudioProvider>
    </ThemeProvider>
  )
}

export default App
