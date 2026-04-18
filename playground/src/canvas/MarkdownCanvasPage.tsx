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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, Eye, Maximize2, Play } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResults } from '@/components/Editor/types'
import { MacOSChrome } from '../components/MacOSChrome'
import { SplitButton } from '@/components/ui/SplitButton'
import { cn } from '@/lib/utils'
import { CanvasProse } from './CanvasProse'
import { executeNavAction } from '../nav/navTypes'
import type { INavActivation, NavActionDeps, INavAction } from '../nav/navTypes'
import type { ParsedCanvasPage, CanvasSection, PipelineStep, OpenMode } from './parseCanvasMarkdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WorkoutItem } from '../App'
import { pendingRuntimes, activeRuntimes } from '../runtimeStore'
import { CollectionWorkoutsList } from '../views/queriable-list/CollectionWorkoutsList'
import { getCategoryForCollection } from '../config/collectionGroups'

// Match the existing parallax constants exactly
const STICKY_NAV_HEIGHT = 104
const MOBILE_STICKY_TOP = 65

// ── Source resolution ─────────────────────────────────────────────────────────

function resolveSource(dslPath: string, wodFiles: Record<string, string>): string {
  // Explicit markdown/canvas/ path
  if (dslPath.startsWith('markdown/')) {
    const key = '../../' + dslPath
    if (wodFiles[key]) return wodFiles[key]
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
    if (wodFiles[canvasKey]) return wodFiles[canvasKey]
    
    const collectionsKey = '../../markdown/collections/' + dslPath
    if (wodFiles[collectionsKey]) return wodFiles[collectionsKey]
    
    key = '../../markdown/' + dslPath
  }
  return wodFiles[key] ?? `# Source not found\n\nPath: \`${dslPath}\`\nResolved: \`${key}\``
}

// ── Section attribute helpers ─────────────────────────────────────────────────

const hasAttr  = (s: CanvasSection, a: string) => s.attrs.includes(a)
const isFullBleed = (s: CanvasSection) => hasAttr(s, 'full-bleed')
const isDark      = (s: CanvasSection) => hasAttr(s, 'dark')

// ── Pipeline → INavAction converter ──────────────────────────────────────────

