/**
 * HomeTour.tsx — the scroll-driven product walkthrough that is the homepage.
 *
 * Composition:
 *   TourHero → runway (sticky stage: macOS window + ring + captions)
 *            → TourOutro (real navigation actions).
 *
 * The window mounts REAL app screens (NoteEditor, RuntimeTimerPanel,
 * AnalyticsScorecard/ReviewGrid, collections + FeedFeed) and morphs between
 * them via scroll. Scroll scrubbing is rAF-throttled (useTourScroll);
 * per-frame visuals (TV parallax, toast, row stagger, mobile pan) mutate the
 * DOM imperatively — transform/opacity only.
 *
 * Playground mode: pressing Run in the editor freezes scroll sync and hands
 * the window to the visitor (real runtime; Stop → real analytics; ✕ / hint
 * pill exits back to scroll sync).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { encodeZip } from '../services/encodeZip'
import { resolveSource } from '../canvas/canvasUtils'
import { getAnalyticsFromLogs, getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer'
import { createJournalNoteFromWorkout } from '../services/journalWorkout'
import { playgroundRecorder } from '../services/resultRecorder'
import { NextAction } from '@/runtime/actions/stack/NextAction'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import { useQuickStartAutoComplete } from '../hooks/useQuickStartAutoComplete'
import { useCompletionChallenge } from '../hooks/useCompletionChallenge'
import { useTourScrollQuests } from '../hooks/useTourScrollQuests'
import type { FullscreenState } from '../hooks/useCanvasRuntime'
import {
  RingTargetsProvider,
  TourRing,
  useRingTargets,
} from './TourRing'
import { useTourScroll, scrollRunwayTo } from './useTourScroll'
import { useTypewriter } from './useTypewriter'
import type { ReactNode } from 'react'
import {
  TOUR_CANVAS_HEIGHT,
  TOUR_CANVAS_WIDTH,
  TOUR_MOBILE_BREAKPOINT,
  TOUR_RUNWAY_HEIGHT,
  TOUR_STAGES,
  type TourScreen,
  type TourStageId,
  type TourStageSlice,
} from './tourStages'
import { TourHero } from './TourHero'
import { TourCaptions, TOUR_CAPTIONS, CaptionBody } from './TourCaptions'
import { TourTvCard } from './TourTvCard'
import { TourOutro } from './TourOutro'
import { TourStaticCards } from './TourStaticCards'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourAnalyticsScreen } from './screens/TourAnalyticsScreen'
import { TourLibraryScreen } from './screens/TourLibraryScreen'

// ── Helpers ─────────────────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const SCREEN_TITLES: Record<TourScreen, string> = {
  editor: 'welcome-1.md',
  timer: 'WallClock',
  analytics: 'Session Review',
  library: 'Library',
}

const HOME_DEMO_SOURCE = 'wods/examples/home/welcome-1.md'

/** Home quest id → the tour stage that demonstrates it. Used by the quest
 *  list to scroll the runway back to the relevant section. */
