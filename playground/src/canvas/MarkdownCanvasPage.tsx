/**
 * CanvasPage — renders a ParsedCanvasPage as an interactive scroll-driven
 * two-column layout that matches the styling of the existing GettingStarted
 * and Syntax pages:
 *
 *   ┌───────────────────────────┬──────────────────────────────────┐
 *   │  scrolling text + btns    │  MacOSChrome sticky editor (60%) │
 *   │  (40%)                    │                                  │
 *   └───────────────────────────┴──────────────────────────────────┘
 *
 * The most-visible section wins (ratio-map, same logic as ParallaxSection)
 * so only one command pipeline fires at a time — no flicker.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, Eye, Maximize2, Play } from 'lucide-react'
import type { EditorView } from '@codemirror/view'
import { useQueryState } from 'nuqs'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import { ReviewGrid } from '@/components/review-grid/ReviewGrid'
import type { WorkoutResults } from '@/components/Editor/types'
import { notePersistence } from '@/services/persistence'
import type { WorkoutResult } from '@/types/storage'
import { MacOSChrome } from '../components/MacOSChrome'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { cn } from '@/lib/utils'
import { stripFrontmatter } from '@/utils/frontmatter'
import { CanvasProse } from './CanvasProse'
import { executeNavAction } from '../nav/navTypes'
import type { INavActivation, NavActionDeps, INavAction } from '../nav/navTypes'
import type { ParsedCanvasPage, CanvasSection, PipelineStep, OpenMode } from './parseCanvasMarkdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WorkoutItem } from '../App'
import { pendingRuntimes, activeRuntimes } from '../runtimeStore'
import { runPath } from '../lib/routes'
import { CollectionWorkoutsList } from '../views/queriable-list/CollectionWorkoutsList'

// Match the existing parallax constants exactly
const STICKY_NAV_HEIGHT = 104
const MOBILE_STICKY_TOP = 65
// Matches Tailwind's `lg` breakpoint (1024px).  Used to select the correct
// IntersectionObserver rootMargin for mobile vs desktop — mirrors ParallaxSection.
const MOBILE_BREAKPOINT_PX = 1023
const INITIAL_SOURCE_KEY = '__initial__'

interface EditableSourceState {
  original: string
  current: string
}

function getPageStickyOffset(fallback: number): number {
  if (typeof document === 'undefined') return fallback

  const stickyElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-page-sticky-boundary="true"]'),
  )

  const visibleBottom = stickyElements.reduce((maxBottom, element) => {
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0) return maxBottom
    return Math.max(maxBottom, rect.bottom)
  }, 0)

  return visibleBottom > 0 ? visibleBottom + 24 : fallback
}

function getCanvasNoteId(route: string): string {
  return route === '/' ? 'canvas:home' : `canvas:${route.replace(/^\//, '')}`
}

// ── Source resolution ─────────────────────────────────────────────────────────

function resolveSource(dslPath: string, wodFiles: Record<string, string>): string {
  // Explicit markdown/canvas/ path
  if (dslPath.startsWith('markdown/')) {
    const key = '../../' + dslPath
    if (key in wodFiles) return stripFrontmatter(wodFiles[key])
  }

  // Legacy wods/ or collections/ prefixes
  let key = dslPath
  if (dslPath.startsWith('wods/examples/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^wods\/examples\//, '')
  } else if (dslPath.startsWith('wods/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^wods\//, '')
  } else if (dslPath.startsWith('collections/')) {
    key = '../../markdown/collections/' + dslPath.replace(/^collections\//, '')
  } else if (dslPath.startsWith('canvas/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^canvas\//, '')
  } else {
    // Check both canvas and collections as fallback
    const canvasKey = '../../markdown/canvas/' + dslPath
    if (canvasKey in wodFiles) return stripFrontmatter(wodFiles[canvasKey])
    
    const collectionsKey = '../../markdown/collections/' + dslPath
    if (collectionsKey in wodFiles) return stripFrontmatter(wodFiles[collectionsKey])
    
    key = '../../markdown/' + dslPath
  }
  return key in wodFiles ? stripFrontmatter(wodFiles[key]) : `# Source not found\n\nPath: \`${dslPath}\`\nResolved: \`${key}\``
}

// ── Section attribute helpers ─────────────────────────────────────────────────

const SECTION_THEME_STYLES: Record<string, { panel: string; accent: string; progress: string }> = {
  slate: {
    panel: 'border-slate-500/35 shadow-slate-500/12',
    accent: 'from-slate-500/70 via-slate-400/25 to-transparent',
    progress: 'from-slate-500 to-slate-400',
  },
  amber: {
    panel: 'border-amber-500/35 shadow-amber-500/12',
    accent: 'from-amber-500/75 via-amber-400/25 to-transparent',
    progress: 'from-amber-500 to-orange-400',
  },
  emerald: {
    panel: 'border-emerald-500/35 shadow-emerald-500/12',
    accent: 'from-emerald-500/75 via-emerald-400/25 to-transparent',
    progress: 'from-emerald-500 to-teal-400',
  },
  sky: {
    panel: 'border-sky-500/35 shadow-sky-500/12',
    accent: 'from-sky-500/75 via-sky-400/25 to-transparent',
    progress: 'from-sky-500 to-cyan-400',
  },
  violet: {
    panel: 'border-violet-500/35 shadow-violet-500/12',
    accent: 'from-violet-500/75 via-fuchsia-400/25 to-transparent',
    progress: 'from-violet-500 to-fuchsia-400',
  },
  rose: {
    panel: 'border-rose-500/35 shadow-rose-500/12',
    accent: 'from-rose-500/75 via-pink-400/25 to-transparent',
    progress: 'from-rose-500 to-pink-400',
  },
}

const hasAttr = (s: CanvasSection, a: string) => s.attrs.includes(a)
const getAttrValue = (s: CanvasSection, key: string) =>
  s.attrs.find(attr => attr.startsWith(`${key}:`))?.slice(key.length + 1)
const isFullBleed = (s: CanvasSection) => hasAttr(s, 'full-bleed')
const isDark = (s: CanvasSection) => hasAttr(s, 'dark')
const getSectionDensity = (s: CanvasSection) => getAttrValue(s, 'density') ?? 'default'
const getSectionTheme = (s: CanvasSection) => getAttrValue(s, 'theme') ?? 'slate'
const getSectionThemeStyles = (s: CanvasSection) => SECTION_THEME_STYLES[getSectionTheme(s)] ?? SECTION_THEME_STYLES.slate

// ── Pipeline → INavAction converter ──────────────────────────────────────────

/** Convert a single stringly-typed PipelineStep to a typed INavAction. */
function pipelineStepToNavAction(step: PipelineStep, open: OpenMode = 'dialog'): INavAction {
  if (step.action === 'set-source') return { type: 'view-source', source: step.value }
  if (step.action === 'navigate') {
    // External URLs (http://, https://) open in a new tab
    if (/^https?:\/\//.test(step.value)) {
      return { type: 'external', href: step.value }
    }
    return { type: 'route', to: step.value }
  }
  if (step.action === 'set-state') {
    if (step.value === 'note')   return { type: 'view-state', state: 'note' }
    if (step.value === 'review') return { type: 'view-state', state: 'review' }
    if (step.value === 'track')  return { type: 'view-state', state: 'track', open }
  }
  return { type: 'none' }
}

