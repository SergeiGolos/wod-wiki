/**
 * ScrollCanvasPage.tsx — markdown-driven scroll runway renderer.
 *
 * The ```scroll DSL's page component: an author adds one fenced block to
 * a canvas markdown page and gets a home-tour-style runway — typewriter
 * into a live editor, cross-fading captions, editor highlight ring,
 * transient toasts, stage-bar progress, quest completion on stage entry,
 * and a prefers-reduced-motion static card fallback — with no bespoke
 * React. Structure mirrors the home tour (tour/HomeTour.tsx) but every
 * stage/caption/toast/ring comes from the parsed ScrollSpec.
 *
 * Trailing page sections (everything after the hero) render below the
 * runway through the same CanvasSection molecule MarkdownCanvasPage uses,
 * so onward nav buttons keep working.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer'
import { FullscreenReview } from '@/components/organisms/review/FullscreenReview'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { ScriptBlock } from '@/components/Editor/types'
import { useCanvasRuntime } from '../hooks/useCanvasRuntime'
import { useCompletionChallenge } from '../hooks/useCompletionChallenge'
import { useSyntaxChallenge } from '../hooks/useSyntaxChallenge'
import { CanvasSection as CanvasSectionCard } from '../components/molecules/CanvasSection'
import type { NavActionDeps } from '../nav/navTypes'
import type { WorkoutItem } from '../App'
import {
  type ParsedCanvasPage,
  type CanvasSection,
  type ScrollStage,
} from './parseCanvasMarkdown'
import { resolveSource } from './canvasUtils'
import { clamp01, lerp, quadOut } from './scrollRunway'
import { useScrollRunway } from './useScrollRunway'
import { useScrollTypewriter } from './useScrollTypewriter'
import { useScrollQuests } from './useScrollQuests'
import { ScrollCaption } from './ScrollCaption'
import { ScrollToast } from './ScrollToast'
import { ScrollRing } from './ScrollRing'
import { CanvasProse } from './CanvasProse'

export interface ScrollCanvasPageProps {
  page: ParsedCanvasPage
  wodFiles: Record<string, string>
  theme: string
  workoutItems: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
  onScrollToSection?: (sectionId: string) => void
}

export function ScrollCanvasPage({
  page,
  wodFiles,
  theme,
  onScrollToSection,
}: ScrollCanvasPageProps) {
  const scroll = page.scroll!
  const stages = scroll.stages
  const navigate = useNavigate()

  // Reduced motion: checked once — the runway is replaced by static cards.
  const [prefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const runwayRef = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)
  // Effect targets touched last frame — reset when their stage goes inactive.
  const touchedEffectsRef = useRef<Set<string>>(new Set())

  // ── Editor document + per-stage sources ──
  const sourcesByStageId = useMemo(
    () =>
      Object.fromEntries(
        stages.map((s) => [s.id, s.source ? resolveSource(s.source, wodFiles) : '']),
      ),
    [stages, wodFiles],
  )
  const [doc, setDoc] = useState(() => sourcesByStageId[stages[0]?.id] ?? '')
  const blocksRef = useRef<ScriptBlock[]>([])
  const [liveBlock, setLiveBlock] = useState<ScriptBlock | null>(null)

  // ── Playground mode: typing freezes the scroll scrub ──
  const [interactive, setInteractive] = useState(false)

  // ── Scroll driver ──
  const { slice, subscribe, resync } = useScrollRunway(runwayRef, interactive, stages)

  const { userDiverged } = useScrollTypewriter({
    sourcesByStageId,
    doc,
    setDoc,
    subscribe,
    enabled: !interactive && scroll.typewriter && !prefersReducedMotion,
  })

  // ── Quests: scroll milestones + validation challenges share the ledger ──
  const markStageViewed = useScrollQuests(page.route, page.quests, stages)
  useEffect(() => {
    if (!interactive) markStageViewed(slice.stage.id)
  }, [interactive, slice.stage.id, markStageViewed])

  const canvasNoteId = `canvas:scroll:${page.route}`
  const getBlock = useCallback(() => blocksRef.current[0] ?? null, [])
  const runtime = useCanvasRuntime({ canvasNoteId, getBlock })

  const challenge = useSyntaxChallenge({
    pageRoute: page.route,
    quests: page.quests,
    block: liveBlock,
  })

  useCompletionChallenge({
    pageRoute: page.route,
    quests: page.quests,
    fullscreen: runtime.fullscreen,
  })

  // Re-sync scroll state after exiting playground mode.
  useEffect(() => {
    if (!interactive) {
      const id = requestAnimationFrame(resync)
      return () => cancelAnimationFrame(id)
    }
  }, [interactive, resync])

  // Re-emit on stage change so visuals mounted by the new stage (toast)
  // get their first imperative frame immediately — subscribers otherwise
  // only fire on scroll events, leaving a just-mounted toast invisible
  // until the next scroll tick.
  const stageId = slice.stage.id
  useEffect(() => {
    const id = requestAnimationFrame(resync)
    return () => cancelAnimationFrame(id)
  }, [stageId, resync])

  // ── Imperative scrub: toast fade + author-declared effects ──
  useEffect(() => {
    // Every effect declared on any stage; `stages` lists the ids it applies to.
    const allEffects = stages.flatMap((s) => s.effects ?? [])
    return subscribe((s) => {
      // Toast: fade in at stage open, out by mid-stage (fixed math, v1).
      const toast = toastRef.current
      if (toast) {
        const tIn = clamp01((s.t - 0.04) / 0.12)
        const tOut = clamp01((s.t - 0.5) / 0.2)
        toast.style.opacity = String(Math.max(0, tIn - tOut))
        toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
      }

      // Custom parallax on [data-effect-target] elements.
      const root = rootRef.current
      if (!root) return
      const touched = new Set<string>()
      for (const fx of allEffects) {
        if (!fx.stages.includes(s.stage.id)) continue
        touched.add(fx.target)
        const [inStart, inEnd] = fx.in ?? [0, 1]
        const k = inEnd > inStart ? clamp01((s.t - inStart) / (inEnd - inStart)) : 1
        const e = fx.ease === 'linear' ? k : quadOut(k)
        root.querySelectorAll<HTMLElement>(`[data-effect-target="${fx.target}"]`).forEach((el) => {
          if (fx.opacity) el.style.opacity = String(lerp(fx.opacity[0], fx.opacity[1], e))
          if (fx.translateY) el.style.transform = `translateY(${lerp(fx.translateY[0], fx.translateY[1], e)}px)`
        })
      }
      // Clear targets whose stage is no longer active.
      for (const target of touchedEffectsRef.current) {
        if (touched.has(target)) continue
        root.querySelectorAll<HTMLElement>(`[data-effect-target="${target}"]`).forEach((el) => {
          el.style.opacity = ''
          el.style.transform = ''
        })
      }
      touchedEffectsRef.current = touched
    })
  }, [subscribe, stages])

  // ── Nav deps for trailing sections (buttons, pipelines) ──
  const [, setHeadingParam] = useQueryState('h', { history: 'replace', shallow: true })
  const deps = useMemo<NavActionDeps>(
    () => ({
      navigate: (to: string, opts?: { replace?: boolean }) => navigate(to, { replace: opts?.replace }),
      setQueryParam: (params: Record<string, string | null>, replace?: boolean) => {
        const h = params['h']
        if (h !== undefined) setHeadingParam(h, { history: replace ? 'replace' : 'push' })
      },
      swapSource: (source: string) => setDoc(resolveSource(source, wodFiles)),
      setPanelState: (state: 'note' | 'track' | 'review') => {
        if (state === 'track') {
          const block = getBlock()
          if (block) runtime.setFullscreen({ kind: 'timer', block, results: null })
        }
      },
    }),
    [navigate, setHeadingParam, wodFiles, getBlock, runtime.setFullscreen],
  )

  const handleExampleSelect = useCallback(
    (section: CanvasSection, index: number) => {
      const example = section.examples?.[index]
      if (example?.source) setDoc(resolveSource(example.source, wodFiles))
    },
    [wodFiles],
  )

  // User typing diverges from the typewriter trace → playground mode
  // (freeze the scrub, hand over the editor). Driven by the typewriter's
  // divergence detection, NOT raw onChange: NoteEditor echoes
  // programmatic `value` writes through onChange, which would otherwise
  // freeze the scrub on the first typewriter keystroke.
  useEffect(() => {
    if (userDiverged) setInteractive(true)
  }, [userDiverged])

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    const next = blocks[0] ?? null
    blocksRef.current = blocks
    setLiveBlock((prev) =>
      prev?.content === next?.content && prev?.id === next?.id ? prev : next,
    )
  }, [])

  const startRun = useCallback(() => {
    const block = getBlock()
    if (block) runtime.setFullscreen({ kind: 'timer', block, results: null })
  }, [getBlock, runtime.setFullscreen])

  const activeAccent = slice.stage.accent ?? 'hsl(var(--foreground))'
  const noteTitle = `${page.route.split('/').pop() ?? 'note'}.md`

  // ── Reduced-motion fallback: static cards + IO quest firing ──
  const cardsRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!prefersReducedMotion || typeof IntersectionObserver === 'undefined') return
    const list = cardsRef.current
    if (!list) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const stageId = (entry.target as HTMLElement).dataset.cardId
          if (stageId) markStageViewed(stageId)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.4 },
    )
    list.querySelectorAll('[data-card-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [prefersReducedMotion, markStageViewed])

  // Trailing sections (hero skipped — its view IS the runway's editor).
  const trailingSections = page.sections.slice(1)
  const trailing = trailingSections.map((section, idx) => (
    <CanvasSectionCard
      key={section.id}
      section={section}
      idx={idx}
      blockId={section.id}
      keySuffix="scroll"
      isActive={false}
      hasViewDef={false}
      deps={deps}
      onExampleSelect={handleExampleSelect}
      selectedExampleIndex={0}
      challengeQuests={challenge.quests}
      onScrollToSection={onScrollToSection}
    />
  ))

  return (
    <div ref={rootRef} className="flex flex-col min-h-screen bg-background" data-testid="scroll-canvas-page">
      {runtime.fullscreen?.kind === 'timer' && (
        <FullscreenTimer
          block={runtime.fullscreen.block}
          onClose={() => runtime.setFullscreen(null)}
          autoStart
          onCompleteWorkout={(_blockId, results) => {
            const block = getBlock()
            if (block) {
              runtime.handleWorkoutComplete(block, results)
              const { segments } = getAnalyticsFromLogs(results.logs || [], results.startTime)
              runtime.setFullscreen({ kind: 'review', segments, results })
            }
          }}
        />
      )}

      {runtime.fullscreen?.kind === 'review' && (
        <FullscreenReview
          segments={runtime.fullscreen.segments}
          onClose={() => runtime.setFullscreen(null)}
          title="Workout Review"
        />
      )}

      {prefersReducedMotion ? (
        <section className="px-6 pt-4 pb-24" data-testid="scroll-static-cards">
          <div ref={cardsRef} className="mx-auto max-w-2xl">
            {stages.map((stage, i) => (
              <article
                key={stage.id}
                data-card-id={stage.id}
                className="mb-6 rounded-2xl border border-border bg-card p-7"
              >
                <div
                  className="font-mono text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: stage.accent ?? 'hsl(var(--muted-foreground))' }}
                >
                  {String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
                </div>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {stage.id.replace(/-/g, ' ')}
                </h3>
                {stage.caption && (
                  <CanvasProse prose={stage.caption} className="mt-3 text-sm text-muted-foreground" />
                )}
                {sourcesByStageId[stage.id] && (
                  <pre className="mt-5 overflow-x-auto rounded-lg bg-background px-4 py-4 font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
                    {sourcesByStageId[stage.id]}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section ref={runwayRef} className="relative" style={{ height: scroll.runway }}>
          <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
            {/* stage bar */}
            <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {interactive ? 'Playground mode' : slice.stage.id.replace(/-/g, ' ')}
              </div>
              <div className="flex items-center gap-1.5">
                {stages.map((seg: ScrollStage, i: number) => {
                  const live = slice.index === i
                  const done = slice.index > i
                  return (
                    <span
                      key={seg.id}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: live ? 30 : 10,
                        background: live
                          ? (seg.accent ?? 'hsl(var(--foreground))')
                          : done
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--foreground) / 0.15)',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* stage main */}
            <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 items-center justify-center gap-[clamp(24px,3.5vw,56px)] px-6 pb-5 max-lg:flex-col max-lg:justify-start lg:px-12">
              {/* editor canvas */}
              <div className="relative aspect-[1200/720] w-[min(920px,calc(100%-400px))] max-w-full flex-none max-lg:aspect-auto max-lg:h-[50vh] max-lg:w-full">
                <MacOSChrome
                  title={noteTitle}
                  className="absolute inset-x-2 top-2 bottom-2"
                  headerActions={
                    <button
                      type="button"
                      title="Run the workout"
                      onClick={startRun}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Play size={11} fill="currentColor" />
                      Run
                    </button>
                  }
                >
                  <div className="relative h-full">
                    <NoteEditor
                      noteId={canvasNoteId}
                      value={doc}
                      onChange={setDoc}
                      onBlocksChange={handleBlocksChange}
                      theme={theme}
                      readonly={false}
                      showLineNumbers={false}
                      enableOverlay={false}
                      enableInlineRuntime={false}
                      forceFullscreenReview
                      className="h-full"
                    />
                    {slice.stage.toast && (
                      <ScrollToast ref={toastRef} text={slice.stage.toast} accent={activeAccent} />
                    )}
                  </div>
                </MacOSChrome>
                {slice.ring && !interactive && (
                  <ScrollRing tag={slice.ring.tag} accent={activeAccent} />
                )}
              </div>

              <ScrollCaption stages={stages} activeIndex={slice.index} />
            </div>

            {/* playground-mode exit pill */}
            {interactive && (
              <button
                type="button"
                onClick={() => setInteractive(false)}
                className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 font-mono text-[10px] tracking-[0.06em] text-background opacity-95 transition-opacity hover:opacity-100"
              >
                ▶ Playground mode — {userDiverged ? 'your edits are kept' : 'editing'} · tap here to return to the tour
              </button>
            )}
          </div>
        </section>
      )}

      {trailing}
    </div>
  )
}