const HOME_QUEST_STAGE: Record<string, TourStageId> = {
  'qs-arrive': 'overview',
  'qs-tour-editor': 'editor',
  'qs-tour-timer': 'timer',
  'qs-tour-analytics': 'analytics',
  'qs-tour-library': 'library',
  'qs-edit': 'editor',
  'qs-run': 'editor',
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface HomeTourProps {
  wodFiles: Record<string, string>
  theme: string
  /** Quick-start + scroll quests from the home canvas markdown
   *  (qs-arrive / qs-tour-* / qs-edit / qs-run). */
  quests: Quest[]
  /** Page-level chapters from the home canvas markdown (home-tour first). */
  chapters: Chapter[]
  /** Cross-page quest id → label, collected from every canvas route. */
  questLabels?: Record<string, string>
}

// ── Inner (needs RingTargetsContext) ────────────────────────────────────────

function HomeTourInner({ wodFiles, theme, quests, chapters, questLabels }: HomeTourProps) {
  const isMobile = useMediaQuery(`(max-width: ${TOUR_MOBILE_BREAKPOINT}px)`)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const runwayRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const canvasInnerRef = useRef<HTMLDivElement | null>(null)
  const captionsStripRef = useRef<HTMLDivElement | null>(null)
  const captionsViewportRef = useRef<HTMLDivElement | null>(null)
  const tvCardRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)

  const { registry } = useRingTargets()

  // ── Editor document + typewriter ──
  const script = useMemo(() => resolveSource(HOME_DEMO_SOURCE, wodFiles), [wodFiles])
  const [doc, setDoc] = useState('')
  const blocksRef = useRef<ScriptBlock[]>([])
  const runtimeRef = useRef<IScriptRuntime | null>(null)
  // State mirror of runtimeRef so the TV card re-renders when the timer
  // stage's runtime is created (the ref alone wouldn't trigger a render).
  const [tourRuntime, setTourRuntime] = useState<IScriptRuntime | null>(null)

  // ── Playground mode ──
  const [interactive, setInteractive] = useState<'timer' | 'analytics' | null>(null)

  // ── Scroll driver ──
  const { slice, subscribe, resync } = useTourScroll(runwayRef, interactive !== null)

  // Scroll-driven typewriter writes the demo script into the real editor.
  useTypewriter({ script, doc, setDoc, subscribe, enabled: interactive === null })

  const activeScreen: TourScreen = interactive ?? slice.stage.screen

  // ── Lazy screen mounting (mounted once entered, kept alive after) ──
  const [entered, setEntered] = useState<Record<TourScreen, boolean>>({
    editor: true,
    timer: false,
    analytics: false,
    library: false,
  })
  const timerAutoStartRef = useRef(false)

  useEffect(() => {
    setEntered((prev) => (prev[activeScreen] ? prev : { ...prev, [activeScreen]: true }))
    if (activeScreen === 'timer') timerAutoStartRef.current = true
  }, [activeScreen])

  // ── Session results (playground completion) + scroll-mode analytics ──
  const [session, setSession] = useState<{ segments: Segment[]; results: WorkoutResults } | null>(null)
  const [scrollSegments, setScrollSegments] = useState<Segment[]>([])
  // Journal-write state for playground completions. Drives the Session
  // Review title + hint pill so the UI only claims "logged" when it is.
  const [logState, setLogState] = useState<'logging' | 'logged' | 'failed' | null>(null)
  // Latest-value mirrors for callbacks with empty dep arrays.
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive
  const docRef = useRef(doc)
  docRef.current = doc

  useEffect(() => {
    if (interactive || slice.stage.id !== 'analytics' || session) return
    if (scrollSegments.length > 0) return
    const runtime = runtimeRef.current
    if (!runtime) return
    // Fast-forward the real runtime to completion: rep-based blocks only
    // advance on Next, so a scroll-driven session would otherwise sit on
    // block one forever. RuntimeTimerPanel's completion effect then fires
    // onComplete → real session results land in this screen.
    let guard = 0
    while (runtime.stack?.current && guard++ < 200) {
      runtime.do(new NextAction())
    }
    // Fallback if the completion path didn't produce a session.
    const { segments } = getAnalyticsFromRuntime(runtime)
    if (segments.length > 0) setScrollSegments(segments)
  }, [interactive, slice.stage.id, session, scrollSegments.length])

  const analyticsSegments = session?.segments ?? scrollSegments

  // ── TV card clock (mirrors the real session start) ──
  const timerStartedAtRef = useRef<number | null>(null)
  const [tvElapsed, setTvElapsed] = useState('00:00')
  useEffect(() => {
    if (activeScreen !== 'timer') return
    if (timerStartedAtRef.current == null) timerStartedAtRef.current = Date.now()
    const tick = () => setTvElapsed(fmtClock(Date.now() - (timerStartedAtRef.current ?? Date.now())))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [activeScreen])

  // ── Quests (preserved from the markdown-driven home) ──
  useQuickStartAutoComplete({
    pageRoute: '/',
    quests,
    initialSource: script,
    currentSource: doc,
  })
  const questFullscreen: FullscreenState =
    session != null ? { kind: 'review', segments: session.segments, results: session.results } : null
  useCompletionChallenge({ pageRoute: '/', quests, fullscreen: questFullscreen })

  // ── Scroll quests: each tour stage fires its qs-tour-* quest as the
  //    visitor scrolls it into view (scroll mode only, not playground). ──
  const markStageViewed = useTourScrollQuests('/', quests)
  useEffect(() => {
    if (interactive === null) markStageViewed(slice.stage.id)
  }, [interactive, slice.stage.id, markStageViewed])

  /** Quest list click → scroll the runway back to the matching stage.
   *  Reduced-motion fallback scrolls the static card into view instead. */
  const handleHomeQuestClick = useCallback((questId: string) => {
    const stageId = HOME_QUEST_STAGE[questId]
    if (!stageId) return
    const el = runwayRef.current
    if (el) {
      const stage = TOUR_STAGES.find((s) => s.id === stageId)
      if (stage) scrollRunwayTo(el, Math.min(stage.start + 0.02, stage.end - 0.005))
      return
    }
    const cardId = stageId === 'overview' ? 'editor' : stageId
    document
      .getElementById(`tour-card-${cardId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // ── Playground mode transitions ──
  const startRun = useCallback(() => {
    if (!blocksRef.current[0]) return
    setLogState(null)
    setEntered((prev) => (prev.timer ? prev : { ...prev, timer: true }))
    timerAutoStartRef.current = true
    setInteractive('timer')
  }, [])

  const exitPlayground = useCallback(() => setInteractive(null), [])

  // Re-sync scroll state after exiting playground mode.
  useEffect(() => {
    if (interactive === null) {
      const id = requestAnimationFrame(resync)
      return () => cancelAnimationFrame(id)
    }
  }, [interactive, resync])

  const handleTimerComplete = useCallback(
    (_blockId: string, results: WorkoutResults) => {
      const wasPlaygroundRun = interactiveRef.current === 'timer'
      const { segments } = getAnalyticsFromLogs(results.logs ?? [], results.startTime)
      setSession({ segments, results })
      setEntered((prev) => (prev.analytics ? prev : { ...prev, analytics: true }))
      setInteractive((mode) => (mode === 'timer' ? 'analytics' : mode))

      // Persist a real playground run to today's journal — the Session
      // Review claims "logged from timer", so make it true. The scroll-mode
      // fast-forward also fires onComplete; that showcase writes nothing.
      if (!wasPlaygroundRun) return
      const runBlock = blocksRef.current[0]
      if (!runBlock) return
      setLogState('logging')
      void (async () => {
        const note = await createJournalNoteFromWorkout({
          workoutName: 'Welcome workout',
          category: 'home',
          sourceNoteLabel: 'welcome-1.md',
          sourceNotePath: '/',
          wodContent: docRef.current,
        })
        await playgroundRecorder.record({
          runBlock,
          blockId: runBlock.id,
          noteId: note.id,
          resultId: crypto.randomUUID(),
          data: results,
          createdAt: results.endTime ?? Date.now(),
        })
        setLogState('logged')
      })().catch((err) => {
        console.error('[HomeTour] failed to log session to journal:', err)
        setLogState('failed')
      })
    },
    [],
  )

  const handleTimerClose = useCallback(() => {
    if (interactive) {
      exitPlayground()
      return
    }
    // Scroll mode: ✕ jumps back to the editor stage.
    const el = runwayRef.current
    if (el) scrollRunwayTo(el, 0.11)
  }, [interactive, exitPlayground])

  const handleRuntimeReady = useCallback((runtime: IScriptRuntime) => {
    runtimeRef.current = runtime
    setTourRuntime(runtime)
  }, [])

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    blocksRef.current = blocks
  }, [])

  // ── Share (preserved from HomeView) ──
  const handleShare = useCallback(async () => {
    if (!doc.trim()) return
    try {
      const encoded = await encodeZip(doc)
      const url = `${window.location.origin}${window.location.pathname}?z=${encoded}`
      await navigator.clipboard.writeText(url)
    } catch (err) {
      console.error('[HomeTour] share failed:', err)
    }
  }, [doc])

  // ── New Note (outro) ──
  const handleNewNote = useCallback(() => {
    setDoc('')
    const el = runwayRef.current
    if (el) scrollRunwayTo(el, 0.11)
  }, [])

  // ── Canvas scaling (fit width; mobile additionally pans to follow the ring) ──
  const scaleRef = useRef(1)
  // Current pan translate (read back out of measurements so the next frame's
  // math is transform-independent — measuring a panned target without this
  // creates a feedback loop that oscillates every scroll frame).
  const panRef = useRef({ x: 0, y: 0 })
  const latestSliceRef = useRef<TourStageSlice | null>(null)

  /**
   * Mobile: pan the zoomed canvas so the ring target stays in view.
   * inner has `origin-top-left`, so a target's canvas-space position is
   * (viewportRect − innerRect) / renderedScale — the current translate
   * cancels out and the computed pan is a stable fixed point.
   */
  const applyMobilePan = useCallback(
    (s: TourStageSlice | null) => {
      const canvas = canvasRef.current
      const inner = canvasInnerRef.current
      if (!canvas || !inner) return
      const innerRect = inner.getBoundingClientRect()
      const renderedScale = innerRect.width / TOUR_CANVAS_WIDTH || 1
      const scale = scaleRef.current
      // Untransformed origin of inner in viewport coords.
      const ox = innerRect.left - panRef.current.x
      const oy = innerRect.top - panRef.current.y

      let fx = TOUR_CANVAS_WIDTH / 2
      let fy = TOUR_CANVAS_HEIGHT / 2
      const target = s?.ring ? registry.current[s.ring.key] : null
      if (target) {
        const r = target.getBoundingClientRect()
        fx = (r.left + r.width / 2 - innerRect.left) / renderedScale
        fy = (r.top + r.height / 2 - innerRect.top) / renderedScale
      }

      const cr = canvas.getBoundingClientRect()
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      const w = TOUR_CANVAS_WIDTH * scale
      const h = TOUR_CANVAS_HEIGHT * scale

      let tx = cr.left + cw / 2 - fx * scale - ox
      let ty = cr.top + ch / 2 - fy * scale - oy
      // Clamp so the canvas always covers the viewport (center if it fits).
      tx =
        w <= cw
          ? cr.left + (cw - w) / 2 - ox
          : Math.min(cr.left - ox, Math.max(cr.left + cw - w - ox, tx))
      ty =
        h <= ch
          ? cr.top + (ch - h) / 2 - oy
          : Math.min(cr.top - oy, Math.max(cr.top + ch - h - oy, ty))

      panRef.current = { x: tx, y: ty }
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    },
    [registry],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const inner = canvasInnerRef.current
    if (!canvas || !inner) return
    const fit = () => {
      if (window.matchMedia(`(max-width: ${TOUR_MOBILE_BREAKPOINT}px)`).matches) {
        // Fit the canvas width exactly — no zoom. At 1.5× zoom the window is
        // wider than the viewport, and when the ring targets the whole window
        // the pan centers it, showing an empty middle slice with both sides
        // cut off. Fitting keeps the whole window + ring visible; the pan
        // clamp then just centers it.
        scaleRef.current = window.innerWidth / TOUR_CANVAS_WIDTH
        applyMobilePan(latestSliceRef.current)
      } else {
        scaleRef.current = canvas.clientWidth / TOUR_CANVAS_WIDTH
        panRef.current = { x: 0, y: 0 }
        inner.style.transform = `scale(${scaleRef.current})`
      }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [isMobile, applyMobilePan])

  // Mobile: each caption panel matches the caption viewport height exactly
  // (strip translate math assumes uniform panel heights — see the POC).
  useEffect(() => {
    if (!isMobile) return
    const viewport = captionsViewportRef.current
    const strip = captionsStripRef.current
    if (!viewport || !strip) return
    const apply = () => {
      Array.from(strip.children).forEach((c) => {
        ;(c as HTMLElement).style.height = `${viewport.clientHeight}px`
      })
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [isMobile])

  // ── Imperative scrub: TV parallax, toast, mobile pan + caption strip ──
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  useEffect(() => {
    return subscribe((s: TourStageSlice) => {
      latestSliceRef.current = s
      const st = s.stage

      // TV card parallax (timer stage, second beat)
      const tv = tvCardRef.current
      if (tv) {
        if (st.id === 'timer') {
          const k = clamp01((s.t - 0.6) / 0.22)
          const e = 1 - Math.pow(1 - k, 2)
          tv.style.opacity = String(k)
          tv.style.transform = `translateY(${lerp(90, 0, e)}px)`
        } else {
          tv.style.opacity = '0'
        }
      }

      // "Stopped → writing results" toast (analytics stage opening)
      const toast = toastRef.current
      if (toast) {
        if (st.id === 'analytics') {
          const tIn = clamp01((s.t - 0.04) / 0.12)
          const tOut = clamp01((s.t - 0.42) / 0.14)
          toast.style.opacity = String(Math.max(0, tIn - tOut))
          toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
        } else {
          toast.style.opacity = '0'
        }
      }

      // Mobile: pan the zoomed canvas to follow the ring; slide captions
      if (isMobileRef.current) {
        applyMobilePan(s)

        const strip = captionsStripRef.current
        const viewport = captionsViewportRef.current
        if (strip && viewport) {
          const slide = clamp01((s.t - 0.7) / 0.3)
          const stripIdx = Math.min(s.index + slide, TOUR_CAPTIONS.length - 1)
          strip.style.transform = `translateY(${-stripIdx * viewport.clientHeight}px)`
        }
      }
    })
  }, [subscribe, registry, applyMobilePan])

  // ── Stage bar segments ──
  const stageSegs = TOUR_STAGES.slice(1)

  if (prefersReducedMotion) {
    return (
      <div data-testid="home-tour">
        <TourHero />
        <TourStaticCards onCardVisible={markStageViewed} />
        <TourOutro
          onNewNote={handleNewNote}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={handleHomeQuestClick}
        />
      </div>
    )
  }

  return (
    <div data-testid="home-tour">
      <TourHero />

      {/* ── Runway ── */}
      <section ref={runwayRef} className="relative" style={{ height: TOUR_RUNWAY_HEIGHT }}>
        <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
          {/* stage bar */}
          <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {interactive ? 'Playground mode' : slice.stage.label}
            </div>
            <div className="flex items-center gap-1.5">
              {stageSegs.map((seg, i) => {
                const live = slice.index === i + 1
                const done = slice.index > i + 1
                return (
                  <span
                    key={seg.id}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: live ? 30 : 10,
                      background: live
                        ? seg.accent
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
          <div
            className={`mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 px-0 pb-0 lg:px-12 lg:pb-5 ${
              isMobile ? 'flex-col items-stretch justify-start gap-0' : 'items-center justify-center gap-[clamp(24px,3.5vw,56px)]'
            }`}
          >
            {/* canvas */}
            <div
              ref={canvasRef}
              className={
                isMobile
                  ? 'relative h-[47vh] w-screen flex-none overflow-hidden'
                  : 'relative aspect-[1200/720] w-[min(920px,calc(100vw-440px))] flex-none'
              }
            >
              <div
                ref={canvasInnerRef}
                className="absolute top-0 left-0 origin-top-left will-change-transform"
                style={{ width: TOUR_CANVAS_WIDTH, height: TOUR_CANVAS_HEIGHT }}
              >
                <MacOSChrome title={SCREEN_TITLES[activeScreen]} className="absolute inset-x-2 top-2 bottom-2">
                  <div className="relative h-full">
                    {entered.editor && (
                      <Screen visible={activeScreen === 'editor'}>
                        <TourEditorScreen
                          doc={doc}
                          onDocChange={setDoc}
                          onBlocksChange={handleBlocksChange}
                          onRun={startRun}
                          onShare={handleShare}
                          theme={theme}
                        />
                      </Screen>
                    )}
                    {entered.timer && (
                      <Screen visible={activeScreen === 'timer'}>
                        <TourTimerScreen
                          block={blocksRef.current[0] ?? null}
                          autoStart={timerAutoStartRef.current}
                          onClose={handleTimerClose}
                          onComplete={handleTimerComplete}
                          onRuntimeReady={handleRuntimeReady}
                        />
                      </Screen>
                    )}
                    {entered.analytics && (
                      <Screen visible={activeScreen === 'analytics'}>
                        <TourAnalyticsScreen
                          segments={analyticsSegments}
                          title={
                            logState === 'logging'
                              ? 'Journal / today · logging…'
                              : logState === 'failed'
                                ? 'Session Review · not saved to journal'
                                : 'Journal / today · logged from timer'
                          }
                        />
                      </Screen>
                    )}
                    {entered.library && (
                      <Screen visible={activeScreen === 'library'}>
                        <TourLibraryScreen subscribe={subscribe} />
                      </Screen>
                    )}

                    {/* stop toast */}
                    <div
                      ref={toastRef}
                      className="pointer-events-none absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border border-[hsl(var(--metric-rounds)/0.55)] bg-card px-5 py-2.5 font-mono text-[10.5px] tracking-[0.04em] opacity-0 shadow-xl"
                    >
                      <span className="size-[9px] rounded-sm bg-[hsl(var(--metric-rounds))]" />
                      Stopped at{' '}
                      {session ? fmtClock(session.results.duration) : tvElapsed} —{' '}
                      <b className="text-[hsl(var(--metric-rounds))]">writing results to Journal…</b>
                    </div>
                  </div>
                </MacOSChrome>

                <TourTvCard
                  ref={tvCardRef}
                  runtime={tourRuntime}
                />

                <TourRing
                  target={interactive ? null : slice.ring}
                  accent={slice.stage.accent}
                  canvasRef={canvasInnerRef}
                />
              </div>
            </div>

            {/* captions — desktop cross-fade / mobile bottom strip */}
            {isMobile ? (
              <div
                ref={captionsViewportRef}
                className="relative min-h-0 flex-1 overflow-hidden border-t border-border bg-background"
              >
                <div ref={captionsStripRef} className="absolute top-0 left-0 w-full will-change-transform">
                  {TOUR_CAPTIONS.map((cap) => (
                    <div key={cap.id} className="px-6 py-6" style={{ opacity: 1 }}>
                      <CaptionBody cap={cap} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <TourCaptions activeIndex={slice.index} />
            )}
          </div>

          {/* playground-mode hint pill */}
          {interactive && (
            <button
              type="button"
              onClick={exitPlayground}
              className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 font-mono text-[10px] tracking-[0.06em] text-background opacity-95 transition-opacity hover:opacity-100"
            >
              ▶ Playground mode —{' '}
              {interactive === 'timer'
                ? 'timer running · STOP to log it · tap here to exit'
                : logState === 'failed'
                  ? 'session not saved · tap here to return to the tour'
                  : logState === 'logging'
                    ? 'logging session… · tap here to return to the tour'
                    : 'session logged · tap here to return to the tour'}
            </button>
          )}
        </div>
      </section>

      <TourOutro
        onNewNote={handleNewNote}
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={handleHomeQuestClick}
      />
    </div>
  )
}

/** Cross-fade wrapper for a screen inside the tour window. */
function Screen({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  )
}

// ── Public component ────────────────────────────────────────────────────────

export function HomeTour(props: HomeTourProps) {
  return (
    <RingTargetsProvider>
      <HomeTourInner {...props} />
    </RingTargetsProvider>
  )
}