/** Build an INavActivation from a canvas ButtonBlock or ViewButton. */
function buttonToActivation(btn: { label: string; pipeline: PipelineStep[]; open?: OpenMode }, idx: number): INavActivation {
  const steps = btn.pipeline.map(s => pipelineStepToNavAction(s, btn.open))
  return {
    id: `btn-${idx}`,
    label: btn.label,
    action: steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
  }
}

/** True when an activation's action will launch the workout tracker. */
function isRunActivation(activation: INavActivation): boolean {
  const { action } = activation
  if (action.type === 'view-state') return action.state === 'track'
  if (action.type === 'pipeline')   return action.steps.some(s => s.type === 'view-state' && (s as { state?: string }).state === 'track')
  return false
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface RunButtonState {
  /** True when a runtime for this button's block is active but hidden */
  isReconnect: boolean
  onReconnect: () => void
  onRun: () => void
  onFullscreen: () => void
}

function SectionButtons({
  activations,
  fullBleed,
  runState,
  deps,
}: {
  activations: INavActivation[]
  fullBleed: boolean
  runState?: RunButtonState
  deps: NavActionDeps
}) {
  if (activations.length === 0) return null

  const first = activations[0]
  if (isRunActivation(first) && runState) {
    const rest = activations.slice(1)
    const RunPill = runState.isReconnect ? (
      <button
        onClick={runState.onReconnect}
        className={cn(
          'flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase tracking-widest',
          'rounded-full border transition-all active:scale-95',
          'border-amber-500/40 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20',
          'dark:text-amber-400',
          fullBleed && 'mx-auto',
        )}
      >
        <Eye className="size-3.5" />
        View
      </button>
    ) : (
      <ButtonGroup
        variant="primary"
        primary={{
          id: first.id || 'run',
          label: first.label,
          icon: first.icon ?? Play,
          action: { type: 'call', handler: runState.onRun },
        }}
        secondary={{
          id: 'fullscreen',
          label: 'Run fullscreen',
          icon: Maximize2,
          action: { type: 'call', handler: runState.onFullscreen },
        }}
        className={cn(fullBleed && 'mx-auto')}
      />
    )
    return (
      <div className={cn('flex flex-wrap items-center gap-4 mt-8', fullBleed && 'justify-center')}>
        {RunPill}
        {rest.map((activation, i) => (
          <button
            key={activation.id || i}
            onClick={() => executeNavAction(activation.action, deps)}
            className="flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest rounded-full bg-background border border-border text-foreground hover:bg-muted transition-all active:scale-95"
          >
            {activation.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-4 mt-8', fullBleed && 'justify-center')}>
      {activations.map((activation, i) => (
        <button
          key={activation.id || i}
          onClick={() => executeNavAction(activation.action, deps)}
          className={cn(
            'flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-full transition-all active:scale-95',
            i === 0
              ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:scale-[1.04]'
              : 'bg-background border border-border text-foreground hover:bg-muted',
          )}
        >
          {activation.label}
        </button>
      ))}
    </div>
  )
}

/** Buttons rendered directly on the sticky view panel (from the view block). */
function ViewPanelButtons({
  activations,
  runState,
  deps,
}: {
  activations: INavActivation[]
  runState?: RunButtonState
  deps: NavActionDeps
}) {
  if (activations.length === 0) return null

  const first = activations[0]
  if (isRunActivation(first) && runState) {
    const rest = activations.slice(1)
    const RunPill = runState.isReconnect ? (
      <button
        onClick={runState.onReconnect}
        className={cn(
          'flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase tracking-widest',
          'rounded-full border transition-all active:scale-95',
          'border-amber-500/40 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20',
          'dark:text-amber-400',
        )}
      >
        <Eye className="size-3.5" />
        View
      </button>
    ) : (
      <ButtonGroup
        variant="primary"
        primary={{
          id: first.id || 'run',
          label: first.label,
          icon: first.icon ?? Play,
          action: { type: 'call', handler: runState.onRun },
        }}
        secondary={{
          id: 'fullscreen',
          label: 'Run fullscreen',
          icon: Maximize2,
          action: { type: 'call', handler: runState.onFullscreen },
        }}
      />
    )
    return (
      <div className="flex flex-wrap items-center gap-3 justify-end pt-3 px-1">
        {RunPill}
        {rest.map((activation, i) => (
          <button
            key={activation.id || i}
            onClick={() => executeNavAction(activation.action, deps)}
            className="px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-full bg-muted border border-border text-foreground hover:bg-muted/80 transition-all active:scale-95"
          >
            {activation.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3 justify-end pt-3 px-1">
      {activations.map((activation, i) => (
        <button
          key={activation.id || i}
          onClick={() => executeNavAction(activation.action, deps)}
          className={cn(
            'px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-full transition-all active:scale-95',
            i === 0
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.04]'
              : 'bg-muted border border-border text-foreground hover:bg-muted/80',
          )}
        >
          {activation.label}
        </button>
      ))}
    </div>
  )
}

function ExampleTabs({
  examples,
  activeIndex,
  onSelect,
}: {
  examples: Array<{ label: string }>
  activeIndex: number
  onSelect: (index: number) => void
}) {
  if (examples.length === 0) return null

  return (
    <div className="mt-6 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        {examples.map((example, index) => {
          const selected = index === activeIndex
          return (
            <button
              key={`${example.label}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all active:scale-95',
                selected
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {example.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface MarkdownCanvasPageProps {
  page: ParsedCanvasPage
  /** The workoutFiles glob map from App.tsx (keyed `../../markdown/**‌/*.md`). */
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
  /**
   * Optional in-memory content to load into the editor instead of the DSL
   * source path. When set (non-empty), it overrides the resolved source.
   * Used by HomeWelcome search bar to inject a workout without a file path.
   */
  contentOverride?: string
  /**
   * Optional ReactNode rendered in the first sticky panel's MacOSChrome header.
   * Used by HomeView to inject Run / Reset / Results / Share controls.
   */
  panelHeaderActions?: ReactNode
  /**
   * Called once on mount with imperative handles for the first panel.
   * Lets HomeWelcome wire the Run / Reset / Results / Fullscreen buttons
   * without the canvas needing to know about external UI.
   */
  onPanelActionsReady?: (actions: PanelActions) => void
  /**
   * Optional ReactNode rendered as the very first item inside the scrolling
   * left column — before section 01. Used by HomeView to inject the welcome
   * hero copy so it sits alongside the sticky editor panel, not above it.
   */
  heroSlot?: ReactNode
}

export interface PanelActions {
  run: () => void
  reset: () => void
  results: () => void
  fullscreen: () => void
  getSource: () => string
}

export function MarkdownCanvasPage({ page, wodFiles, theme, workoutItems, onSelect, contentOverride, panelHeaderActions, onPanelActionsReady, heroSlot }: MarkdownCanvasPageProps) {
  const navigate = useNavigate()
  const { sections, route } = page
  const canvasNoteId = useMemo(() => getCanvasNoteId(route), [route])

  const isCollection = route.startsWith('/collections/')
  const collectionSlug = isCollection ? route.split('/').pop() : null

  const handleSelectWorkout = useCallback(
    (item: WorkoutItem) => {
      if (onSelect) {
        onSelect(item)
        return
      }

      navigate(`/collections/${encodeURIComponent(item.category)}/${encodeURIComponent(item.name)}`)
    },
    [navigate, onSelect],
  )

  // Check if any section has the {{workouts}} tag
  const hasWorkoutsTag = sections.some(s => s.prose.includes('{{workouts}}'))

  // Hero = first section; content = the rest (observed by IntersectionObserver)
  const contentSections = sections.slice(1)

  // View definition — carries the initial source and alignment
  const viewDef = sections.find(s => s.view)?.view ?? null
  const stickyAlign = viewDef?.align ?? 'right'
  const initialActiveSection = contentSections[0] ?? sections[0] ?? null

  // Keep editor source in both state (for the NoteEditor value prop) and a ref
  // (so the observer callback never closes over a stale string).
  const initialSource = viewDef?.source ? resolveSource(viewDef.source, wodFiles) : ''
  const initialSourceKey = viewDef?.source || INITIAL_SOURCE_KEY
  const [editorSource, setEditorSource] = useState(initialSource)
  const [editorOpacity, setEditorOpacity] = useState(1)
  const [isEditorLoading, setIsEditorLoading] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(initialActiveSection?.id ?? null)
  const [activeSectionTitle, setActiveSectionTitle] = useState(initialActiveSection?.heading ?? 'Whiteboard Script')
  const [activeSectionTheme, setActiveSectionTheme] = useState(() => getSectionTheme(initialActiveSection ?? sections[0] ?? {
    id: 'default',
    heading: 'Whiteboard Script',
    level: 1,
    attrs: [],
    prose: '',
    commands: [],
    buttons: [],
  }))
  const [selectedExamples, setSelectedExamples] = useState<Record<string, number>>({})
  const [activeSourceKey, setActiveSourceKey] = useState(initialSourceKey)
  const [activeOriginalSource, setActiveOriginalSource] = useState(initialSource)
  const editorSourceRef = useRef(initialSource)
  const editorViewRef = useRef<EditorView | null>(null)
  const sourceEditsRef = useRef<Map<string, EditableSourceState>>(new Map([
    [initialSourceKey, { original: initialSource, current: initialSource }],
  ]))
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Panel state machine ────────────────────────────────────────────────────
  // 'editor'    — NoteEditor shown (default)
  // 'running'   — RuntimeTimerPanel shown (open: view)
  // 'review'    — FullscreenReview shown inline after completion
  type PanelMode = 'editor' | 'running' | 'review'
  const [panelMode, setPanelMode] = useState<PanelMode>('editor')
  const [viewTimerBlock, setViewTimerBlock] = useState<WodBlock | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set())
  const [persistedResults, setPersistedResults] = useState<WorkoutResult[]>([])
  const [activeViewRuntimeId, setActiveViewRuntimeId] = useState<string | null>(null)
  // Block that was last launched in view mode — kept for reconnect support
  const activeViewBlockRef = useRef<WodBlock | null>(null)

  // ── Fullscreen (dialog) block ───────────────────────────────────────────
  const [fullscreenBlock, setFullscreenBlock] = useState<WodBlock | null>(null)

  // Stable ref for wodFiles so the observer never stale-closes over a new map
  const wodFilesRef = useRef(wodFiles)
  wodFilesRef.current = wodFiles

  useEffect(() => {
    let cancelled = false

    notePersistence.listNotes({ ids: [canvasNoteId], projection: 'history-detail' }).then((entries) => {
      const results = entries[0]?.extendedResults ?? []
      if (cancelled) return
      setPersistedResults(results.sort((a, b) => b.completedAt - a.completedAt))
    }).catch(() => {
      if (!cancelled) setPersistedResults([])
    })

    return () => {
      cancelled = true
    }
  }, [canvasNoteId])

  const focusEditor = useCallback(() => {
    requestAnimationFrame(() => editorViewRef.current?.focus())
  }, [])

  // Fade-swap the editor content — clears any pending swap before starting.
  // Each source path keeps its own current edit, so switching examples is
  // predictable and never discards an experiment.
  const swapSource = useCallback((raw: string, sourceKey = raw) => {
    const saved = sourceEditsRef.current.get(sourceKey)
    const nextSource = saved?.current ?? raw
    const originalSource = saved?.original ?? raw

    if (!saved) {
      sourceEditsRef.current.set(sourceKey, {
        original: raw,
        current: raw,
      })
    }

    setActiveSourceKey(sourceKey)
    setActiveOriginalSource(originalSource)
    focusEditor()

    if (nextSource === editorSourceRef.current) {
      setIsEditorLoading(false)
      return
    }

    if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
    setIsEditorLoading(true)
    setEditorOpacity(0)
    swapTimerRef.current = setTimeout(() => {
      editorSourceRef.current = nextSource
      setEditorSource(nextSource)
      setEditorOpacity(1)
      setIsEditorLoading(false)
      swapTimerRef.current = null
      focusEditor()
    }, 180)
  }, [focusEditor])

  const handleEditorChange = useCallback((value: string) => {
    setEditorSource(value)
    editorSourceRef.current = value
    const sourceState = sourceEditsRef.current.get(activeSourceKey) ?? {
      original: activeOriginalSource,
      current: activeOriginalSource,
    }
    sourceEditsRef.current.set(activeSourceKey, {
      ...sourceState,
      current: value,
    })
  }, [activeOriginalSource, activeSourceKey])

  const resetActiveSource = useCallback(() => {
    const sourceState = sourceEditsRef.current.get(activeSourceKey)
    const original = sourceState?.original ?? activeOriginalSource
    sourceEditsRef.current.set(activeSourceKey, {
      original,
      current: original,
    })
    editorSourceRef.current = original
    setEditorSource(original)
    setActiveOriginalSource(original)
    focusEditor()
  }, [activeOriginalSource, activeSourceKey, focusEditor])

  // When a content override arrives (e.g. from search bar workout selection), swap it in.
  const prevContentOverride = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (contentOverride && contentOverride !== prevContentOverride.current) {
      prevContentOverride.current = contentOverride
      swapSource(contentOverride, `content-override:${contentOverride}`)
    }
  }, [contentOverride, swapSource])

  // Tracks the compiled WodBlocks from the NoteEditor so set-state:track can grab one
  const wodBlocksRef = useRef<WodBlock[]>([])
  const launchViewRuntime = useCallback((block: WodBlock) => {
    activeViewBlockRef.current = block
    activeRuntimes.set(block.id, block)
    setActiveViewRuntimeId(uuidv4())
    setViewTimerBlock(block)
    setPanelMode('running')
  }, [])

  // Called when the view-mode runtime stops or the user closes it
  const closeViewRuntime = useCallback(() => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setActiveViewRuntimeId(null)
    setViewTimerBlock(null)
    setPanelMode('editor')
  }, [])

  // Called when a view-mode runtime completes naturally
  const handleViewComplete = useCallback((blockId: string, results: WorkoutResults) => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setViewTimerBlock(null)

    if (results) {
      const runtimeId = activeViewRuntimeId ?? uuidv4()
      const nextResult: WorkoutResult = {
        id: runtimeId,
        noteId: canvasNoteId,
        segmentId: blockId,
        sectionId: blockId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }

      setPersistedResults((previous) => {
        const deduped = previous.filter((result) => result.id !== nextResult.id)
        return [nextResult, ...deduped].sort((a, b) => b.completedAt - a.completedAt)
      })

      notePersistence.mutateNote(canvasNoteId, {
        workoutResult: {
          id: runtimeId,
          sectionId: blockId,
          data: results,
          completedAt: results.endTime || Date.now(),
        },
      }).catch(() => {})
    }

    setActiveViewRuntimeId(null)
    if (results.completed && results.logs && results.logs.length > 0) {
      const { segments } = getAnalyticsFromLogs(results.logs as any, results.startTime)
      setReviewSegments(segments)
    } else {
      setReviewSegments([])
    }
    setSelectedSegmentIds(new Set())
    setPanelMode('review')
  }, [activeViewRuntimeId, canvasNoteId])

  // Whether any active runtime is currently tracked for view-mode reconnect
  const hasActiveViewRuntime = viewTimerBlock !== null

  // ── Query-param tracking: ?h=section-slug ───────────────────────────────
  const [headingParam, setHeadingParam] = useQueryState('h', {
    history: 'replace',
    shallow: true,
  })
  const [collectionQuery] = useQueryState('q', {
    defaultValue: '',
    shallow: true,
  })

  // ── NavActionDeps — single dispatch object for all INavAction surfaces ──────
  const deps = useMemo<NavActionDeps>(() => ({
    navigate: (to, opts) => navigate(to, { replace: opts?.replace }),
    setQueryParam: (params, replace) => {
      // Only h= is managed here; other params passed through as needed
      const h = params['h']
      if (h !== undefined) setHeadingParam(h, { history: replace ? 'replace' : 'push' })
    },
    swapSource: (source: string) => swapSource(resolveSource(source, wodFilesRef.current), source),
    setPanelState: (state, open) => {
      if (state === 'note') {
        closeViewRuntime()
      } else if (state === 'review') {
        setPanelMode('review')
      } else if (state === 'track') {
        const block = wodBlocksRef.current[0] ?? null
        if (!block) return
        if (open === 'view')   launchViewRuntime(block)
        else if (open === 'route') {
          const runtimeId = uuidv4()
          pendingRuntimes.set(runtimeId, { block, noteId: canvasNoteId })
          navigate(runPath(runtimeId))
        } else {
          setFullscreenBlock(block)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [navigate, swapSource, launchViewRuntime, closeViewRuntime])

  // Stable ref so observer callbacks never close over stale deps
  const depsRef = useRef(deps)
  depsRef.current = deps

  const activateSection = useCallback((section: CanvasSection) => {
    setActiveSectionId(section.id)
    setActiveSectionTitle(section.heading)
    setActiveSectionTheme(getSectionTheme(section))

    const sectionExamples = section.examples ?? []
    if (sectionExamples.length > 0) {
      const selectedIndex = selectedExamples[section.id] ?? 0
      const example = sectionExamples[selectedIndex] ?? sectionExamples[0]
      if (example?.source) {
        swapSource(resolveSource(example.source, wodFilesRef.current), example.source)
      }
    }

    for (const cmd of section.commands) {
      const steps = cmd.pipeline
        .filter(step => !(sectionExamples.length > 0 && step.action === 'set-source'))
        .map(step => pipelineStepToNavAction(step, cmd.open ?? 'view'))

      if (steps.length === 0) continue

      executeNavAction(
        steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
        depsRef.current,
      )
    }
  }, [selectedExamples, swapSource])

  const handleExampleSelect = useCallback((section: CanvasSection, index: number) => {
    setSelectedExamples((previous) => ({ ...previous, [section.id]: index }))
    setPanelMode('editor')
    setActiveSectionId(section.id)
    setActiveSectionTitle(section.heading)
    setActiveSectionTheme(getSectionTheme(section))

    const example = section.examples?.[index]
    if (example?.source) {
      swapSource(resolveSource(example.source, wodFilesRef.current), example.source)
    }
  }, [swapSource])

  useEffect(() => () => {
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
  }, [])

  // Expose imperative panel actions to parent (e.g. HomeWelcome action bar).
  // We use mutable refs for all handlers so the panel actions object is stable
  // but always calls the *current* function — avoids stale-closure bugs.
  const launchViewRuntimeRef  = useRef(launchViewRuntime)
  const closeViewRuntimeRef   = useRef(closeViewRuntime)
  const setPanelModeRef       = useRef(setPanelMode)
  const setFullscreenBlockRef = useRef(setFullscreenBlock)
  launchViewRuntimeRef.current  = launchViewRuntime
  closeViewRuntimeRef.current   = closeViewRuntime
  setPanelModeRef.current       = setPanelMode
  setFullscreenBlockRef.current = setFullscreenBlock

  const onPanelActionsReadyRef = useRef(onPanelActionsReady)
  onPanelActionsReadyRef.current = onPanelActionsReady
  useEffect(() => {
    onPanelActionsReadyRef.current?.({
      run: () => {
        const block = wodBlocksRef.current[0] ?? null
        if (block) launchViewRuntimeRef.current(block)
      },
      reset: () => closeViewRuntimeRef.current(),
      results: () => setPanelModeRef.current('review'),
      fullscreen: () => {
        const block = wodBlocksRef.current[0] ?? null
        if (block) setFullscreenBlockRef.current(block)
      },
      getSource: () => editorSourceRef.current,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // RunButtonState — state for the run/reconnect ButtonGroup
  const runState: RunButtonState = {
    isReconnect: hasActiveViewRuntime && panelMode !== 'running',
    onReconnect: () => setPanelMode('running'),
    onRun:       () => deps.setPanelState?.('track', 'view'),
    onFullscreen:() => deps.setPanelState?.('track', 'route'),
  }

  // ── IntersectionObserver — ratio-map so only the most-visible section wins ──
  // This prevents the flicker of multiple sections firing simultaneously on load.

  const stepRefs = useRef<Map<string, Element>>(new Map())
  const lastActiveSectionId = useRef<string | null>(null)
  const ratioMap = useRef(new Map<string, number>())
  const scrollDirRef = useRef<1 | -1>(1)
  const activationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // True once the user (or a programmatic scroll-to) has actually moved the page.
  // Prevents the observer from writing ?h= or firing scroll-commands on the
  // initial layout pass before any scrolling has occurred.
  const hasUserScrolledRef  = useRef(false)

  const setStepRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) stepRefs.current.set(id, el)
    else    stepRefs.current.delete(id)
  }, [])

  useEffect(() => {
    if (contentSections.length === 0) return

    // Seed the flag so navigating back to a pre-scrolled position works correctly.
    hasUserScrolledRef.current = window.scrollY > 0

    let lastScrollY = window.scrollY
    const trackScroll = () => {
      const y = window.scrollY
      if (y !== lastScrollY) {
        scrollDirRef.current = y > lastScrollY ? 1 : -1
        hasUserScrolledRef.current = true
      }
      lastScrollY = y
    }
    window.addEventListener('scroll', trackScroll, { passive: true })

    // Use a tighter top dead-zone on mobile to account for the sticky panel
    // sitting below the global nav bar (mirrors the ParallaxSection pattern).
    const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches
    const rootMargin = isMobile ? `-${MOBILE_STICKY_TOP}px 0px -20% 0px` : '-30% 0px -30% 0px'

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-section-id')
          if (!id) return
          if (entry.isIntersecting) ratioMap.current.set(id, entry.intersectionRatio)
          else                      ratioMap.current.delete(id)
        })

        if (ratioMap.current.size === 0) return

        let bestId: string | null = null
        if (scrollDirRef.current === -1) {
          // Scrolling up: pick the topmost (earliest in doc order) intersecting section
          let bestOrder = Infinity
          ratioMap.current.forEach((_, id) => {
            const order = contentSections.findIndex(s => s.id === id)
            if (order >= 0 && order < bestOrder) { bestOrder = order; bestId = id }
          })
        } else {
          // Scrolling down: pick the section with the highest intersection ratio
          let bestRatio = -1
          ratioMap.current.forEach((ratio, id) => {
            if (ratio > bestRatio) { bestRatio = ratio; bestId = id }
          })
        }

        if (bestId && bestId !== lastActiveSectionId.current) {
          lastActiveSectionId.current = bestId

          if (activationTimerRef.current) clearTimeout(activationTimerRef.current)
          activationTimerRef.current = setTimeout(() => {
            // Guard: only update URL and fire scroll-commands after the user (or a
            // programmatic restore-scroll) has actually moved the page. This
            // prevents the initial layout pass from immediately writing ?h= and
            // triggering view-source swaps before any interaction.
            if (!hasUserScrolledRef.current) return

            const section = contentSections.find(s => s.id === bestId)
            if (!section) return

            executeNavAction({ type: 'query', params: { h: bestId }, pushHistory: false }, depsRef.current)
            activateSection(section)
            activationTimerRef.current = null
          }, 200)
        }
      },
      { rootMargin, threshold: [0, 0.1, 0.25, 0.5, 0.75] },
    )

    stepRefs.current.forEach(el => observer.observe(el))
    return () => {
      observer.disconnect()
      if (activationTimerRef.current) clearTimeout(activationTimerRef.current)
      window.removeEventListener('scroll', trackScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activateSection, contentSections])

  // ── Initial scroll-to from ?h= query param ────────────────────────────────
  // Runs once after refs are populated (next frame after first render).
  const didInitialScroll = useRef(false)
  useEffect(() => {
    if (didInitialScroll.current || !headingParam || contentSections.length === 0) return
    didInitialScroll.current = true
    // rAF to ensure the DOM is painted and refs are attached before scrolling
    requestAnimationFrame(() => {
      const el = stepRefs.current.get(headingParam)
      if (!el) return
      const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - getPageStickyOffset(STICKY_NAV_HEIGHT)
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
    // Only run on mount — intentionally omitting headingParam from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSections])

  const previousCollectionQueryRef = useRef(collectionQuery)
  useEffect(() => {
    if (!isCollection) {
      previousCollectionQueryRef.current = collectionQuery
      return
    }

    const nextQuery = collectionQuery.trim()
    const previousQuery = previousCollectionQueryRef.current.trim()

    if (nextQuery && nextQuery !== previousQuery) {
      const listElement = document.getElementById('collection-workouts')
      if (listElement) {
        const top = listElement.getBoundingClientRect().top + window.scrollY - getPageStickyOffset(STICKY_NAV_HEIGHT)
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }

    previousCollectionQueryRef.current = collectionQuery
  }, [collectionQuery, isCollection])

  // ── Panel node — shared between desktop and mobile ────────────────────────

  const activePanelTheme = SECTION_THEME_STYLES[activeSectionTheme] ?? SECTION_THEME_STYLES.slate

  // ── Panel content: editor → running → review ─────────────────────────────
  const panelTitle =
    panelMode === 'running' ? 'Running…' :
    panelMode === 'review' ? 'Review' :
    isEditorLoading ? `${activeSectionTitle} · loading` : activeSectionTitle

  const panelContent = (() => {
    if (panelMode === 'running' && viewTimerBlock) {
      return (
        <RuntimeTimerPanel
          block={viewTimerBlock}
          autoStart
          onClose={closeViewRuntime}
          onComplete={handleViewComplete}
          isExpanded
        />
      )
    }
    if (panelMode === 'review') {
      return (
        <div className="flex flex-col h-full">
          {/* Back to editor */}
          <button
            onClick={() => setPanelMode('editor')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b border-border/40"
          >
            <ArrowLeft className="size-3" />
            Back to editor
          </button>
          <div className="flex-1 min-h-0 overflow-auto">
            <ReviewGrid
              runtime={null}
              segments={reviewSegments}
              selectedSegmentIds={selectedSegmentIds}
              onSelectSegment={(id, modifiers, visibleIds) => {
                setSelectedSegmentIds(prev => {
                  const next = new Set(prev)
                  if (modifiers?.ctrlKey) {
                    if (next.has(id)) next.delete(id); else next.add(id)
                  } else if (modifiers?.shiftKey && visibleIds) {
                    const lastId = Array.from(prev).pop()
                    if (lastId !== undefined) {
                      const startIdx = visibleIds.indexOf(lastId)
                      const endIdx = visibleIds.indexOf(id)
                      if (startIdx !== -1 && endIdx !== -1) {
                        const min = Math.min(startIdx, endIdx)
                        const max = Math.max(startIdx, endIdx)
                        for (let i = min; i <= max; i++) next.add(visibleIds[i])
                      } else { next.add(id) }
                    } else { next.add(id) }
                  } else { next.clear(); next.add(id) }
                  return next
                })
              }}
              groups={[]}
            />
          </div>
        </div>
      )
    }
    // Default: editor
    const isEditorDirty = editorSource !== activeOriginalSource
    return (
      <div style={{ opacity: editorOpacity, transition: 'opacity 180ms ease', height: '100%' }} className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-primary/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Try editing this example ↓</span>
          {isEditorDirty ? (
            <button
              type="button"
              onClick={resetActiveSource}
              className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-black text-primary transition-colors hover:bg-primary/10"
            >
              Reset to example
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">
          <NoteEditor
            noteId={canvasNoteId}
            value={editorSource}
            onChange={handleEditorChange}
            onBlocksChange={blocks => { wodBlocksRef.current = blocks }}
            onViewCreated={view => { editorViewRef.current = view }}
            theme={theme}
            readonly={false}
            showLineNumbers={false}
            enableOverlay={false}
            enableInlineRuntime={false}
            extendedResults={persistedResults}
            commands={[]}
            hideDefaultCommands={true}
            className="h-full"
          />
        </div>
      </div>
    )
  })()

  const showPanelButtons = viewDef && panelMode === 'editor'

  const desktopPanel = viewDef && (
    <div
      className="w-[60%] self-start sticky hidden lg:flex flex-col p-6 pt-8 pb-8 gap-3"
      style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(100vh - ${STICKY_NAV_HEIGHT}px)` }}
    >
      <div className="flex-1 min-h-0">
        <MacOSChrome title={panelTitle} headerActions={panelHeaderActions} className={cn('transition-colors duration-300', activePanelTheme.panel)}>
          {panelContent}
        </MacOSChrome>
      </div>
      {showPanelButtons && (
        <ViewPanelButtons
          activations={viewDef.buttons.map((b, i) => buttonToActivation(b, i))}
          runState={runState}
          deps={deps}
        />
      )}
    </div>
  )

  const mobilePanel = viewDef && (
    <div
      className="lg:hidden sticky z-20 shrink-0 px-4 pt-[2px] pb-1"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
    >
      <div className="flex flex-col gap-2" style={{ height: '100%' }}>
        <div className="flex-1 min-h-0">
          <MacOSChrome title={panelTitle} headerActions={panelHeaderActions} className={cn('transition-colors duration-300', activePanelTheme.panel)}>
            {panelContent}
          </MacOSChrome>
        </div>
        {showPanelButtons && (
          <ViewPanelButtons
            activations={viewDef.buttons.map((b, i) => buttonToActivation(b, i))}
            runState={runState}
            deps={deps}
          />
        )}
      </div>
    </div>
  )

  const renderCanvasSection = ({
    section,
    idx,
    prose,
    blockId,
    keySuffix,
    showHeading = true,
    showEyebrow = true,
    renderButtons = true,
    registerForObserver = false,
  }: {
    section: CanvasSection
    idx: number
    prose?: string
    blockId: string
    keySuffix: string
    showHeading?: boolean
    showEyebrow?: boolean
    renderButtons?: boolean
    registerForObserver?: boolean
  }) => {
    const fullBleed = isFullBleed(section)
    const dark = isDark(section)
    const density = getSectionDensity(section)
    const sectionTheme = getSectionThemeStyles(section)
    const isActiveSection = activeSectionId === section.id
    const trimmedProse = prose?.trim() ?? ''
    const examples = section.examples ?? []
    const activeExampleIndex = selectedExamples[section.id] ?? 0

    return (
      <div
        key={`${section.id}-${keySuffix}`}
        id={blockId}
        ref={registerForObserver ? setStepRef(section.id) : undefined}
        data-section-id={registerForObserver ? section.id : undefined}
        className={cn(
          'group relative border-b border-border/50 transition-colors duration-300',
          viewDef
            ? fullBleed
              ? 'min-h-[35vh] flex items-center justify-center py-12 lg:py-16 px-6 lg:px-10'
              : density === 'compact'
                ? 'py-10 lg:py-12 px-6 lg:px-10'
                : 'py-14 lg:py-20 px-6 lg:px-10'
            : density === 'compact'
              ? 'py-10 lg:py-12 px-6 lg:px-12'
              : 'py-16 lg:py-20 px-6 lg:px-12',
          dark && 'bg-muted/20 overflow-hidden',
          !dark && !fullBleed && (idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.18]'),
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b opacity-0 transition-opacity duration-300',
            sectionTheme.accent,
            isActiveSection && 'opacity-100',
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute left-0 top-0 h-full w-1 origin-top rounded-r-full bg-gradient-to-b transition-all duration-300',
            sectionTheme.progress,
            isActiveSection ? 'scale-y-100 opacity-100' : 'scale-y-[0.18] opacity-25',
          )}
        />
        {dark && (
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        )}

        <div className={cn(
          'relative',
          viewDef
            ? fullBleed ? 'max-w-md w-full text-center' : 'max-w-sm'
            : 'max-w-4xl w-full mx-auto',
        )}>
          {showEyebrow && (!fullBleed || !viewDef) && (
            <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
              {String(idx + 1).padStart(2, '0')}
            </div>
          )}

          {showHeading ? (
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
              {section.heading}
            </h2>
          ) : null}

          {trimmedProse ? <CanvasProse prose={trimmedProse} className="mb-6" /> : null}

          {examples.length > 0 ? (
            <ExampleTabs
              examples={examples}
              activeIndex={Math.min(activeExampleIndex, examples.length - 1)}
              onSelect={(index) => handleExampleSelect(section, index)}
            />
          ) : null}

          {renderButtons ? (
            <SectionButtons
              activations={section.buttons.map((b, i) => buttonToActivation(b, i))}
              fullBleed={fullBleed}
              runState={viewDef ? runState : undefined}
              deps={deps}
            />
          ) : null}
        </div>
      </div>
    )
  }

  const renderCollectionListSection = (key: string) => (
    <div
      key={key}
      id="collection-workouts"
      className="border-b border-border/50 bg-card"
    >
      <div className="w-full mx-auto">
        <CollectionWorkoutsList
          category={collectionSlug ?? ''}
          workoutItems={workoutItems ?? []}
          onSelect={handleSelectWorkout}
          showSearch={false}
          variant="flat"
        />
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {fullscreenBlock && (
        <FullscreenTimer
          block={fullscreenBlock}
          onClose={() => setFullscreenBlock(null)}
          autoStart
          onCompleteWorkout={() => setFullscreenBlock(null)}
        />
      )}

      {/* ── Content sections ─────────────────────────────────────────────── */}
      <section className="relative border-b border-border/50">
        <div className="lg:flex">

          {stickyAlign === 'left' && desktopPanel}

          {/* ── Scrolling text column ─────────────────────────────────── */}
          <div className={cn('w-full', viewDef && 'lg:w-[40%]')}>
            {mobilePanel}

            {heroSlot}

            {contentSections.map((section, idx) => {
              if (isCollection && collectionSlug && workoutItems && section.prose.includes('{{workouts}}')) {
                const [beforeProse = '', afterProse = ''] = section.prose.split('{{workouts}}')

                return [
                  renderCanvasSection({
                    section,
                    idx,
                    prose: beforeProse,
                    blockId: section.id,
                    keySuffix: 'before-workouts',
                    renderButtons: false,
                    registerForObserver: true,
                  }),
                  renderCollectionListSection(`${section.id}-workouts`),
                  afterProse.trim() || section.buttons.length > 0 ? renderCanvasSection({
                    section,
                    idx,
                    prose: afterProse,
                    blockId: `${section.id}-after`,
                    keySuffix: 'after-workouts',
                    showHeading: false,
                    showEyebrow: false,
                  }) : null,
                ]
              }

              return renderCanvasSection({
                section,
                idx,
                prose: section.prose,
                blockId: section.id,
                keySuffix: 'default',
                registerForObserver: true,
              })
            })}

            {/* Collection workouts list fallback if tag not found in any section */}
            {isCollection && !hasWorkoutsTag && collectionSlug && workoutItems && (
              renderCollectionListSection('collection-workouts-fallback')
            )}
          </div>

          {stickyAlign === 'right' && desktopPanel}
        </div>
      </section>
    </div>
  )
}
