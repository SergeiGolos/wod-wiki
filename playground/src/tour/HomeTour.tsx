/**
 * HomeTour.tsx — the redesigned home page: hero + strip + learn + sticky
 * Timer/Analytics runway + registry + reference.
 *
 * The hero embeds the live welcome-1.md demo so the first interaction happens
 * without scrolling. The sticky morphing window is preserved and only morphs
 * between the Timer and Analytics stages. All static areas render as a card
 * stack below 1024px (the app's MOBILE_BREAKPOINT_PX).
 *
 * Playground mode: pressing Run in the hero freezes scroll sync and hands the
 * window to the visitor (real runtime; Stop → real analytics; ✕ / hint pill
 * returns to scroll sync).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { encodeZip } from '../services/encodeZip'
import { resolveSource } from '../canvas/canvasUtils'
import { getAnalyticsFromLogs, getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer'
import { createJournalNoteFromWorkout } from '../services/journalWorkout'
import { playgroundRecorder } from '../services/resultRecorder'
import { NextAction } from '@/runtime/actions/stack/NextAction'
import { NextEvent } from '@/runtime/events/NextEvent'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import { useQuickStartAutoComplete } from '../hooks/useQuickStartAutoComplete'
import { useCompletionChallenge } from '../hooks/useCompletionChallenge'
import { useRunStartedChallenge } from '../hooks/useRunStartedChallenge'
import { useTourScrollQuests } from '../hooks/useTourScrollQuests'
import { useIsMobile } from '../hooks/useIsMobile'
import type { FullscreenState } from '../hooks/useCanvasRuntime'
import {
  RingTargetsProvider,
  TourRing,
} from './TourRing'
import { useTourScroll, scrollRunwayTo } from './useTourScroll'
import {
  TOUR_CANVAS_HEIGHT,
  TOUR_CANVAS_WIDTH,
  TOUR_RUNWAY_HEIGHT,
  TOUR_STAGES,
  type TourScreen,
  type TourStageId,
  type TourStageSlice,
} from './tourStages'
import { TourHero } from './TourHero'
import { TourCaptions } from './TourCaptions'
import { TourTvCard } from './TourTvCard'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourAnalyticsScreen } from './screens/TourAnalyticsScreen'
import { TourShortCircuitStrip } from './TourShortCircuitStrip'
import { TourLearnSection } from './TourLearnSection'
import { TourRegistrySection } from './TourRegistrySection'
import { TourReferenceSection } from './TourReferenceSection'
import { TelemetryConsentFooter } from './TelemetryConsentFooter'
import { TourMobileStack } from './TourMobileStack'
import { HOME_EVENTS, useTelemetry } from '@/services/telemetry'
import { journalNotePath } from '../lib/routes'
import { getTodayDateKey } from '../services/dateUtils'
import { toast } from '@/hooks/use-toast'
import type { ReactNode } from 'react'

// ── Helpers ─────────────────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const SCREEN_TITLES: Record<TourScreen, string> = {
  timer: 'WallClock',
  analytics: 'Session Review',
}

const HOME_DEMO_SOURCE = 'wods/examples/home/welcome-1.md'

/** Home quest id → the tour stage that demonstrates it. */
const HOME_QUEST_STAGE: Record<string, TourStageId> = {
  'qs-tour-timer': 'timer',
  'qs-tour-analytics': 'analytics',
  'qs-edit': 'timer',
  'qs-run': 'timer',
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
  /** Quick-start + scroll quests from the home canvas markdown. */
  quests: Quest[]
  /** Page-level chapters from the home canvas markdown (home-tour first). */
  chapters: Chapter[]
  /** Cross-page quest id → label, collected from every canvas route. */
  questLabels?: Record<string, string>
}

// ── Inner (needs RingTargetsContext) ──────────────────────────────────────────

