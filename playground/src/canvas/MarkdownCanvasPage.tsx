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
import { Play } from 'lucide-react'
import { useQueryState } from 'nuqs'
import type { ScriptCommand } from '@/components/Editor/overlays/ScriptCommand'
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer'
import { useDebugMode } from '@/contexts/DebugModeContext'
import { useActiveScrollSection } from '@/hooks/useActiveScrollSection'
import { useIsMobile } from '../hooks/useIsMobile'
import { useCanvasRuntime } from '../hooks/useCanvasRuntime'
import { useCanvasEditorSource } from '../hooks/useCanvasEditorSource'
import { useMobileRunOverride } from '../hooks/useMobileRunOverride'
import { CanvasPanelContent } from './CanvasPanelContent'
import { CanvasSection as CanvasSectionCard } from '../components/molecules/CanvasSection'
import { CanvasProsePanel } from '../components/organisms/canvas/CanvasProsePanel'
import { CanvasEditorPanel } from '../components/organisms/canvas/CanvasEditorPanel'
import { SplitCanvasTemplate } from '../templates/SplitCanvasTemplate'
import { OnboardingBanner } from '../components/onboarding/OnboardingBanner'
import { ChallengeBanner } from '../components/molecules/ChallengeBanner'
import { useSyntaxChallenge } from '../hooks/useSyntaxChallenge'
import {
  getCanvasNoteId,
  resolveSource,
  blockHasTimer,
  resolveContentOwners,
  STICKY_NAV_HEIGHT,
  INITIAL_SOURCE_KEY,
} from './canvasUtils'
import { getSectionTheme, getSectionThemeStyles } from './canvasSectionUtils'
import { pipelineStepToNavAction, executeNavAction } from '../nav/navTypes'
import type { NavActionDeps } from '../nav/navTypes'
import { getSectionProse, type ParsedCanvasPage, type CanvasSection } from './parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
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
  heroSlot: heroSlotProp,
}: MarkdownCanvasPageProps) {
  const navigate = useNavigate()
  const { isDebugMode } = useDebugMode()
  const isMobile = useIsMobile()
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

  const hasWorkoutsTag = sections.some((s) => getSectionProse(s).includes('{{workouts}}'))
  const contentSections = sections.slice(1)

  const heroSection = sections[0] ?? null
  const heroHasContent = !!heroSection && (getSectionProse(heroSection).trim() !== '' || heroSection.buttons.length > 0)

  const viewDef = sections.find((s) => s.view)?.view ?? null
  const stickyAlign = viewDef?.align ?? 'right'
  const initialActiveSection = contentSections[0] ?? sections[0] ?? null

  const initialSource = viewDef?.source ? resolveSource(viewDef.source, wodFiles) : ''
  const initialSourceKey = viewDef?.source || INITIAL_SOURCE_KEY
  const [activeSectionId, setActiveSectionId] = useState<string | null>(initialActiveSection?.id ?? null)
  const [activeSectionTitle, setActiveSectionTitle] = useState(initialActiveSection?.heading ?? 'Whiteboard Script')
  // Tracks the heading of whichever section *owns* the panel's current
  // content (see `contentOwnerBySection` below). Sections that only narrate
  // the same code sample (e.g. "Plan"/"Run"/"Analytics" beats) show this
  // alongside their own title — "still looking at X" — instead of appearing
  // to desync from the content.
  const [contentOwnerTitle, setContentOwnerTitle] = useState(initialActiveSection?.heading ?? 'Whiteboard Script')

  // See `resolveContentOwners` in canvasUtils.ts for why ownership is
  // resolved from document position rather than from scroll-triggered side
  // effects (it's what makes scrolling back UP correctly restore content).
  const contentOwnerBySection = useMemo(() => resolveContentOwners(contentSections), [contentSections])
  const [activeSectionTheme, setActiveSectionTheme] = useState(() =>
    getSectionTheme(initialActiveSection ?? sections[0] ?? { id: 'default', heading: 'Whiteboard Script', level: 1, attrs: [], prose: '', commands: [], buttons: [] })
  )
  const [selectedExamples, setSelectedExamples] = useState<Record<string, number>>({})
  const {
    editorSource, editorOpacity, isEditorLoading, activeOriginalSource,
    swapSource, handleEditorChange, resetActiveSource,
    setEditorView, getSource,
  } = useCanvasEditorSource({ initialSource, initialSourceKey, contentOverride })
  const wodFilesRef = useRef(wodFiles)
  wodFilesRef.current = wodFiles

  // Runtime hook
  const getBlock = useCallback(() => scriptBlocksRef.current[0] ?? null, [])
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

  // Reactive state mirror of the first script block so quest validation
  // re-runs on every editor compile. Kept in sync via `onBlocksChange`.
  const [liveBlock, setLiveBlock] = useState<ScriptBlock | null>(null)

  // Page-level quests are extracted from ```quest fenced blocks by the
  // canvas parser and shipped on `page.quests`. They drive the challenge
  // banner and the syntax-validation hook.
  const pageQuests = page.quests ?? []

  const challenge = useSyntaxChallenge({
    pageRoute: page.route,
    quests: pageQuests,
    block: liveBlock,
  })

  // ScriptBlocks ref
  const scriptBlocksRef = useRef<ScriptBlock[]>([])

  // Id of whichever owner section's content is currently applied to the
  // panel (`null` means the original `view` source, before any owner).
  // Comparing against this — rather than reacting to "did this section have
  // steps" — is what lets re-entering a section (from either scroll
  // direction) skip a no-op re-apply while still correctly resetting when
  // the resolved owner actually changes.
  const appliedContentOwnerIdRef = useRef<string | null>(
    contentOwnerBySection.get(initialActiveSection?.id ?? '')?.id ?? null,
  )

  // Activate section
  const activateSection = useCallback((section: CanvasSection) => {
    setActiveSectionId(section.id)
    setActiveSectionTitle(section.heading)
    setActiveSectionTheme(getSectionTheme(section))

    const owner = contentOwnerBySection.get(section.id) ?? null
    setContentOwnerTitle(owner?.heading ?? initialActiveSection?.heading ?? 'Whiteboard Script')

    const ownerKey = owner?.id ?? null
    if (ownerKey === appliedContentOwnerIdRef.current) return
    appliedContentOwnerIdRef.current = ownerKey

    if (!owner) {
      // Scrolled back above the first content-owning section — restore the
      // panel's original source instead of leaving a later section's example
      // showing.
      swapSource(initialSource, initialSourceKey)
      return
    }

    const ownerExamples = owner.examples ?? []
    if (ownerExamples.length > 0) {
      const selectedIndex = selectedExamples[owner.id] ?? 0
      const example = ownerExamples[selectedIndex] ?? ownerExamples[0]
      if (example?.source) {
        swapSource(resolveSource(example.source, wodFilesRef.current), example.source)
      }
    }

    for (const cmd of owner.commands) {
      const steps = cmd.pipeline
        .filter((step) => !(ownerExamples.length > 0 && step.action === 'set-source'))
        .map((step) => pipelineStepToNavAction(step, cmd.open ?? 'view'))
      if (steps.length === 0) continue
      executeNavAction(
        steps.length === 1 ? steps[0] : { type: 'pipeline', steps },
        depsRef.current,
      )
    }
  }, [selectedExamples, swapSource, contentOwnerBySection, initialActiveSection, initialSource, initialSourceKey])

  const handleExampleSelect = useCallback((section: CanvasSection, index: number) => {
    setSelectedExamples((prev) => ({ ...prev, [section.id]: index }))
    runtime.setPanelMode('editor')
    setActiveSectionId(section.id)
    setActiveSectionTitle(section.heading)
    setActiveSectionTheme(getSectionTheme(section))
    setContentOwnerTitle(section.heading)
    appliedContentOwnerIdRef.current = section.id

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
        const block = scriptBlocksRef.current[0] ?? null
        if (!block) return
        if (isMobile && blockHasTimer(block)) {
          runtime.setFullscreenBlock(block)
        } else {
          runtime.launchViewRuntime(block)
        }
      },
      reset: () => runtime.closeViewRuntime(),
      results: () => runtime.setPanelMode('review'),
      fullscreen: () => {
        const block = scriptBlocksRef.current[0] ?? null
        if (block) runtime.setFullscreenBlock(block)
      },
      getSource,
    })
  }, [runtime, isMobile, getSource])

  // Commands for InlineCommandBar on wod blocks
  const canvasCommands = useMemo<ScriptCommand[]>(() => [
    {
      id: 'run',
      label: 'Run',
      icon: <Play className="h-3 w-3 fill-current" />,
      primary: true,
      onClick: (block) => {
        if (isMobile && blockHasTimer(block)) {
          runtime.setFullscreenBlock(block)
        } else {
          runtime.launchViewRuntime(block)
        }
      },
    },
  ], [runtime, isMobile])

  const activePanelTheme = getSectionThemeStyles({ attrs: [`theme:${activeSectionTheme}`] } as any)

  const panelTitle =
    runtime.panelMode === 'running' ? 'Running…' :
    runtime.panelMode === 'review' ? 'Review' :
    isEditorLoading ? `${activeSectionTitle} · loading` : activeSectionTitle

  // Only shown when the active section is narrating the same source the
  // panel already loaded (see `contentOwnerTitle` above) — makes it explicit
  // that the panel hasn't gone stale, it's just still on the same example.
  const panelSubtitle =
    runtime.panelMode === 'editor' && !isEditorLoading && activeSectionTitle !== contentOwnerTitle
      ? contentOwnerTitle
      : undefined


  // Stable `onBlocksChange` so the editor's internal effect (which depends on
  // the prop reference) doesn't refire every parent render. Guards on
  // content identity so a no-op re-emission from the editor doesn't
  // re-render the whole canvas page.
  const handleBlocksChange = useCallback(
    (blocks: ScriptBlock[]) => {
      const next = blocks[0] ?? null;
      scriptBlocksRef.current = blocks;
      setLiveBlock((prev) => {
        if (prev?.content === next?.content && prev?.id === next?.id) {
          return prev;
        }
        return next;
      });
    },
    [],
  )
  const panelContent = (
    <CanvasPanelContent
      panelMode={runtime.panelMode}
      viewTimerBlock={runtime.viewTimerBlock}
      reviewSegments={runtime.reviewSegments}
      selectedSegmentIds={runtime.selectedSegmentIds}
      setSelectedSegmentIds={runtime.setSelectedSegmentIds}
      setPanelMode={runtime.setPanelMode}
      closeViewRuntime={runtime.closeViewRuntime}
      handleViewComplete={runtime.handleViewComplete}
      editorSource={editorSource}
      editorOpacity={editorOpacity}
      activeOriginalSource={activeOriginalSource}
      handleEditorChange={handleEditorChange}
      resetActiveSource={resetActiveSource}
      canvasNoteId={canvasNoteId}
      theme={theme}
      commands={canvasCommands}
      activeSectionId={activeSectionId}
      onBlocksChange={handleBlocksChange}
      onViewCreated={setEditorView}
      persistedResults={runtime.persistedResults}
      isDebugMode={isDebugMode}
    />
  )

  const showPanelButtons = !!(viewDef && runtime.panelMode === 'editor')

  // On mobile, timer/wall-clock blocks always run fullscreen (not in-panel).
  const mobileRunState = useMobileRunOverride({
    isMobile,
    baseRunState: runtime.runState,
    setFullscreenBlock: runtime.setFullscreenBlock,
    scriptBlocksRef,
  })

  // Goal Gradient (ADR-0010): the home page gets an onboarding credit/progress
  // strip above the markdown hero. Other canvas routes are unaffected.
  const isHome = route === '/'
  const heroContent = heroSlotProp ?? (heroHasContent && heroSection ? (
    <CanvasSectionCard
      section={heroSection}
      idx={-1}
      prose={undefined}
      blockId={`${heroSection.id}-hero`}
      keySuffix="hero"
      showEyebrow={false}
      isActive={false}
      hasViewDef={!!viewDef}
      deps={deps}
      onExampleSelect={handleExampleSelect}
      selectedExampleIndex={0}
    />
  ) : null)
  const heroSlot = heroContent

  const activeHeaderActions = isHome ? (
    <div className="flex items-center gap-2">
      {panelHeaderActions}
      <OnboardingBanner chapters={page.chapters} />
    </div>
  ) : panelHeaderActions

  const desktopPanel = viewDef && (
    <CanvasEditorPanel
      variant="desktop"
      panelTitle={panelTitle}
      panelSubtitle={panelSubtitle}
      panelContent={panelContent}
      panelThemeClass={activePanelTheme.panel}
      headerActions={activeHeaderActions}
      runState={runtime.runState}
      deps={deps}
    />
  )

  const mobilePanel = viewDef && (
    <CanvasEditorPanel
      variant="mobile"
      panelTitle={panelTitle}
      panelSubtitle={panelSubtitle}
      panelContent={panelContent}
      panelThemeClass={activePanelTheme.panel}
      headerActions={activeHeaderActions}
      viewDefButtons={viewDef.buttons}
      runState={mobileRunState}
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
          runState={mobileRunState}
          deps={deps}
          handleExampleSelect={handleExampleSelect}
          hasWorkoutsTag={hasWorkoutsTag}
          hasViewDef={!!viewDef}
        />
      </SplitCanvasTemplate>

      {pageQuests.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <ChallengeBanner quests={challenge.quests} />
        </div>
      )}
    </div>
  )
}