/** Convert a single stringly-typed PipelineStep to a typed INavAction. */
function pipelineStepToNavAction(step: PipelineStep, open: OpenMode = 'dialog'): INavAction {
  if (step.action === 'set-source') return { type: 'view-source', source: step.value }
  if (step.action === 'navigate')   return { type: 'route', to: step.value }
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
      <SplitButton
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
      <SplitButton
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

// ── Main component ────────────────────────────────────────────────────────────

export interface MarkdownCanvasPageProps {
  page: ParsedCanvasPage
  /** The workoutFiles glob map from App.tsx (keyed `../../markdown/**‌/*.md`). */
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
  onSchedule?: (item: WorkoutItem, date: Date) => void
}

export function MarkdownCanvasPage({ page, wodFiles, theme, workoutItems, onSelect, onSchedule }: MarkdownCanvasPageProps) {
  const navigate = useNavigate()
  const { sections, route } = page

  const isCollection = route.startsWith('/collections/')
  const collectionSlug = isCollection ? route.split('/').pop() : null

  // Check if any section has the {{workouts}} tag
  const hasWorkoutsTag = sections.some(s => s.prose.includes('{{workouts}}'))

  // Hero = first section; content = the rest (observed by IntersectionObserver)
  const contentSections = sections.slice(1)

  // View definition — carries the initial source and alignment
  const viewDef = sections.find(s => s.view)?.view ?? null
  const chromeTitle  = viewDef?.name ?? 'WodScript'
  const stickyAlign  = viewDef?.align ?? 'right'

  // Keep editor source in both state (for the NoteEditor value prop) and a ref
  // (so the observer callback never closes over a stale string).
  const initialSource = viewDef?.source ? resolveSource(viewDef.source, wodFiles) : ''
  const [editorSource, setEditorSource] = useState(initialSource)
  const [editorOpacity, setEditorOpacity] = useState(1)
  const editorSourceRef = useRef(initialSource)
  const swapTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tracks the compiled WodBlocks from the NoteEditor so set-state:track can grab one
  const wodBlocksRef = useRef<WodBlock[]>([])

  // ── Panel state machine ────────────────────────────────────────────────────
  // 'editor'    — NoteEditor shown (default)
  // 'running'   — RuntimeTimerPanel shown (open: view)
  // 'review'    — FullscreenReview shown inline after completion
  type PanelMode = 'editor' | 'running' | 'review'
  const [panelMode, setPanelMode] = useState<PanelMode>('editor')
  const [viewTimerBlock, setViewTimerBlock] = useState<WodBlock | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  // Block that was last launched in view mode — kept for reconnect support
  const activeViewBlockRef = useRef<WodBlock | null>(null)

  // ── Fullscreen (dialog) block ───────────────────────────────────────────
  const [fullscreenBlock, setFullscreenBlock] = useState<WodBlock | null>(null)

  // Stable ref for wodFiles so the observer never stale-closes over a new map
  const wodFilesRef = useRef(wodFiles)
  wodFilesRef.current = wodFiles

  // Fade-swap the editor content — clears any pending swap before starting
  const swapSource = useCallback((raw: string) => {
    if (raw === editorSourceRef.current) return
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
    setEditorOpacity(0)
    swapTimerRef.current = setTimeout(() => {
      editorSourceRef.current = raw
      setEditorSource(raw)
      setEditorOpacity(1)
      swapTimerRef.current = null
    }, 180)
  }, [])

  // Launch a block in view (inline) mode
  const launchViewRuntime = useCallback((block: WodBlock) => {
    activeViewBlockRef.current = block
    activeRuntimes.set(block.id, block)
    setViewTimerBlock(block)
    setPanelMode('running')
  }, [])

  // Called when the view-mode runtime stops or the user closes it
  const closeViewRuntime = useCallback(() => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setViewTimerBlock(null)
    setPanelMode('editor')
  }, [])

  // Called when a view-mode runtime completes naturally
  const handleViewComplete = useCallback((_blockId: string, results: WorkoutResults) => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setViewTimerBlock(null)
    if (results.completed && results.logs && results.logs.length > 0) {
      const { segments } = getAnalyticsFromLogs(results.logs as any, results.startTime)
      setReviewSegments(segments)
    } else {
      setReviewSegments([])
    }
    setPanelMode('review')
  }, [])

  // Whether any active runtime is currently tracked for view-mode reconnect
  const hasActiveViewRuntime = viewTimerBlock !== null

  // ── Query-param tracking: ?h=section-slug ───────────────────────────────
  const [headingParam, setHeadingParam] = useQueryState('h', {
    history: 'replace',
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
    swapSource: (source: string) => swapSource(resolveSource(source, wodFilesRef.current)),
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
          pendingRuntimes.set(runtimeId, { block, noteId: '' })
          navigate(`/tracker/${runtimeId}`)
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

  // RunButtonState — state for the run/reconnect SplitButton
  const runState: RunButtonState = {
    isReconnect: hasActiveViewRuntime && panelMode !== 'running',
    onReconnect: () => setPanelMode('running'),
    onRun:       () => deps.setPanelState?.('track', 'view'),
    onFullscreen:() => deps.setPanelState?.('track', 'route'),
  }

  // ── IntersectionObserver — ratio-map so only the most-visible section wins ──
  // This prevents the flicker of multiple sections firing simultaneously on load.

  const stepRefs            = useRef<Map<string, Element>>(new Map())
  const lastActiveSectionId = useRef<string | null>(null)
  const ratioMap            = useRef(new Map<string, number>())
  const scrollDirRef        = useRef<1 | -1>(1)

  const setStepRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) stepRefs.current.set(id, el)
    else    stepRefs.current.delete(id)
  }, [])

  useEffect(() => {
    if (contentSections.length === 0) return

    let lastScrollY = window.scrollY
    const trackScroll = () => {
      const y = window.scrollY
      if (y !== lastScrollY) scrollDirRef.current = y > lastScrollY ? 1 : -1
      lastScrollY = y
    }
    window.addEventListener('scroll', trackScroll, { passive: true })

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
          // Update ?h= via RouteQueryAction (replaceState — no history flood)
          executeNavAction({ type: 'query', params: { h: bestId }, pushHistory: false }, depsRef.current)
          const section = contentSections.find(s => s.id === bestId)
          if (section) {
            for (const cmd of section.commands) {
              // Scroll-triggered commands default to 'view' (inline panel).
              const steps = cmd.pipeline.map(s => pipelineStepToNavAction(s, cmd.open ?? 'view'))
              executeNavAction(
                steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
                depsRef.current,
              )
            }
          }
        }
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75] },
    )

    stepRefs.current.forEach(el => observer.observe(el))
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', trackScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSections])

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
      const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT - 24
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
    // Only run on mount — intentionally omitting headingParam from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSections])

  // ── Panel node — shared between desktop and mobile ────────────────────────

  // ── Panel content: editor → running → review ─────────────────────────────
  const panelTitle =
    panelMode === 'running' ? 'Running…' :
    panelMode === 'review'  ? 'Review'   :
    chromeTitle

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
            <div className="p-3">
              {reviewSegments.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Workout complete — {reviewSegments.length} segment{reviewSegments.length !== 1 ? 's' : ''} recorded.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Workout complete.</p>
              )}
            </div>
          </div>
        </div>
      )
    }
    // Default: editor
    return (
      <div style={{ opacity: editorOpacity, transition: 'opacity 180ms ease', height: '100%' }}>
        <NoteEditor
          value={editorSource}
          onChange={v => { setEditorSource(v); editorSourceRef.current = v }}
          onBlocksChange={blocks => { wodBlocksRef.current = blocks }}
          theme={theme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={false}
          enableInlineRuntime={false}
          commands={[]}
          className="h-full"
        />
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
        <MacOSChrome title={panelTitle}>
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
          <MacOSChrome title={panelTitle}>
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

            {/* Category chip — collection detail pages only */}
            {isCollection && collectionSlug && (() => {
              const category = getCategoryForCollection(collectionSlug)
              if (!category) return null
              const slug = category.toLowerCase()
              return (
                <div className="px-6 lg:px-12 pt-6 pb-0">
                  <button
                    onClick={() => navigate(`/collections?categories=${slug}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {category}
                  </button>
                </div>
              )
            })()}

            {contentSections.map((section, idx) => {
              const fullBleed = isFullBleed(section)
              const dark      = isDark(section)

              return (
                <div
                  key={section.id}
                  id={section.id}
                  ref={setStepRef(section.id)}
                  data-section-id={section.id}
                  className={cn(
                    'border-b border-border/50',
                    viewDef
                      ? fullBleed
                        ? 'min-h-[35vh] flex items-center justify-center py-12 lg:py-16 px-6 lg:px-10'
                        : 'min-h-[70vh] lg:min-h-screen flex items-center py-16 lg:py-24 px-6 lg:px-10'
                      : 'py-16 lg:py-24 px-6 lg:px-12',
                    dark && 'bg-muted/20 relative overflow-hidden',
                    !dark && !fullBleed && (idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.18]'),
                  )}
                >
                  {dark && (
                    <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
                  )}

                  <div className={cn(
                    'relative',
                    viewDef
                      ? fullBleed ? 'max-w-md w-full text-center' : 'max-w-sm'
                      : 'max-w-4xl w-full mx-auto',
                  )}>
                    {/* Eyebrow — section index in the existing primary-colored style */}
                    {(!fullBleed || !viewDef) && (
                      <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                    )}

                    <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
                      {section.heading}
                    </h2>

                    {section.prose && (
                      (() => {
                        if (isCollection && collectionSlug && workoutItems && section.prose.includes('{{workouts}}')) {
                          const parts = section.prose.split('{{workouts}}')
                          return (
                            <>
                              {parts[0] && <CanvasProse prose={parts[0]} className="mb-6" />}
                              <div className="h-[600px] flex flex-col mb-6">
                                <CollectionWorkoutsList
                                  category={collectionSlug}
                                  workoutItems={workoutItems}
                                  onSelect={onSelect ?? (() => {})}
                                  onSchedule={onSchedule}
                                />
                              </div>
                              {parts[1] && <CanvasProse prose={parts[1]} className="mb-6" />}
                            </>
                          )
                        }
                        
                        return viewDef
                          ? <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
                              {section.prose}
                            </p>
                          : <CanvasProse prose={section.prose} className="mb-6" />
                      })()
                    )}

                    <SectionButtons
                      activations={section.buttons.map((b, i) => buttonToActivation(b, i))}
                      fullBleed={fullBleed}
                      runState={viewDef ? runState : undefined}
                      deps={deps}
                    />
                  </div>
                </div>
              )
            })}

            {/* Collection workouts list fallback if tag not found in any section */}
            {isCollection && !hasWorkoutsTag && collectionSlug && workoutItems && (
              <div 
                id="collection-workouts"
                className="min-h-[70vh] flex flex-col py-16 lg:py-24 px-6 lg:px-10 bg-background border-t border-border/50"
              >
                <div className="max-w-sm mb-12">
                  <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
                    Explore
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
                    Collection Workouts
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Browse and search every workout in the {collectionSlug.replace(/-/g, ' ')} collection.
                  </p>
                </div>

                <div className="flex-1 min-h-[500px] h-[600px] flex flex-col">
                  <CollectionWorkoutsList
                    category={collectionSlug}
                    workoutItems={workoutItems}
                    onSelect={onSelect ?? (() => {})}
                    onSchedule={onSchedule}
                  />
                </div>
              </div>
            )}
          </div>

          {stickyAlign === 'right' && desktopPanel}
        </div>
      </section>
    </div>
  )
}