function HomeTourInner({ wodFiles, theme, quests, chapters, questLabels }: HomeTourProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { track } = useTelemetry()
  const navigate = useNavigate()

  const runwayRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const canvasInnerRef = useRef<HTMLDivElement | null>(null)
  const tvCardRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)

  // ── Editor document (live hero demo) ──
  const script = useMemo(() => resolveSource(HOME_DEMO_SOURCE, wodFiles), [wodFiles])
  const [doc, setDoc] = useState(script)
  const blocksRef = useRef<ScriptBlock[]>([])
  const runtimeRef = useRef<IScriptRuntime | null>(null)
  const [tourRuntime, setTourRuntime] = useState<IScriptRuntime | null>(null)
  const editedRecordedRef = useRef(false)

  // ── Playground mode ──
  const [interactive, setInteractive] = useState<'timer' | 'analytics' | null>(null)

  // ── Scroll driver ──
  const { slice, subscribe, resync, runwayReached } = useTourScroll(runwayRef, interactive !== null)

  const activeScreen: TourScreen = interactive ?? slice.stage.screen

  // ── Lazy screen mounting (mounted once entered, kept alive after) ──
  const [entered, setEntered] = useState<Record<TourScreen, boolean>>({
    timer: false,
    analytics: false,
  })
  const timerAutoStartRef = useRef(false)

  useEffect(() => {
    setEntered((prev) => (prev[activeScreen] ? prev : { ...prev, [activeScreen]: true }))
    if (activeScreen === 'timer') timerAutoStartRef.current = true
  }, [activeScreen])

  // ── Session results (playground completion) + scroll-mode analytics ──
  const [session, setSession] = useState<{ segments: Segment[]; results: WorkoutResults } | null>(null)
  const [scrollSegments, setScrollSegments] = useState<Segment[]>([])
  const [logState, setLogState] = useState<'logging' | 'logged' | 'failed' | null>(null)
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive
  const docRef = useRef(doc)
  docRef.current = doc

  useEffect(() => {
    if (interactive || slice.stage.id !== 'analytics' || session) return
    if (scrollSegments.length > 0) return
    const runtime = runtimeRef.current
    if (!runtime) return
    let guard = 0
    while (runtime.stack?.current && guard++ < 200) {
      runtime.do(new NextAction())
    }
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

  const markStageViewed = useTourScrollQuests('/', quests)
  useEffect(() => {
    // Only mark a scroll stage once the runway has actually entered the
    // viewport. At fresh load the hero is still visible (runwayReached is
    // false), so the first tour stage is not prematurely counted.
    if (interactive === null && runwayReached) markStageViewed(slice.stage.id)
  }, [interactive, slice.stage.id, markStageViewed, runwayReached])

  // Track when the demo runtime actually starts running — either from the hero
  // Run button or from the ambient timer stage auto-starting on scroll.
  const [demoRunning, setDemoRunning] = useState(false)
  const handleRunStarted = useCallback(() => {
    setDemoRunning(true)
  }, [])
  useRunStartedChallenge({ pageRoute: '/', quests, running: demoRunning })

  const handleHomeQuestClick = useCallback((questId: string) => {
    const stageId = HOME_QUEST_STAGE[questId]
    if (!stageId) return
    const el = runwayRef.current
    if (!el) return
    const stage = TOUR_STAGES.find((s) => s.id === stageId)
    if (stage) scrollRunwayTo(el, Math.min(stage.start + 0.02, stage.end - 0.005))
  }, [])

  // ── Hero interactions ──
  const handleDocChange = useCallback(
    (next: string) => {
      setDoc(next)
      if (next !== script && !editedRecordedRef.current) {
        editedRecordedRef.current = true
        track(HOME_EVENTS.demoEdited)
      }
    },
    [script, track],
  )

  const startRun = useCallback(() => {
    if (!blocksRef.current[0]) return
    setLogState(null)
    setEntered((prev) => (prev.timer ? prev : { ...prev, timer: true }))
    timerAutoStartRef.current = true
    setInteractive('timer')
  }, [])

  const handleRun = useCallback(() => {
    track(HOME_EVENTS.demoRun)
    startRun()
  }, [startRun, track])

  const handleShare = useCallback(async () => {
    if (!doc.trim()) return
    try {
      const encoded = await encodeZip(doc)
      const url = `${window.location.origin}${window.location.pathname}?z=${encoded}`
      await navigator.clipboard.writeText(url)
      track(HOME_EVENTS.demoShared)
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard.',
      })
    } catch (err) {
      console.error('[HomeTour] share failed:', err)
      toast({
        title: 'Could not copy',
        description: err instanceof Error ? err.message : 'Failed to copy share link.',
        variant: 'destructive',
      })
    }
  }, [doc, track])

  const handleOpenInEditor = useCallback(async () => {
    track(HOME_EVENTS.demoOpened)
    const today = getTodayDateKey()
    const note = await createJournalNoteFromWorkout({
      workoutName: 'Welcome workout',
      category: 'home',
      sourceNoteLabel: 'welcome-1.md',
      sourceNotePath: '/',
      wodContent: docRef.current,
    })
    navigate(journalNotePath(today, note.id))
  }, [navigate, track])

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    blocksRef.current = blocks
  }, [])

  const exitPlayground = useCallback(() => setInteractive(null), [])

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
    const el = runwayRef.current
    if (el) scrollRunwayTo(el, 0)
  }, [interactive, exitPlayground])

  const handleRuntimeReady = useCallback((runtime: IScriptRuntime) => {
    runtimeRef.current = runtime
    setTourRuntime(runtime)
    // In ambient scroll mode the timer screen auto-starts execution, but the
    // root WaitingToStart gate keeps the label at 'Ready to Start' while the
    // clock ticks. Advance past the gate so the demo actually runs; playground
    // mode (interactive) leaves the gate for the visitor to press Start.
    if (interactiveRef.current === null) {
      // Defer one microtask so the auto-start effect in RuntimeTimerPanel has
      // begun execution before the gate is popped.
      queueMicrotask(() => {
        runtime.handle(new NextEvent(undefined, runtime.nowProvider))
      })
    }
  }, [])

  const playgroundOverlay = (
    <div data-testid="tour-playground-overlay" className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="relative min-h-0 flex-1">
        {interactive === 'timer' && entered.timer && (
          <TourTimerScreen
            block={blocksRef.current[0] ?? null}
            autoStart={timerAutoStartRef.current}
            onClose={handleTimerClose}
            onComplete={handleTimerComplete}
            onRuntimeReady={handleRuntimeReady}
            onRunStarted={handleRunStarted}
          />
        )}
        {interactive === 'analytics' && entered.analytics && (
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
        )}
      </div>
      <div className="flex justify-center py-4">
        <button
          type="button"
          onClick={exitPlayground}
          className="rounded-full bg-foreground px-5 py-2.5 font-mono text-[10px] tracking-[0.06em] text-background opacity-95 transition-opacity hover:opacity-100"
        >
          {interactive === 'timer'
            ? 'timer running · STOP to log it · tap here to exit'
            : logState === 'failed'
              ? 'session not saved · tap here to return'
              : logState === 'logging'
                ? 'logging session… · tap here to return'
                : 'session logged · tap here to return'}
        </button>
      </div>
    </div>
  )

  // ── Canvas scaling (desktop only) ──
  const scaleRef = useRef(1)
  useEffect(() => {
    const canvas = canvasRef.current
    const inner = canvasInnerRef.current
    if (!canvas || !inner) return
    const fit = () => {
      scaleRef.current = canvas.clientWidth / TOUR_CANVAS_WIDTH
      inner.style.transform = `scale(${scaleRef.current})`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // ── Imperative scrub: TV parallax + toast ──
  useEffect(() => {
    return subscribe((s: TourStageSlice) => {
      const tv = tvCardRef.current
      if (tv) {
        if (s.stage.id === 'timer') {
          const k = clamp01((s.t - 0.6) / 0.22)
          const e = 1 - Math.pow(1 - k, 2)
          tv.style.opacity = String(k)
          tv.style.transform = `translateY(${lerp(90, 0, e)}px)`
        } else {
          tv.style.opacity = '0'
        }
      }

      const toast = toastRef.current
      if (toast) {
        if (s.stage.id === 'analytics') {
          const tIn = clamp01((s.t - 0.04) / 0.12)
          const tOut = clamp01((s.t - 0.42) / 0.14)
          toast.style.opacity = String(Math.max(0, tIn - tOut))
          toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
        } else {
          toast.style.opacity = '0'
        }
      }
    })
  }, [subscribe])

  // ── Mobile / reduced-motion stack ──
  if (isMobile || prefersReducedMotion) {
    return (
      <div data-testid="home-tour">
        <TourMobileStack
          theme={theme}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={handleHomeQuestClick}
          doc={doc}
          onDocChange={handleDocChange}
          onBlocksChange={handleBlocksChange}
          onRun={handleRun}
          onShare={handleShare}
          onOpenInEditor={handleOpenInEditor}
        />

        {/* Spec §2: runs from the hero demo go fullscreen on every form factor. */}
        {interactive && playgroundOverlay}
      </div>
    )
  }

  return (
    <div data-testid="home-tour">
      <TourHero
        theme={theme}
        doc={doc}
        onDocChange={handleDocChange}
        onBlocksChange={handleBlocksChange}
        onRun={handleRun}
        onShare={handleShare}
        onOpenInEditor={handleOpenInEditor}
      />

      <TourShortCircuitStrip />

      <TourLearnSection
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={handleHomeQuestClick}
      />

      {/* ── Runway ── */}
      <section ref={runwayRef} className="relative" style={{ height: TOUR_RUNWAY_HEIGHT }}>
        <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
          {/* stage bar */}
          <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {interactive ? 'Playground mode' : slice.stage.label}
            </div>
            <div className="flex items-center gap-1.5">
              {TOUR_STAGES.map((seg, i) => {
                const live = slice.index === i
                const done = slice.index > i
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
          <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 items-center justify-center gap-[clamp(24px,3.5vw,56px)] px-0 pb-0 lg:px-12 lg:pb-5">
            {/* canvas */}
            <div
              ref={canvasRef}
              className="relative aspect-[1200/720] w-[min(920px,calc(100vw-440px))] flex-none"
            >
              <div
                ref={canvasInnerRef}
                className="absolute top-0 left-0 origin-top-left will-change-transform"
                style={{ width: TOUR_CANVAS_WIDTH, height: TOUR_CANVAS_HEIGHT }}
              >
                <MacOSChrome title={SCREEN_TITLES[activeScreen]} className="absolute inset-x-2 top-2 bottom-2">
                  <div className="relative h-full">
                    {interactive === null && entered.timer && (
                      <Screen visible={activeScreen === 'timer'}>
                        <TourTimerScreen
                          block={blocksRef.current[0] ?? null}
                          autoStart={timerAutoStartRef.current}
                          onClose={handleTimerClose}
                          onComplete={handleTimerComplete}
                          onRuntimeReady={handleRuntimeReady}
                          onRunStarted={handleRunStarted}
                        />
                      </Screen>
                    )}
                    {interactive === null && entered.analytics && (
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

                    {/* stop toast mirrors the ambient scroll-mode runtime finishing. */}
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

                <TourTvCard ref={tvCardRef} runtime={tourRuntime} />

                <TourRing target={interactive ? null : slice.ring} accent={slice.stage.accent} canvasRef={canvasInnerRef} />
              </div>
            </div>

            {/* captions */}
            <TourCaptions activeIndex={slice.index} />
          </div>
        </div>
      </section>

      {interactive && playgroundOverlay}

      <TourRegistrySection />
      <TourReferenceSection />
      <TelemetryConsentFooter />
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

// ── Public component ───────────────────────────────────────────────────────

export function HomeTour(props: HomeTourProps) {
  return (
    <RingTargetsProvider>
      <HomeTourInner {...props} />
    </RingTargetsProvider>
  )
}
