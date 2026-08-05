/**
 * HomeTour.tsx — the redesigned home page: hero + strip + learn + sticky
 * Timer/Analytics runway + registry + reference.
 *
 * The hero embeds the live welcome-1.md demo in its own self-contained editor
 * context (doc + blocks + runtime), independent of the runway scroll demo.
 * Pressing Run in either editor opens the fullscreen playground (real
 * runtime; Stop → real analytics; ✕ / hint pill returns) without scrolling
 * the page. The runway window keeps its own runtime context, scrubbed by and
 * aligned with the tour stages.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { encodeZip } from '../services/encodeZip'
import {
  clearHomeShared,
  getShareName,
  loadHomeShared,
  setShareName,
  type HomeSharedScript,
} from '../services/homeSharedScript'
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
  SCREEN_TITLES,
  TOUR_CANVAS_HEIGHT,
  TOUR_CANVAS_WIDTH,
  TOUR_RUNWAY_HEIGHT,
  TOUR_STAGES,
  type TourScreen,
  type TourStage,
  type TourStageId,
  type TourStageSlice,
} from './tourStages'
import { TourHero } from './TourHero'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourCaptions, buildAdventureScript } from './TourCaptions'
import { TourTvCard } from './TourTvCard'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourAnalyticsScreen } from './screens/TourAnalyticsScreen'
import { TourShortCircuitStrip } from './TourShortCircuitStrip'
import { TourLearnSection } from './TourLearnSection'
import { TourRegistrySection } from './TourRegistrySection'
import { TourReferenceSection } from './TourReferenceSection'
import { TelemetryConsentFooter } from './TelemetryConsentFooter'
import { TourMobileStack } from './TourMobileStack'
import { TourMobileRunway, type TourMobileRunwayApi } from './TourMobileRunway'
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


const HOME_DEMO_SOURCE = 'wods/examples/home/welcome-1.md'

/** Home quest id → the tour stage that demonstrates it. */
const HOME_QUEST_STAGE: Record<string, TourStageId> = {
  'qs-tour-timer': 'timer-wallclock',
  'qs-tour-analytics': 'analytics-scorecard',
  'qs-edit': 'timer-wallclock',
  'qs-run': 'timer-wallclock',
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
  const telemetry = useTelemetry()
  const track = telemetry?.track
  const navigate = useNavigate()

  const runwayRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const canvasInnerRef = useRef<HTMLDivElement | null>(null)
  const tvCardRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)

  // ── Editor documents ──
  // Arrival contract (#882): the initial load content is the shared script
  // stored by /load?z= when present, else welcome-1.md.
  //
  // Two independent editor contexts:
  //  - HERO: self-contained — its own doc, blocks, and runtime session. It is
  //    never touched by the scroll driver; pressing Run opens the fullscreen
  //    playground without scrolling the page.
  //  - RUNWAY: the ambient scroll-demo window — typewriter-scrubbed by the
  //    tour stages, shares its runtime with the Timer/Analytics stages and
  //    the TV card.
  const welcomeScript = useMemo(() => resolveSource(HOME_DEMO_SOURCE, wodFiles), [wodFiles])
  const [sharedScript, setSharedScript] = useState<HomeSharedScript | null>(() => loadHomeShared())
  const initialContent = sharedScript?.content ?? welcomeScript
  const sharedBy = sharedScript ? sharedScript.by?.trim() || 'anonymous' : undefined

  // Hero context
  const [heroDoc, setHeroDoc] = useState(initialContent)
  const heroDocRef = useRef(heroDoc)
  heroDocRef.current = heroDoc
  const heroBlocksRef = useRef<ScriptBlock[]>([])
  const heroEditedRecordedRef = useRef(false)

  // Runway (scroll demo) context — `selectedScript` is the scrub reset target
  // (adventure picks); `runwayDoc` is the live window text.
  const [selectedScript, setSelectedScript] = useState(initialContent)
  const [runwayDoc, setRunwayDoc] = useState(initialContent)
  const runwayDocRef = useRef(runwayDoc)
  runwayDocRef.current = runwayDoc
  const runwayBlocksRef = useRef<ScriptBlock[]>([])
  const runwayEditedRecordedRef = useRef(false)

  // Runway runtime — owned by the scroll-mode Timer stage; feeds the TV card
  // and the ambient analytics rollup. Never the playground runtime.
  const runwayRuntimeRef = useRef<IScriptRuntime | null>(null)
  const [tourRuntime, setTourRuntime] = useState<IScriptRuntime | null>(null)

  // ── Playground mode ──
  const [interactive, setInteractive] = useState<'timer' | 'analytics' | null>(null)

  // ── Mobile runway stage (card-visibility driven; inert on desktop) ──
  const [mobileStage, setMobileStage] = useState<TourStage | null>(null)
  const mobileRunwayApiRef = useRef<TourMobileRunwayApi | null>(null)
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile
  const mobileStageRef = useRef<TourStage | null>(null)
  mobileStageRef.current = mobileStage
  const handleMobileStageChange = useCallback((stage: TourStage) => setMobileStage(stage), [])

  // ── Scroll driver ──
  const { slice, subscribe, resync, runwayReached } = useTourScroll(runwayRef, interactive !== null)

  const activeScreen: TourScreen = interactive ?? slice.stage.screen

  // ── Lazy screen mounting (mounted once entered, kept alive after) ──
  const [entered, setEntered] = useState<Record<TourScreen, boolean>>({
    editor: true,
    timer: false,
    analytics: false,
  })
  const timerAutoStartRef = useRef(false)

  useEffect(() => {
    setEntered((prev) => (prev[activeScreen] ? prev : { ...prev, [activeScreen]: true }))
    if (activeScreen === 'timer') timerAutoStartRef.current = true
  }, [activeScreen])
  // Mobile runway drives `entered` from the reported stage (the desktop
  // driver keys off the scroll-resolved activeScreen).
  useEffect(() => {
    if (!isMobile || !mobileStage) return
    setEntered((prev) => (prev[mobileStage.screen] ? prev : { ...prev, [mobileStage.screen]: true }))
    if (mobileStage.screen === 'timer') timerAutoStartRef.current = true
  }, [isMobile, mobileStage])

  // ── Session results (playground completion) + scroll-mode analytics ──
  const [session, setSession] = useState<{ segments: Segment[]; results: WorkoutResults } | null>(null)
  const [scrollSegments, setScrollSegments] = useState<Segment[]>([])
  const [logState, setLogState] = useState<'logging' | 'logged' | 'failed' | null>(null)
  // Which editor context started the current playground run, and the block
  // it runs — captured at Run click so the fullscreen overlay is bound to the
  // editor the visitor pressed Run in.
  const playgroundSourceRef = useRef<'hero' | 'runway'>('hero')
  const playgroundBlockRef = useRef<ScriptBlock | null>(null)
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive

  // ── Session key for resetting playground timer when scrolling into timer stage ──
  const [timerSessionKey, setTimerSessionKey] = useState(0)

  const startNewSession = useCallback(() => {
    setTimerSessionKey((k) => k + 1)
    timerStartedAtRef.current = Date.now()
    setSession(null)
    setScrollSegments([])
    setLogState(null)
    runwayRuntimeRef.current = null
    setTourRuntime(null)
    // NOTE: playgroundBlockRef is deliberately kept — startNewSession also
    // fires from the inTimerStage effect right after a Run click, and the
    // fullscreen overlay still needs the block it was launched with.
  }, [])

  // ── Hero-reset contract (#882): re-entering the hero viewport resets the
  // editor to the initial load content, discarding edits and session state.
  // The initial entry (page load) is arrival, not a re-entry. ──
  const heroRef = useRef<HTMLDivElement | null>(null)
  const heroVisibleRef = useRef(true) // the hero mounts at the top of the page
  const resetHeroToArrival = useCallback(() => {
    heroEditedRecordedRef.current = false
    setHeroDoc(initialContent)
    runwayEditedRecordedRef.current = false
    setSelectedScript(initialContent)
    setRunwayDoc(initialContent)
    startNewSession()
  }, [initialContent, startNewSession])

  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting
      if (visible && !heroVisibleRef.current) resetHeroToArrival()
      heroVisibleRef.current = visible
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [resetHeroToArrival])

  // Header Reset button: clear the stored shared script, back to welcome-1.md
  // (re-following the original /load?z= link would store it again).
  const handleClearShared = useCallback(() => {
    clearHomeShared()
    setSharedScript(null)
    heroEditedRecordedRef.current = false
    setHeroDoc(welcomeScript)
    runwayEditedRecordedRef.current = false
    setSelectedScript(welcomeScript)
    setRunwayDoc(welcomeScript)
    startNewSession()
  }, [welcomeScript, startNewSession])

  const inTimerStage = (interactive === null && runwayReached && slice.stage.screen === 'timer') || interactive === 'timer' || (isMobile && mobileStage?.screen === 'timer')
  const prevInTimerStageRef = useRef(inTimerStage)
  // Screen at completion time — read inside handleTimerComplete (stable
  // callback) to decide whether a scroll-mode completion should auto-slide.
  const stageScreenRef = useRef<TourScreen>(slice.stage.screen)
  stageScreenRef.current = slice.stage.screen

  useEffect(() => {
    if (inTimerStage && !prevInTimerStageRef.current) {
      startNewSession()
    }
    prevInTimerStageRef.current = inTimerStage
  }, [inTimerStage, startNewSession])

  // Typeahead scrub: during slide 1 (editor-blank), chars type in over local t (0..0.5).
  // Leaving the slide resets the edit-divergence guard so scrolling back retypes from blank.
  // Scrub drives the RUNWAY window only — the hero editor is never touched.
  useEffect(() => {
    return subscribe(() => {
      if (runwayEditedRecordedRef.current || interactiveRef.current !== null) return
      if (runwayDocRef.current !== selectedScript) {
        setRunwayDoc(selectedScript)
      }
    })
  }, [subscribe, selectedScript])
  useEffect(() => {
    if (interactive || slice.stage.screen !== 'analytics' || session) return
    if (scrollSegments.length > 0) return
    const runtime = runwayRuntimeRef.current
    if (!runtime) return
    let guard = 0
    while (runtime.stack?.current && guard++ < 200) {
      runtime.do(new NextAction())
    }
    const { segments } = getAnalyticsFromRuntime(runtime)
    if (segments.length > 0) setScrollSegments(segments)
  }, [interactive, slice.stage.id, session, scrollSegments.length])
  // Mobile twin of the scroll-mode analytics drain above, keyed on the
  // card-driven stage instead of the desktop scroll slice.
  useEffect(() => {
    if (!isMobile || interactive || mobileStage?.screen !== 'analytics' || session) return
    if (scrollSegments.length > 0) return
    const runtime = runwayRuntimeRef.current
    if (!runtime) return
    let guard = 0
    while (runtime.stack?.current && guard++ < 200) {
      runtime.do(new NextAction())
    }
    const { segments } = getAnalyticsFromRuntime(runtime)
    if (segments.length > 0) setScrollSegments(segments)
  }, [isMobile, interactive, mobileStage, session, scrollSegments.length])

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
  // qs-edit validates on edits to the HERO demo ("Change the workout"), not
  // the scripted runway typeahead.
  useQuickStartAutoComplete({
    pageRoute: '/',
    quests,
    initialSource: initialContent,
    currentSource: heroDoc,
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
  useEffect(() => {
    if (!isMobile || interactive !== null || !mobileStage) return
    markStageViewed(mobileStage.id)
  }, [isMobile, interactive, mobileStage, markStageViewed])

  // The qs-tour-timer interaction quest validates on a *visitor-initiated* run.
  // Driven from the Run click (startRun), not the runtime 'running' status: the
  // ambient scroll demo intentionally auto-runs, and must never validate the
  // quest (production builds fired the runtime callback on load).
  const [demoRunning, setDemoRunning] = useState(false)
  useRunStartedChallenge({ pageRoute: '/', quests, running: demoRunning })

  const handleHomeQuestClick = useCallback((questId: string) => {
    const stageId = HOME_QUEST_STAGE[questId]
    if (!stageId) return
    if (mobileRunwayApiRef.current) {
      mobileRunwayApiRef.current.scrollToStage(stageId)
      return
    }
    const el = runwayRef.current
    if (!el) return
    const stage = TOUR_STAGES.find((s) => s.id === stageId)
    if (stage) scrollRunwayTo(el, Math.min(stage.start + 0.02, stage.end - 0.005))
  }, [])

  // Choose-your-own-adventure on the mobile runway replaces the pinned
  // (hero-context) editor's script — the runway editor context is
  // desktop-only.
  const handleMobileChoice = useCallback(
    (wod: string) => {
      const next = buildAdventureScript(wod)
      heroEditedRecordedRef.current = false
      setHeroDoc(next)
      startNewSession()
      track?.(HOME_EVENTS.demoEdited)
    },
    [startNewSession, track],
  )

  // ── Hero interactions (self-contained editor context) ──
  const handleHeroDocChange = useCallback(
    (next: string) => {
      setHeroDoc(next)
      if (next !== initialContent && !heroEditedRecordedRef.current) {
        heroEditedRecordedRef.current = true
        track?.(HOME_EVENTS.demoEdited)
      }
    },
    [initialContent, track],
  )

  // ── Runway interactions (ambient scroll-demo window) ──
  const handleRunwayDocChange = useCallback(
    (next: string) => {
      setRunwayDoc(next)
      if (next !== selectedScript && !runwayEditedRecordedRef.current) {
        runwayEditedRecordedRef.current = true
        track?.(HOME_EVENTS.demoEdited)
      }
    },
    [selectedScript, track],
  )

  // Choose-your-own-adventure: a caption workout pick replaces the runway
  // demo script, resets the ambient session, and re-runs the typewriter. The
  // hero editor keeps its own content.
  const handleWorkoutChoice = useCallback(
    (wod: string) => {
      const next = buildAdventureScript(wod)
      runwayEditedRecordedRef.current = false
      setSelectedScript(next)
      startNewSession()
      setRunwayDoc(next)
      track?.(HOME_EVENTS.demoEdited)
    },
    [startNewSession, slice.stage.id, slice.t, track],
  )

  // Run opens the fullscreen playground bound to the editor context the Run
  // button lives in. It never scrolls the page — the overlay is fixed.
  const startRun = useCallback(
    (source: 'hero' | 'runway') => {
      const block =
        source === 'hero' ? heroBlocksRef.current[0] : runwayBlocksRef.current[0]
      if (!block) return
      playgroundSourceRef.current = source
      startNewSession()
      playgroundBlockRef.current = block
      setLogState(null)
      setEntered((prev) => (prev.timer ? prev : { ...prev, timer: true }))
      timerAutoStartRef.current = true
      setInteractive('timer')
      setDemoRunning(true)
    },
    [startNewSession],
  )

  const handleHeroRun = useCallback(() => {
    track?.(HOME_EVENTS.demoRun)
    startRun('hero')
  }, [startRun, track])

  const handleRunwayRun = useCallback(() => {
    track?.(HOME_EVENTS.demoRun)
    startRun('runway')
  }, [startRun, track])

  const shareDoc = useCallback(
    async (content: string) => {
      if (!content.trim()) return
      try {
        const encoded = await encodeZip(content)
        // Share links land on /load?z= (#882). The first share prompts once for
        // an optional name, persisted so later links reuse it silently.
        let by = getShareName()
        if (by === null) {
          by = (window.prompt?.('Add your name to the link (shown as "shared by") — optional:') ?? '').trim()
          setShareName(by)
        }
        const url = `${window.location.origin}/load?z=${encoded}${by ? `&by=${encodeURIComponent(by)}` : ''}`
        await navigator.clipboard.writeText(url)
        track?.(HOME_EVENTS.demoShared)
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
    },
    [track],
  )

  const handleHeroShare = useCallback(() => {
    void shareDoc(heroDocRef.current)
  }, [shareDoc])

  const handleRunwayShare = useCallback(() => {
    void shareDoc(runwayDocRef.current)
  }, [shareDoc])

  const openInEditor = useCallback(
    async (content: string) => {
      track?.(HOME_EVENTS.demoOpened)
      const today = getTodayDateKey()
      const note = await createJournalNoteFromWorkout({
        workoutName: 'Welcome workout',
        category: 'home',
        sourceNoteLabel: 'welcome-1.md',
        sourceNotePath: '/',
        wodContent: content,
      })
      navigate(journalNotePath(today, note.id))
    },
    [navigate, track],
  )

  const handleHeroOpenInEditor = useCallback(() => {
    void openInEditor(heroDocRef.current)
  }, [openInEditor])

  const handleRunwayOpenInEditor = useCallback(() => {
    void openInEditor(runwayDocRef.current)
  }, [openInEditor])

  const handleHeroBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    heroBlocksRef.current = blocks
  }, [])

  const handleRunwayBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    runwayBlocksRef.current = blocks
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

      if (!wasPlaygroundRun) {
        // Scroll-mode completion (#885): clicking Next through to the end of
        // the run auto-slides to the analytics cards. Guarded to the timer
        // cards — the ambient analytics drain also completes the runtime, and
        // the visitor is already on the analytics cards then.
        if (results.completed) {
          if (isMobileRef.current) {
            if (mobileStageRef.current?.screen === 'timer') {
              mobileRunwayApiRef.current?.scrollToStage('analytics-scorecard')
            }
          } else if (stageScreenRef.current === 'timer') {
            const el = runwayRef.current
            const stage = TOUR_STAGES.find((s) => s.id === 'analytics-scorecard')
            if (el && stage) scrollRunwayTo(el, Math.min(stage.start + 0.02, stage.end - 0.005))
          }
        }
        return
      }
      const runBlock = playgroundBlockRef.current
      if (!runBlock) return
      const wodContent =
        playgroundSourceRef.current === 'hero' ? heroDocRef.current : runwayDocRef.current
      setLogState('logging')
      void (async () => {
        const note = await createJournalNoteFromWorkout({
          workoutName: 'Welcome workout',
          category: 'home',
          sourceNoteLabel: 'welcome-1.md',
          sourceNotePath: '/',
          wodContent,
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
    if (mobileRunwayApiRef.current) {
      mobileRunwayApiRef.current.scrollToStage('editor-blank')
      return
    }
    const el = runwayRef.current
    if (el) scrollRunwayTo(el, 0)
  }, [interactive, exitPlayground])

  // Header Reset (#885): restart the timer run on demand — a fresh session
  // key remounts the panel and the auto-start replays from the gate.
  const handleTimerReset = useCallback(() => {
    startNewSession()
  }, [startNewSession])

  // Scroll-out stop (#885): leaving the timer cards halts the ambient
  // runtime WITHOUT resetting it — the analytics cards keep the run's data.
  const scrollOutPause = interactive === null && entered.timer && !inTimerStage

  // Runway runtime — set only by the scroll-mode Timer stage. The ambient
  // demo auto-starts execution, but the root WaitingToStart gate keeps the
  // label at 'Ready to Start' while the clock ticks; advance past the gate so
  // the demo actually runs.
  const handleRuntimeReady = useCallback((runtime: IScriptRuntime) => {
    runwayRuntimeRef.current = runtime
    setTourRuntime(runtime)
    if (interactiveRef.current === null) {
      // Defer one microtask so the auto-start effect in RuntimeTimerPanel has
      // begun execution before the gate is popped.
      queueMicrotask(() => {
        runtime.handle(new NextEvent(undefined, runtime.nowProvider))
      })
    }
  }, [])

  // Playground runtime — deliberately NOT stored in runwayRuntimeRef /
  // tourRuntime: the fullscreen session is independent of the scroll demo,
  // and the WaitingToStart gate stays for the visitor to press Start.
  const handlePlaygroundRuntimeReady = useCallback((_runtime: IScriptRuntime) => {}, [])

  const playgroundOverlay = (
    <div data-testid="tour-playground-overlay" className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="relative min-h-0 flex-1">
        {interactive === 'timer' && entered.timer && (
          <TourTimerScreen
            key={timerSessionKey}
            block={playgroundBlockRef.current}
            autoStart={timerAutoStartRef.current}
            onClose={handleTimerClose}
            onComplete={handleTimerComplete}
            onRuntimeReady={handlePlaygroundRuntimeReady}
            onReset={handleTimerReset}
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
        if (s.stage.id === 'timer-next') {
          const k = clamp01((s.t - 0.1) / 0.5)
          const e = 1 - Math.pow(1 - k, 2)
          tv.style.opacity = String(k)
          tv.style.transform = `translateY(${lerp(90, 0, e)}px)`
        } else {
          tv.style.opacity = '0'
        }
      }

      const toast = toastRef.current
      if (toast) {
        if (s.stage.id === 'analytics-scorecard') {
          const tIn = clamp01((s.t - 0.04) / 0.2)
          const tOut = clamp01((s.t - 0.7) / 0.2)
          toast.style.opacity = String(Math.max(0, tIn - tOut))
          toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
        } else {
          toast.style.opacity = '0'
        }
      }
    })
  }, [subscribe])

  // ── Reduced-motion stack (flat cards — sticky scroll is opted out) ──
  if (prefersReducedMotion) {
    return (
      <div data-testid="home-tour">
        <TourMobileStack
          theme={theme}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={handleHomeQuestClick}
          doc={heroDoc}
          onDocChange={handleHeroDocChange}
          onBlocksChange={handleHeroBlocksChange}
          onRun={handleHeroRun}
          onShare={handleHeroShare}
          onOpenInEditor={handleHeroOpenInEditor}
          onChoice={handleWorkoutChoice}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
        />

        {/* Spec §2: runs from the hero demo go fullscreen on every form factor. */}
        {interactive && playgroundOverlay}
      </div>
    )
  }

  // ── Mobile sticky-editor runway ──
  if (isMobile) {
    return (
      <div data-testid="home-tour">
        <TourMobileRunway
          theme={theme}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={handleHomeQuestClick}
          doc={heroDoc}
          onDocChange={handleHeroDocChange}
          onBlocksChange={handleHeroBlocksChange}
          onRun={handleHeroRun}
          onShare={handleHeroShare}
          onOpenInEditor={handleHeroOpenInEditor}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
          onChoice={handleMobileChoice}
          entered={entered}
          onStageChange={handleMobileStageChange}
          timer={{
            sessionKey: timerSessionKey,
            block: heroBlocksRef.current[0] ?? null,
            autoStart: timerAutoStartRef.current,
            externalPause: scrollOutPause,
            onClose: handleTimerClose,
            onComplete: handleTimerComplete,
            onRuntimeReady: handleRuntimeReady,
            onReset: handleTimerReset,
          }}
          analyticsSegments={analyticsSegments}
          heroRef={heroRef}
          apiRef={mobileRunwayApiRef}
        />

        {/* Spec §2: runs from the hero demo go fullscreen on every form factor. */}
        {interactive && playgroundOverlay}
      </div>
    )
  }

  return (
    <div data-testid="home-tour">
      <div ref={heroRef}>
        <TourHero
          theme={theme}
          doc={heroDoc}
          onDocChange={handleHeroDocChange}
          onBlocksChange={handleHeroBlocksChange}
          onRun={handleHeroRun}
          onShare={handleHeroShare}
          onOpenInEditor={handleHeroOpenInEditor}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
        />
      </div>

      <TourShortCircuitStrip />


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
                    {interactive === null && entered.editor && (
                      <Screen visible={activeScreen === 'editor'}>
                        <TourEditorScreen
                          doc={runwayDoc}
                          onDocChange={handleRunwayDocChange}
                          onBlocksChange={handleRunwayBlocksChange}
                          onRun={handleRunwayRun}
                          onShare={handleRunwayShare}
                          onOpenInEditor={handleRunwayOpenInEditor}
                          theme={theme}
                          sharedBy={sharedBy}
                          onResetShared={handleClearShared}
                          withRingTargets
                        />
                      </Screen>
                    )}
                    {interactive === null && entered.timer && (
                      <Screen visible={activeScreen === 'timer'}>
                        <TourTimerScreen
                          key={timerSessionKey}
                          block={runwayBlocksRef.current[0] ?? null}
                          autoStart={timerAutoStartRef.current}
                          onClose={handleTimerClose}
                          onComplete={handleTimerComplete}
                          onRuntimeReady={handleRuntimeReady}
                          onReset={handleTimerReset}
                          externalPause={scrollOutPause}
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
            <TourCaptions activeIndex={slice.index} onChoice={handleWorkoutChoice} />
          </div>
        </div>
      </section>

      <TourLearnSection
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={handleHomeQuestClick}
      />

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
