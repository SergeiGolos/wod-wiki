/**
 * MarkdownCanvasPage — thin page wrapper for the interactive canvas.
 *
 * Composes:
 *   SplitCanvasTemplate (layout)
 *   CanvasProsePanel    (scrolling prose column)
 *   CanvasEditorPanel   (sticky editor/runtime/review panel)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { useQueryState } from 'nuqs'
import type { EditorView } from '@codemirror/view'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer'
import { RuntimeTimerPanel } from '@/components/organisms/editor/RuntimeTimerPanel'
import { ReviewGrid } from '@/components/organisms/review/ReviewGrid'
import { useDebugMode } from '@/contexts/DebugModeContext'
import { useActiveScrollSection } from '@/hooks/useActiveScrollSection'
import { useCanvasRuntime } from '../hooks/useCanvasRuntime'
import { CanvasProsePanel } from '../components/organisms/canvas/CanvasProsePanel'
import { CanvasEditorPanel } from '../components/organisms/canvas/CanvasEditorPanel'
import { SplitCanvasTemplate } from '../templates/SplitCanvasTemplate'
import {
  getCanvasNoteId,
  resolveSource,
  STICKY_NAV_HEIGHT,
  INITIAL_SOURCE_KEY,
} from './canvasUtils'
import { getSectionTheme, getSectionThemeStyles } from './canvasSectionUtils'
import { pipelineStepToNavAction, executeNavAction } from '../nav/navTypes'
import type { NavActionDeps } from '../nav/navTypes'
import type { ParsedCanvasPage, CanvasSection } from './parseCanvasMarkdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WorkoutItem } from '../App'
import { notePersistence } from '@/services/persistence'

export interface MarkdownCanvasPageProps {
  page: ParsedCanvasPage
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
  contentOverride?: string
  panelHeaderActions?: React.ReactNode
  onPanelActionsReady?: (actions: PanelActions) => void
  heroSlot?: React.ReactNode
}

export interface PanelActions {
  run: () => void
  reset: () => void
  results: () => void
  fullscreen: () => void
  getSource: () => string
}

export function MarkdownCanvasPage({
  page,
  wodFiles,
  theme,
  workoutItems,
  onSelect,
  contentOverride,
  panelHeaderActions,
  onPanelActionsReady,
  heroSlot,
}: MarkdownCanvasPageProps) {
  const navigate = useNavigate()
  const { isDebugMode } = useDebugMode()
  const { sections, route } = page
  const canvasNoteId = useMemo(() => getCanvasNoteId(route), [route])

  const isCollection = route.startsWith('/collections/')
  const collectionSlug = isCollection ? (route.split('/').pop() ?? null) : null

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

  const hasWorkoutsTag = sections.some((s) => s.prose.includes('{{workouts}}'))
  const contentSections = sections.slice(1)

  const viewDef = sections.find((s) => s.view)?.view ?? null
  const stickyAlign = viewDef?.align ?? 'right'
  const initialActiveSection = contentSections[0] ?? sections[0] ?? null

  // Editor state
  const initialSource = viewDef?.source ? resolveSource(viewDef.source, wodFiles) : ''
  const initialSourceKey = viewDef?.source || INITIAL_SOURCE_KEY
  const [editorSource, setEditorSource] = useState(initialSource)
  const [editorOpacity, setEditorOpacity] = useState(1)
  const [isEditorLoading, setIsEditorLoading] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(initialActiveSection?.id ?? null)
  const [activeSectionTitle, setActiveSectionTitle] = useState(initialActiveSection?.heading ?? 'Whiteboard Script')
  const [activeSectionTheme, setActiveSectionTheme] = useState(() =>
    getSectionTheme(initialActiveSection ?? sections[0] ?? { id: 'default', heading: 'Whiteboard Script', level: 1, attrs: [], prose: '', commands: [], buttons: [] })
  )
  const [selectedExamples, setSelectedExamples] = useState<Record<string, number>>({})
  const [activeSourceKey, setActiveSourceKey] = useState(initialSourceKey)
  const [activeOriginalSource, setActiveOriginalSource] = useState(initialSource)
  const editorSourceRef = useRef(initialSource)
  const editorViewRef = useRef<EditorView | null>(null)
  const sourceEditsRef = useRef(new Map([[initialSourceKey, { original: initialSource, current: initialSource }]]))
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wodFilesRef = useRef(wodFiles)
  wodFilesRef.current = wodFiles

  // Runtime hook
  const getBlock = useCallback(() => wodBlocksRef.current[0] ?? null, [])
  const runtime = useCanvasRuntime({ canvasNoteId, navigate, getBlock })

  // Persisted results loading
  useEffect(() => {
    let cancelled = false
    notePersistence.listNotes({ ids: [canvasNoteId], projection: 'history-detail' }).then((entries) => {
      const results = entries[0]?.extendedResults ?? []
      if (cancelled) return
      runtime.setPersistedResults(results.sort((a, b) => b.completedAt - a.completedAt))
    }).catch(() => {
      if (!cancelled) runtime.setPersistedResults([])
    })
    return () => { cancelled = true }
  }, [canvasNoteId])

  const focusEditor = useCallback(() => {
    requestAnimationFrame(() => editorViewRef.current?.focus())
  }, [])

  const swapSource = useCallback((raw: string, sourceKey = raw) => {
    const saved = sourceEditsRef.current.get(sourceKey)
    const nextSource = saved?.current ?? raw
    const originalSource = saved?.original ?? raw

    if (!saved) {
      sourceEditsRef.current.set(sourceKey, { original: raw, current: raw })
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
    const sourceState = sourceEditsRef.current.get(activeSourceKey) ?? { original: activeOriginalSource, current: activeOriginalSource }
    sourceEditsRef.current.set(activeSourceKey, { ...sourceState, current: value })
  }, [activeOriginalSource, activeSourceKey])

  const resetActiveSource = useCallback(() => {
    const sourceState = sourceEditsRef.current.get(activeSourceKey)
    const original = sourceState?.original ?? activeOriginalSource
    sourceEditsRef.current.set(activeSourceKey, { original, current: original })
    editorSourceRef.current = original
    setEditorSource(original)
    setActiveOriginalSource(original)
    focusEditor()
  }, [activeOriginalSource, activeSourceKey, focusEditor])

  // Content override
  const prevContentOverride = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (contentOverride && contentOverride !== prevContentOverride.current) {
      prevContentOverride.current = contentOverride
      swapSource(contentOverride, `content-override:${contentOverride}`)
    }
  }, [contentOverride, swapSource])

  // WodBlocks ref
  const wodBlocksRef = useRef<WodBlock[]>([])

  // Activate section
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
        .filter((step) => !(sectionExamples.length > 0 && step.action === 'set-source'))
        .map((step) => pipelineStepToNavAction(step, cmd.open ?? 'view'))
      if (steps.length === 0) continue
      executeNavAction(
        steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
        depsRef.current,
      )
    }
  }, [selectedExamples, swapSource])

  const handleExampleSelect = useCallback((section: CanvasSection, index: number) => {
    setSelectedExamples((prev) => ({ ...prev, [section.id]: index }))
    runtime.setPanelMode('editor')
    setActiveSectionId(section.id)
    setActiveSectionTitle(section.heading)
    setActiveSectionTheme(getSectionTheme(section))

    const example = section.examples?.[index]
    if (example?.source) {
      swapSource(resolveSource(example.source, wodFilesRef.current), example.source)
    }
  }, [swapSource, runtime])

  // NavActionDeps
  const [headingParam, setHeadingParam] = useQueryState('h', { history: 'replace', shallow: true })
  const [collectionQuery] = useQueryState('q', { defaultValue: '', shallow: true })

  const deps = useMemo<NavActionDeps>(() => ({
    navigate: (to, opts) => navigate(to, { replace: opts?.replace }),
    setQueryParam: (params, replace) => {
      const h = params['h']
      if (h !== undefined) setHeadingParam(h, { history: replace ? 'replace' : 'push' })
    },
    swapSource: (source: string) => swapSource(resolveSource(source, wodFilesRef.current), source),
    setPanelState: runtime.setPanelState,
  }), [navigate, swapSource, setHeadingParam, runtime.setPanelState])

  const depsRef = useRef(deps)
  depsRef.current = deps

  // Scroll tracking
  const hasUserScrolledRef = useRef(false)
  useActiveScrollSection({
    ids: contentSections.map((s) => s.id),
    enabled: contentSections.length > 0,
    rootMargin: `-${STICKY_NAV_HEIGHT}px 0px -30% 0px`,
    threshold: [0, 0.1, 0.25, 0.5, 0.75],
    dataAttribute: 'data-section-id',
    scrollDirection: 'topmost-when-up',
    debounceMs: 50,
    shouldAcceptChange: () => {
      if (!hasUserScrolledRef.current) {
        hasUserScrolledRef.current = window.scrollY > 0
        return hasUserScrolledRef.current
      }
      return true
    },
    onChange: (id) => {
      const section = contentSections.find((s) => s.id === id)
      if (!section) return
      setHeadingParam(id, { history: 'replace' })
      activateSection(section)
    },
  })

  // Initial scroll-to from ?h=
  const didInitialScroll = useRef(false)
  useEffect(() => {
    if (didInitialScroll.current || !headingParam || contentSections.length === 0) return
    didInitialScroll.current = true
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-section-id="${headingParam}"]`)
      if (!el) return
      const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
  }, [contentSections, headingParam])

  // Collection query scroll
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
        const top = listElement.getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
    previousCollectionQueryRef.current = collectionQuery
  }, [collectionQuery, isCollection])

  // Panel actions ready
  const onPanelActionsReadyRef = useRef(onPanelActionsReady)
  onPanelActionsReadyRef.current = onPanelActionsReady
  useEffect(() => {
    onPanelActionsReadyRef.current?.({
      run: () => {
        const block = wodBlocksRef.current[0] ?? null
        if (block) runtime.launchViewRuntime(block)
      },
      reset: () => runtime.closeViewRuntime(),
      results: () => runtime.setPanelMode('review'),
      fullscreen: () => {
        const block = wodBlocksRef.current[0] ?? null
        if (block) runtime.setFullscreenBlock(block)
      },
      getSource: () => editorSourceRef.current,
    })
  }, [runtime])

  // Commands for InlineCommandBar on wod blocks
  const canvasCommands = useMemo<WodCommand[]>(() => [
    {
      id: 'run',
      label: 'Run',
      icon: <Play className="h-3 w-3 fill-current" />,
      primary: true,
      onClick: (block) => runtime.launchViewRuntime(block),
    },
  ], [runtime])

  const activePanelTheme = getSectionThemeStyles({ attrs: [`theme:${activeSectionTheme}`] } as any)

  const panelTitle =
    runtime.panelMode === 'running' ? 'Running…' :
    runtime.panelMode === 'review' ? 'Review' :
    isEditorLoading ? `${activeSectionTitle} · loading` : activeSectionTitle

  const panelContent = (() => {
    if (runtime.panelMode === 'running' && runtime.viewTimerBlock) {
      return (
        <RuntimeTimerPanel
          block={runtime.viewTimerBlock}
          autoStart
          onClose={runtime.closeViewRuntime}
          onComplete={runtime.handleViewComplete}
          isExpanded
        />
      )
    }
    if (runtime.panelMode === 'review') {
      return (
        <div className="flex flex-col h-full">
          <button
            onClick={() => runtime.setPanelMode('editor')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b border-border/40"
          >
            <ArrowLeft className="size-3" />
            Back to editor
          </button>
          <div className="flex-1 min-h-0 overflow-auto">
            <ReviewGrid
              runtime={null}
              segments={runtime.reviewSegments}
              selectedSegmentIds={runtime.selectedSegmentIds}
              gridViewPreset={isDebugMode ? 'debug' : 'default'}
              onSelectSegment={(id, modifiers, visibleIds) => {
                runtime.setSelectedSegmentIds((prev) => {
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
            onBlocksChange={(blocks) => { wodBlocksRef.current = blocks }}
            onViewCreated={(view) => { editorViewRef.current = view }}
            activeSectionId={activeSectionId}
            theme={theme}
            readonly={false}
            showLineNumbers={false}
            enableOverlay={false}
            enableInlineRuntime={false}
            extendedResults={runtime.persistedResults}
            commands={canvasCommands}
            hideDefaultCommands={false}
            className="h-full"
          />
        </div>
      </div>
    )
  })()

  const showPanelButtons = !!(viewDef && runtime.panelMode === 'editor')

  const desktopPanel = viewDef && (
    <CanvasEditorPanel
      variant="desktop"
      panelTitle={panelTitle}
      panelContent={panelContent}
      panelThemeClass={activePanelTheme.panel}
      headerActions={panelHeaderActions}
      showPanelButtons={showPanelButtons}
      viewDefButtons={viewDef.buttons}
      runState={runtime.runState}
      deps={deps}
    />
  )

  const mobilePanel = viewDef && (
    <CanvasEditorPanel
      variant="mobile"
      panelTitle={panelTitle}
      panelContent={panelContent}
      panelThemeClass={activePanelTheme.panel}
      headerActions={panelHeaderActions}
      showPanelButtons={showPanelButtons}
      viewDefButtons={viewDef.buttons}
      runState={runtime.runState}
      deps={deps}
    />
  )

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {runtime.fullscreenBlock && (
        <FullscreenTimer
          block={runtime.fullscreenBlock}
          onClose={() => runtime.setFullscreenBlock(null)}
          autoStart
          onCompleteWorkout={() => runtime.setFullscreenBlock(null)}
        />
      )}

      <SplitCanvasTemplate
        stickyAlign={stickyAlign as 'left' | 'right'}
        hasViewDef={!!viewDef}
        heroSlot={heroSlot}
        mobilePanel={mobilePanel}
        desktopPanel={desktopPanel}
      >
        <CanvasProsePanel
          contentSections={contentSections}
          isCollection={isCollection}
          collectionSlug={collectionSlug}
          workoutItems={workoutItems}
          handleSelectWorkout={handleSelectWorkout}
          activeSectionId={activeSectionId}
          selectedExamples={selectedExamples}
          runState={runtime.runState}
          deps={deps}
          handleExampleSelect={handleExampleSelect}
          hasWorkoutsTag={hasWorkoutsTag}
          hasViewDef={!!viewDef}
        />
      </SplitCanvasTemplate>
    </div>
  )
}
