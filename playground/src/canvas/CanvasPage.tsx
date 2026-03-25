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

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useQueryState } from 'nuqs'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import { MacOSChrome } from '../components/MacOSChrome'
import { cn } from '@/lib/utils'
import { CanvasProse } from './CanvasProse'
import type { ParsedCanvasPage, CanvasSection, PipelineStep, OpenMode, ViewButton } from './parseCanvasMarkdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WorkoutItem } from '../App'
import { pendingRuntimes } from '../runtimeStore'

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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionButtons({
  section,
  fullBleed,
  onPipeline,
}: {
  section: CanvasSection
  fullBleed: boolean
  onPipeline: (p: PipelineStep[], open?: OpenMode) => void
}) {
  if (section.buttons.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-4 mt-8', fullBleed && 'justify-center')}>
      {section.buttons.map((btn, i) => (
        <button
          key={i}
          onClick={() => onPipeline(btn.pipeline, btn.open)}
          className={cn(
            'flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest rounded-full transition-all active:scale-95',
            i === 0
              ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:scale-[1.04]'
              : 'bg-background border border-border text-foreground hover:bg-muted',
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}

/** Buttons rendered directly on the sticky view panel (from the view block). */
function ViewPanelButtons({
  buttons,
  onPipeline,
}: {
  buttons: ViewButton[]
  onPipeline: (p: PipelineStep[], open?: OpenMode) => void
}) {
  if (buttons.length === 0) return null
  return (
    <div className="flex flex-wrap gap-3 justify-end pt-3 px-1">
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={() => onPipeline(btn.pipeline, btn.open)}
          className={cn(
            'px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-full transition-all active:scale-95',
            i === 0
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.04]'
              : 'bg-muted border border-border text-foreground hover:bg-muted/80',
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CanvasPageProps {
  page: ParsedCanvasPage
  /** The workoutFiles glob map from App.tsx (keyed `../../markdown/**‌/*.md`). */
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
}

export function CanvasPage({ page, wodFiles, theme, workoutItems, onSelect }: CanvasPageProps) {
  const navigate = useNavigate()
  const { sections, route } = page

  const isCollection = route.startsWith('/collections/')
  const collectionSlug = isCollection ? route.split('/').pop() : null
  const collectionWorkouts = isCollection && workoutItems 
    ? workoutItems.filter(item => item.category === collectionSlug)
    : []

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
  const [fullscreenBlock, setFullscreenBlock] = useState<WodBlock | null>(null)
  // Inline timer shown inside the sticky panel (open: view)
  const [viewTimerBlock, setViewTimerBlock] = useState<WodBlock | null>(null)

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

  const executePipeline = useCallback((pipeline: PipelineStep[], openMode: OpenMode = 'dialog') => {
    for (const step of pipeline) {
      if (step.action === 'set-source') {
        swapSource(resolveSource(step.value, wodFilesRef.current))
      } else if (step.action === 'navigate') {
        navigate(step.value)
      } else if (step.action === 'set-state' && step.value === 'track') {
        const block = wodBlocksRef.current[0] ?? null
        if (!block) break
        if (openMode === 'view') {
          setViewTimerBlock(block)
        } else if (openMode === 'dialog') {
          setFullscreenBlock(block)
        } else if (openMode === 'route') {
          const runtimeId = uuidv4()
          pendingRuntimes.set(runtimeId, { block, noteId: '' })
          navigate(`/tracker/${runtimeId}`)
        }
      }
    }
  }, [navigate, swapSource])

  // ── Query-param tracking: ?h=section-slug ───────────────────────────────
  const [headingParam, setHeadingParam] = useQueryState('h', {
    history: 'replace',
    shallow: true,
  })

  // ── IntersectionObserver — ratio-map so only the most-visible section wins ──
  // This prevents the flicker of multiple sections firing simultaneously on load.

  const stepRefs            = useRef<Map<string, Element>>(new Map())
  const lastActiveSectionId = useRef<string | null>(null)
  const ratioMap            = useRef(new Map<string, number>())
  const scrollDirRef        = useRef<1 | -1>(1)
  const executePipelineRef  = useRef(executePipeline)
  executePipelineRef.current = executePipeline
  const setHeadingParamRef  = useRef(setHeadingParam)
  setHeadingParamRef.current = setHeadingParam

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
          // Update ?h= query param without pushing a new history entry
          setHeadingParamRef.current(bestId)
          const section = contentSections.find(s => s.id === bestId)
          if (section) {
            for (const cmd of section.commands) {
              executePipelineRef.current(cmd.pipeline, cmd.open)
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

  // When a view-mode timer is active, swap the editor out for the timer panel
  const panelContent = viewTimerBlock ? (
    <RuntimeTimerPanel
      block={viewTimerBlock}
      autoStart
      onClose={() => setViewTimerBlock(null)}
      isExpanded
    />
  ) : (
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

  const desktopPanel = viewDef && (
    <div
      className="w-[60%] self-start sticky hidden lg:flex flex-col p-6 pt-8 pb-8 gap-3"
      style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(100vh - ${STICKY_NAV_HEIGHT}px)` }}
    >
      <div className="flex-1 min-h-0">
        <MacOSChrome title={viewTimerBlock ? 'Running' : chromeTitle}>
          {panelContent}
        </MacOSChrome>
      </div>
      {!viewTimerBlock && <ViewPanelButtons buttons={viewDef.buttons} onPipeline={executePipeline} />}
    </div>
  )

  const mobilePanel = viewDef && (
    <div
      className="lg:hidden sticky z-20 shrink-0 px-4 pt-[2px] pb-1"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
    >
      <div className="flex flex-col gap-2" style={{ height: '100%' }}>
        <div className="flex-1 min-h-0">
          <MacOSChrome title={viewTimerBlock ? 'Running' : chromeTitle}>
            {panelContent}
          </MacOSChrome>
        </div>
        {!viewTimerBlock && <ViewPanelButtons buttons={viewDef.buttons} onPipeline={executePipeline} />}
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
        />
      )}

      {/* ── Content sections ─────────────────────────────────────────────── */}
      <section className="relative border-b border-border/50">
        <div className="lg:flex">

          {stickyAlign === 'left' && desktopPanel}

          {/* ── Scrolling text column ─────────────────────────────────── */}
          <div className={cn('w-full', viewDef && 'lg:w-[40%]')}>
            {mobilePanel}

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
                      viewDef
                        ? <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
                            {section.prose}
                          </p>
                        : <CanvasProse prose={section.prose} className="mb-6" />
                    )}

                    <SectionButtons
                      section={section}
                      fullBleed={fullBleed}
                      onPipeline={executePipeline}
                    />
                  </div>
                </div>
              )
            })}

            {/* Collection workouts list if applicable */}
            {isCollection && (
              <div className="min-h-[50vh] flex flex-col py-16 lg:py-24 px-6 lg:px-10 bg-background border-t border-border/50">
                <div className="max-w-sm mb-12">
                  <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
                    List
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
                    Collection Workouts
                  </h2>
                </div>

                <div className="flex flex-col gap-4">
                  {collectionWorkouts.length > 0 ? (
                    collectionWorkouts.map((workout) => (
                      <button
                        key={workout.id}
                        onClick={() => onSelect?.(workout)}
                        className="group flex flex-col p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all text-left active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black uppercase tracking-widest text-primary">
                            Workout
                          </span>
                          <span className="text-xs font-bold text-muted-foreground uppercase">
                            Load &rarr;
                          </span>
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {workout.name}
                        </h3>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm font-medium">
                      No individual workouts found in this collection.
                    </div>
                  )}
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
