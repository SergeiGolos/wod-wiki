/**
 * HomeTour.tsx — the redesigned home page: hero + jump section + four tagged
 * walkthrough sections (Write it in Markdown / Run it as a Timer / Own the
 * Metrics / Explore your analytics) + the Learn-the-Language chapter picker.
 *
 * Each tagged section owns a sticky mini-runway (TourSectionRunway) driven by
 * its own scroll progress over a partition of the canonical ```scroll spec;
 * the metrics explainer section is code-declared (it has no markdown source).
 *
 * Preserved contracts:
 *  - Arrival (#882): /load?z= shared script replaces welcome-1.md in the hero.
 *  - quick-start quests (qs-arrive / qs-edit / qs-run) plus scroll quests
 *    fired as each tour stage scrolls into view
 *  - ChallengeHeaderBadge on '/' (mounted by App.tsx) — home quests only
 *  - Runs from the hero demo go fullscreen on every form factor
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { encodeZip } from '../services/encodeZip'
import {
  clearHomeShared,
  getShareName,
  loadHomeShared,
  setShareName,
  type HomeSharedScript,
} from '../services/homeSharedScript'
import { resolveSource } from '../canvas/canvasUtils'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import { playgroundRecorder } from '@/services/resultRecorder'
import { NextEvent } from '@bitcobblers/wod-wiki-engine'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@bitcobblers/wod-wiki-engine'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter, ScrollSpec, ScrollStage } from '../canvas/parseCanvasMarkdown'
import { useQuickStartAutoComplete } from '../hooks/useQuickStartAutoComplete'
import { useCompletionChallenge } from '../hooks/useCompletionChallenge'
import { useRunStartedChallenge } from '../hooks/useRunStartedChallenge'
import { useTourScrollQuests } from '../hooks/useTourScrollQuests'
import { useIsMobile } from '../hooks/useIsMobile'
import { RingTargetsProvider } from './TourRing'
import { TOUR_ACCENTS, type TourScreen, type TourStageId } from './tourConstants'
import { TourHero } from './TourHero'
import {
  buildAdventureScript,
  TOUR_CAPTIONS,
  type TourCaption,
} from './TourCaptions'
import {
  TourSectionRunway,
  type TourSectionRunwayApi,
} from './TourSectionRunway'
import { TourJumpSection } from './TourJumpSection'
import { CelebrationBridge } from './CelebrationBridge'
import { TourChapterPicker } from './TourChapterPicker'
import { TourMobileStack } from './TourMobileStack'
import { TourMobileRunway, type TourMobileRunwayApi } from './TourMobileRunway'
import { HOME_EVENTS, useTelemetry } from '@/services/telemetry'
import { toast } from '@/hooks/use-toast'
import { TourAnalyticsScreen } from './screens/TourAnalyticsScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { createJournalNoteFromWorkout } from '../services/journalWorkout'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const HOME_DEMO_SOURCE = 'wods/examples/home/welcome-1.md'

/** Home quest id → the tour stage that demonstrates it. */
const HOME_QUEST_STAGE: Record<string, string> = {
  'qs-tour-timer': 'timer-wallclock',
  'qs-edit': 'timer-wallclock',
  'qs-run': 'timer-wallclock',
  'qs-tour-analytics': 'wql-idea',
}

/** Stage groups of the canonical runway, in tagline order. */
const SECTION_ORDER = ['write', 'run', 'own', 'explore'] as const
type SectionId = (typeof SECTION_ORDER)[number]

/**
 * Renormalize a partition of stages onto [0, 1] so each section's driver
 * resolves its own progress independently.
 */
function renormalize(stages: ScrollStage[]): ScrollStage[] {
  if (stages.length === 0) return stages
  const first = stages[0]!.range[0]
  const last = stages[stages.length - 1]!.range[1]
  const span = last - first
  return stages.map((s) => ({
    ...s,
    range: [
      span > 0 ? (s.range[0] - first) / span : 0,
      span > 0 ? (s.range[1] - first) / span : 1,
    ] as [number, number],
  }))
}

const DEFAULT_HOME_STAGES: ScrollStage[] = [
  {
    id: 'editor-blank',
    range: [0.0, 0.12],
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Blank Page & Typeahead',
    source: HOME_DEMO_SOURCE,
    caption: 'Start with a Blank Page. Freeform entry & WOD fences.',
    ring: { key: 'editor.window', tag: 'Live Editor' },
  },
  {
    id: 'editor-metrics',
    range: [0.12, 0.24],
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Every Line Collects Metrics',
    source: HOME_DEMO_SOURCE,
    caption: 'Every Line Collects Metrics. Reps, distance & load.',
    ring: { key: 'editor.wodBlock', tag: 'Line Metrics' },
  },
  {
    id: 'editor-run',
    range: [0.24, 0.36],
    screen: 'editor',
    accent: TOUR_ACCENTS.editor,
    label: 'Press Run to Start',
    source: HOME_DEMO_SOURCE,
    caption: 'Press Run to Execute. Launch the working clock.',
    ring: { key: 'editor.runButton', tag: 'Run Button' },
  },
  {
    id: 'timer-wallclock',
    range: [0.36, 0.47],
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: 'What Happens When It Runs',
    source: HOME_DEMO_SOURCE,
    caption: 'What Happens When It Runs. The script becomes the clock.',
    ring: { key: 'timer.floor', tag: 'Clock' },
  },
  {
    id: 'timer-next',
    range: [0.47, 0.57],
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: 'Advance Rounds with Next',
    source: HOME_DEMO_SOURCE,
    caption: 'Next Advances the Workout. Every click locks a time.',
    ring: { key: 'timer.nextButton', tag: 'Next Button' },
  },
  {
    id: 'timer-cast',
    range: [0.57, 0.65],
    screen: 'timer',
    accent: TOUR_ACCENTS.timer,
    label: 'Cast to the Big Screen',
    source: HOME_DEMO_SOURCE,
    caption: 'Cast to the Big Screen. Real-time mirror for the gym floor.',
    ring: { key: 'timer.castButton', tag: 'Cast' },
  },
  {
    id: 'wql-idea',
    range: [0.65, 0.72],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'Query what you just did',
    caption: 'Query what you just did. Every result is one query away.',
    ring: { key: 'analytics.vocab', tag: 'WQL elements' },
  },
  {
    id: 'wql-table',
    range: [0.72, 0.79],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'Read it as a list',
    caption: 'Read it as a list. One aggregator, one metric, one dimension.',
    ring: { key: 'analytics.table', tag: 'Table list' },
  },
  {
    id: 'wql-graphs',
    range: [0.79, 0.86],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'See it as trends',
    caption: 'See it as trends. A graph is a rollup away.',
    ring: { key: 'analytics.graphs', tag: 'Graphs' },
  },
  {
    id: 'wql-dashboard',
    range: [0.86, 0.93],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'Compose a dashboard',
    caption: 'Compose a dashboard. N queries on one screen.',
    ring: { key: 'analytics.dashboard', tag: 'Dashboard' },
  },
  {
    id: 'wql-live',
    range: [0.93, 1.0],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: "It's your data",
    caption: "It's your data. Open the Dashboards tab to query anything, your way.",
  },
]

/** Code-declared stages for the Own-the-Metrics explainer (no md source). */
const OWN_METRICS_STAGES: ScrollStage[] = [
  {
    id: 'metrics-e',
    range: [0.0, 0.34],
    screen: 'analytics',
    accent: TOUR_ACCENTS.timer,
    label: 'Everything is an effort',
    caption: 'Every line tracks an effort from the movement registry.',
    ring: { key: 'metrics.efforts', tag: 'Efforts' },
  },
  {
    id: 'metrics-d',
    range: [0.34, 0.67],
    screen: 'analytics',
    accent: TOUR_ACCENTS.editor,
    label: 'Measures ride along',
    caption: 'Reps, load, distance, timed rest — typed micro data points.',
    ring: { key: 'metrics.data', tag: 'Measures' },
  },
  {
    id: 'metrics-c',
    range: [0.67, 1.0],
    screen: 'analytics',
    accent: TOUR_ACCENTS.analytics,
    label: 'They compound',
    caption: 'Efforts × measures compound into queryable analytics facts.',
    ring: { key: 'metrics.compound', tag: 'Your data' },
  },
]

function captionsForStages(stages: ScrollStage[]): TourCaption[] {
  const byId: Record<string, TourCaption> = Object.fromEntries(
    TOUR_CAPTIONS.map((c) => [c.id as string, c]),
  )
  return stages.map((s) => byId[s.id]).filter((c): c is TourCaption => !!c)
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
  /** Main tour ```scroll runway spec (partitioned across the four sections). */
  scroll?: ScrollSpec | null
}

// ── Inner (needs RingTargetsContext) ──────────────────────────────────────────

function HomeTourInner({ wodFiles, theme, quests, chapters, questLabels, scroll }: HomeTourProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const telemetry = useTelemetry()
  const track = telemetry?.track

  // ── Editor documents ──
  // Arrival contract (#882): the initial load content is the shared script
  // stored by /load?z= when present, else welcome-1.md (bare markdown).
  //
  // Two independent editor contexts:
  //  - HERO: self-contained — its own doc, blocks, and runtime session. It is
  //    never touched by the scroll drivers; pressing Run opens the fullscreen
  //    playground without scrolling the page.
  //  - RUNWAY: the ambient scroll-demo window in the write section — shares
  //    its doc/blocks with the Timer section's ambient run and the TV card.
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

  // Runway runtime — owned by the run section's Timer stage; feeds the TV card.
  // Never the playground runtime.
  const [tourRuntime, setTourRuntime] = useState<IScriptRuntime | null>(null)

  // ── Playground mode ──
  const [interactive, setInteractive] = useState<'timer' | 'analytics' | null>(null)

  // ── Mobile runway stage (card-visibility driven; inert on desktop) ──
  const [mobileStage, setMobileStage] = useState<ScrollStage | null>(null)
  const mobileRunwayApiRef = useRef<TourMobileRunwayApi | null>(null)
  const handleMobileStageChange = useCallback(
    (stage: { id: string; screen: string }) => setMobileStage(stage as ScrollStage),
    [],
  )

  // ── Canonical runway partitioned across the four tagged sections ──
  const canonicalStages = useMemo(() => scroll?.stages ?? DEFAULT_HOME_STAGES, [scroll])
  const sectionStages = useMemo<Record<SectionId, ScrollStage[]>>(() => ({
    write: renormalize(canonicalStages.filter((s) => s.screen === 'editor')),
    run: renormalize(canonicalStages.filter((s) => s.screen === 'timer')),
    // Own is code-declared only; markdown never contributes metrics-* stages,
    // but stay defensive about the partition boundary.
    own: OWN_METRICS_STAGES,
    explore: renormalize(
      canonicalStages.filter((s) => s.screen === 'analytics' && !s.id.startsWith('metrics-')),
    ),
  }), [canonicalStages])
  const sectionCaptions = useMemo<Record<SectionId, TourCaption[]>>(() => ({
    write: captionsForStages(sectionStages.write),
    run: captionsForStages(sectionStages.run),
    own: captionsForStages(sectionStages.own),
    explore: captionsForStages(sectionStages.explore),
  }), [sectionStages])

  const writeApiRef = useRef<TourSectionRunwayApi | null>(null)
  const runApiRef = useRef<TourSectionRunwayApi | null>(null)
  const ownApiRef = useRef<TourSectionRunwayApi | null>(null)
  const exploreApiRef = useRef<TourSectionRunwayApi | null>(null)
  const sectionApis: Record<SectionId, React.MutableRefObject<TourSectionRunwayApi | null>> = {
    write: writeApiRef,
    run: runApiRef,
    own: ownApiRef,
    explore: exploreApiRef,
  }

  const [runInView, setRunInView] = useState(true)
  const handleRunViewport = useCallback((inView: boolean) => setRunInView(inView), [])
  const [activeStages, setActiveStages] = useState<Partial<Record<SectionId, string>>>({})
  const activeStagesRef = useRef(activeStages)
  activeStagesRef.current = activeStages
  const interactiveRef = useRef(interactive)
  interactiveRef.current = interactive
  const handleActiveStage = useCallback(
    (section: SectionId) => (stageId: string) => {
      setActiveStages((prev) => (prev[section] === stageId ? prev : { ...prev, [section]: stageId }))
      if (!interactiveRef.current) markStageViewedRef.current?.(stageId as TourStageId)
    },
    [],
  )

  // Stable per-section callbacks: the section runways notify on stage change
  // and must not observe a fresh closure every render.
  const stageHandlers = useMemo(
    () => ({
      write: handleActiveStage('write'),
      run: handleActiveStage('run'),
      own: handleActiveStage('own'),
      explore: handleActiveStage('explore'),
    }),
    [handleActiveStage],
  )

  // ── Lazy screen mounting (fullscreen overlay panes) ──
  const [entered, setEntered] = useState<Record<TourScreen, boolean>>({
    editor: true,
    timer: false,
    analytics: false,
    metrics: false,
  })
  const timerAutoStartRef = useRef(false)

  useEffect(() => {
    setEntered((prev) => (prev[pane] ? prev : { ...prev, [pane]: true }))
    if (pane === 'timer') timerAutoStartRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive])

  useEffect(() => {
    if (!isMobile || !mobileStage) return
    setEntered((prev) => (prev[mobileStage.screen as 'editor' | 'timer' | 'analytics'] ? prev : { ...prev, [mobileStage.screen as 'editor' | 'timer' | 'analytics']: true }))
    if (mobileStage.screen === 'timer') timerAutoStartRef.current = true
  }, [isMobile, mobileStage])

  // ── Session results (playground completion) + scroll-mode analytics ──
  const [session, setSession] = useState<{ segments: Segment[]; results: WorkoutResults } | null>(null)
  const [logState, setLogState] = useState<'logging' | 'logged' | 'failed' | 'empty' | null>(null)
  // Which editor context started the current playground run, and the block
  // it runs — captured at Run click so the fullscreen overlay is bound to the
  // editor the visitor pressed Run in.
  const playgroundSourceRef = useRef<'hero' | 'runway' | 'chapter'>('hero')
  const playgroundBlockRef = useRef<ScriptBlock | null>(null)
  // Scroll-stage ids arrive as plain strings from the markdown spec; the
  // quest hook keys on the constants union.
  /** Doc for the most recently run chapter example (journal logging). */
  const markStageViewedRef = useRef<(id: TourStageId) => void>(() => {})
  const chapterRunDocRef = useRef('')
  const pane: 'editor' | 'timer' | 'analytics' =
    interactive === 'analytics' ? 'analytics' : interactive === 'timer' ? 'timer' : 'editor'

  // ── Session key for resetting playground timer between sessions ──
  const [timerSessionKey, setTimerSessionKey] = useState(0)

  const startNewSession = useCallback(() => {
    setTimerSessionKey((k) => k + 1)
    timerStartedAtRef.current = Date.now()
    setSession(null)
    setLogState(null)
    setTourRuntime(null)
    // NOTE: playgroundBlockRef is deliberately kept — startNewSession also
    // fires from the in-timer-stage effect right after a Run click, and the
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

  // Entering the run section's timer stages restarts the ambient session —
  // mirrors the old single-driver inTimerStage contract. Leaving the section's
  // viewport (next header covering the sticky window) releases it.
  const runStageId = activeStages.run
  const inTimerStage =
    (interactive === null && runInView && runStageId != null && runStageId.startsWith('timer-')) ||
    interactive === 'timer' ||
    (isMobile && mobileStage?.screen === 'timer')
  const [everInTimer, setEverInTimer] = useState(false)
  useEffect(() => {
    if (inTimerStage) {
      setEverInTimer(true)
      // Ambient gate-pop: arriving at the run section's timer stages arms
      // auto-start so the Ready-to-Start gate advances on its own.
      timerAutoStartRef.current = true
    }
  }, [inTimerStage])
  const prevInTimerStageRef = useRef(inTimerStage)
  useEffect(() => {
    if (inTimerStage && !prevInTimerStageRef.current) {
      startNewSession()
    }
    prevInTimerStageRef.current = inTimerStage
  }, [inTimerStage, startNewSession])

  // Scroll-out stop: leaving the run section halts the ambient runtime WITHOUT
  // resetting it — later sections keep the run's data.
  const scrollOutPause = interactive === null && everInTimer && !runInView

  // Typeahead scrub: the write section's editor window snaps back to the
  // selected script whenever the visitor hasn't diverged from it.
  useEffect(() => {
    return writeApiRef.current?.subscribe(() => {
      if (runwayEditedRecordedRef.current || interactiveRef.current !== null) return
      if (runwayDocRef.current !== selectedScript) {
        setRunwayDoc(selectedScript)
      }
    })
  }, [selectedScript])

  const analyticsSegments = session?.segments ?? []
  const analyticsTitle =
    logState === 'logging'
      ? 'Journal / today · logging…'
      : logState === 'failed'
        ? 'Session Review · not saved to journal'
        : 'Journal / today · logged from timer'

  // Session start marker for ambient resets (the TV card reads the live
  // runtime, so no separate elapsed ticker is needed).
  const timerStartedAtRef = useRef<number | null>(null)

  useQuickStartAutoComplete({
    pageRoute: '/',
    quests,
    initialSource: initialContent,
    currentSource: heroDoc,
  })
  useCompletionChallenge({ pageRoute: '/', quests, completedResults: session?.results ?? null })

  const markStageViewed = useTourScrollQuests('/', quests)
  markStageViewedRef.current = markStageViewed

  // The qs-tour-timer interaction quest validates on a *visitor-initiated* run.
  // ambient scroll demo intentionally auto-runs, and must never validate the
  // quest (production builds fired the runtime callback on load).
  const [demoRunning, setDemoRunning] = useState(false)
  // Per-chapter scoping (#919): the global run-started hook handles only the
  // home-tour's own run quest (qs-tour-timer). Each chapter's `<chapter>-run`
  // lead quest is completed by the chapter picker's Run.
  useRunStartedChallenge({ pageRoute: '/', quests, running: demoRunning })

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
    [startNewSession, track],
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

  // Chapter example run — scoped per chapter (#919): opens the playground
  // bound to the chapter's own block WITHOUT firing the global run-started
  // hook (setDemoRunning), so it completes only this chapter's lead quest.
  const startChapterRun = useCallback(
    (block: ScriptBlock | null, doc: string) => {
      if (!block) return
      playgroundSourceRef.current = 'chapter'
      chapterRunDocRef.current = doc
      startNewSession()
      playgroundBlockRef.current = block
      setLogState(null)
      setEntered((prev) => (prev.timer ? prev : { ...prev, timer: true }))
      timerAutoStartRef.current = true
      setInteractive('timer')
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

  // Chapter picker run/share (#926): use the chapter's own example doc.
  const handleChapterRun = useCallback(
    (_chapterId: string, block: ScriptBlock | null, doc: string) => {
      track?.(HOME_EVENTS.chapterExampleRun, { chapter: _chapterId })
      startChapterRun(block, doc)
    },
    [startChapterRun, track],
  )
  const handleChapterShare = useCallback((doc: string) => void shareDoc(doc), [shareDoc])

  const handleHeroBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    heroBlocksRef.current = blocks
  }, [])

  const handleRunwayBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    runwayBlocksRef.current = blocks
  }, [])

  const exitPlayground = useCallback(() => {
    setInteractive(null)
    // Re-sync every section driver against the restored scroll position.
    requestAnimationFrame(() => {
      for (const section of SECTION_ORDER) sectionApis[section].current?.resync?.()
    })
  }, [sectionApis])

  const handleTimerComplete = useCallback(
    (_blockId: string, results: WorkoutResults) => {
      const wasPlaygroundRun = interactiveRef.current === 'timer'
      const { segments } = getAnalyticsFromLogs(results.logs ?? [], results.startTime)
      setSession({ segments, results })
      setEntered((prev) => (prev.analytics ? prev : { ...prev, analytics: true }))
      setInteractive((mode) => (mode === 'timer' ? 'analytics' : mode))

      if (!wasPlaygroundRun) {
        // Scroll-mode completion: finishing the ambient run slides the visitor
        // onward to the Own-the-Metrics explainer — the bridge between the
        // run they just finished and querying it in Explore your analytics.
        if (results.completed) {
          ownApiRef.current?.scrollToStage('metrics-e')
        }
        return
      }
      if (segments.length === 0) {
        setLogState('empty')
        return
      }
      const runBlock = playgroundBlockRef.current
      if (!runBlock) return
      const wodContent =
        playgroundSourceRef.current === 'hero'
          ? heroDocRef.current
          : playgroundSourceRef.current === 'chapter'
            ? chapterRunDocRef.current
            : runwayDocRef.current
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
    writeApiRef.current?.scrollToStage('editor-blank')
  }, [interactive, exitPlayground])

  // Header Reset: restart the timer run on demand — a fresh session key
  // remounts the panel and the auto-start replays from the gate.
  const handleTimerReset = useCallback(() => {
    startNewSession()
  }, [startNewSession])

  // Runway runtime — set only by the run section's Timer stage. The ambient
  // demo auto-starts execution, but the root WaitingToStart gate keeps the
  // label at 'Ready to Start' while the clock ticks; advance past the gate so
  // the demo actually runs.
  const handleRuntimeReady = useCallback((runtime: IScriptRuntime) => {
    setTourRuntime(runtime)
    if (interactiveRef.current === null) {
      // Defer one microtask so the auto-start effect in RuntimeTimerPanel has
      // begun execution before the gate is popped.
      queueMicrotask(() => {
        runtime.handle(new NextEvent(undefined, runtime.nowProvider))
      })
    }
  }, [])

  // Playground runtime — deliberately NOT stored: the fullscreen session is
  // independent of the ambient demo, and the WaitingToStart gate stays for
  // the visitor to press Start.
  const handlePlaygroundRuntimeReady = useCallback((_runtime: IScriptRuntime) => {}, [])

  // Quest navigation: route the stage id to whichever section owns it.
  const handleHomeQuestClick = useCallback(
    (questId: string) => {
      const stageId = HOME_QUEST_STAGE[questId]
      if (!stageId) return
      if (mobileRunwayApiRef.current) {
        mobileRunwayApiRef.current.scrollToStage(stageId as TourStageId)
        return
      }
      for (const section of SECTION_ORDER) {
        if (sectionStages[section].some((s) => s.id === stageId)) {
          sectionApis[section].current?.scrollToStage(stageId)
          return
        }
      }
    },
    [sectionStages, sectionApis],
  )

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
            title={analyticsTitle}
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
                : logState === 'empty'
                  ? 'Nothing to log — the session never started · tap here to return'
                  : 'session logged · tap here to return'}
        </button>
      </div>
    </div>
  )

  // ── Reduced-motion stack (flat cards — sticky scroll is opted out) ──
  if (prefersReducedMotion) {
    return (
      <div data-testid="home-tour">
        <TourMobileStack
          theme={theme}
          wodFiles={wodFiles}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={handleHomeQuestClick}
          doc={heroDoc}
          onDocChange={handleHeroDocChange}
          onBlocksChange={handleHeroBlocksChange}
          onRun={handleHeroRun}
          onShare={handleHeroShare}
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
          wodFiles={wodFiles}
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onChapterRun={handleChapterRun}
          onChapterShare={handleChapterShare}
          onHomeQuestClick={handleHomeQuestClick}
          doc={heroDoc}
          onDocChange={handleHeroDocChange}
          onBlocksChange={handleHeroBlocksChange}
          onRun={handleHeroRun}
          onShare={handleHeroShare}
          runwayDoc={runwayDoc}
          onRunwayDocChange={handleRunwayDocChange}
          onRunwayBlocksChange={handleRunwayBlocksChange}
          onRunwayRun={handleRunwayRun}
          onRunwayShare={handleRunwayShare}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
          onChoice={handleWorkoutChoice}
          entered={entered}
          onStageChange={handleMobileStageChange}
          timer={{
            sessionKey: timerSessionKey,
            block: runwayBlocksRef.current[0] ?? null,
            autoStart: timerAutoStartRef.current,
            externalPause: scrollOutPause,
            onClose: handleTimerClose,
            onComplete: handleTimerComplete,
            onRuntimeReady: handleRuntimeReady,
            onReset: handleTimerReset,
          }}
          heroRef={heroRef}
          apiRef={mobileRunwayApiRef}
        />

        {/* Spec §2: runs from the hero demo go fullscreen on every form factor. */}
        {interactive && playgroundOverlay}
      </div>
    )
  }

  // ── Desktop: hero → jump section → four tagged sections → chapters ──
  const frozen = interactive !== null
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
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
        />
      </div>

      <TourJumpSection />

      <TourSectionRunway
        ref={writeApiRef}
        id="write"
        heightVh="420vh"
        frozen={frozen}
        header={
          <TaglineHeader
            index="01"
            before="Write it in "
            accentText="Markdown"
            after=""
            accent={TOUR_ACCENTS.editor}
            blurb="Freeform Markdown notes, fenced ```time blocks, live type-ahead. Everything starts as plain text you can edit."
          />
        }
        stages={sectionStages.write}
        captions={sectionCaptions.write}
        onChoice={handleWorkoutChoice}
        onActiveStageChange={stageHandlers.write}
        editor={{
          doc: runwayDoc,
          theme,
          onDocChange: handleRunwayDocChange,
          onBlocksChange: handleRunwayBlocksChange,
          onRun: handleRunwayRun,
          onShare: handleRunwayShare,
        }}
      />

      <TourSectionRunway
        ref={runApiRef}
        id="run"
        heightVh="420vh"
        frozen={frozen}
        header={
          <TaglineHeader
            index="02"
            before="Run it as a "
            accentText="Timer"
            after=""
            accent={TOUR_ACCENTS.timer}
            blurb="The script becomes the clock. Step through rounds, cast to the big screen, and pace the room together."
          />
        }
        stages={sectionStages.run}
        captions={sectionCaptions.run}
        onActiveStageChange={stageHandlers.run}
        onViewportChange={handleRunViewport}
        timer={{
          sessionKey: timerSessionKey,
          block: runwayBlocksRef.current[0] ?? null,
          autoStart: timerAutoStartRef.current,
          externalPause: scrollOutPause,
          onClose: handleTimerClose,
          onComplete: handleTimerComplete,
          onRuntimeReady: handleRuntimeReady,
          onReset: handleTimerReset,
        }}
        tvRuntime={tourRuntime}
        tvStageId="timer-cast"
      />

      <TourSectionRunway
        ref={ownApiRef}
        id="own"
        heightVh="360vh"
        frozen={frozen}
        screenKind="metrics"
        header={
          <TaglineHeader
            index="03"
            before="Own the "
            accentText="Metrics"
            after=""
            accent={TOUR_ACCENTS.analytics}
            blurb="Everything you log is an effort carrying measured data points — and together they compound into rich, queryable analytics."
          />
        }
        stages={sectionStages.own}
        captions={sectionCaptions.own}
        onActiveStageChange={stageHandlers.own}
      />

      <TourSectionRunway
        ref={exploreApiRef}
        id="explore"
        heightVh="560vh"
        frozen={frozen}
        header={
          <TaglineHeader
            index="04"
            before=""
            accentText="Explore"
            after=" your analytics"
            accent={TOUR_ACCENTS.analytics}
            blurb="WQL turns your journal into queryable facts: lists, trends, dashboards — every widget one query away from anything you've logged."
          />
        }
        stages={sectionStages.explore}
        captions={sectionCaptions.explore}
        onActiveStageChange={stageHandlers.explore}
        toastLabel={
          session
            ? `Stopped at ${fmtClock(session.results.duration)} — writing results to Journal…`
            : null
        }
      />

      {/* Analytics shares the canonical editor/timer sticky runway. */}
      <CelebrationBridge chapters={chapters} />

      {/* Learn the Language — single-slide chapter picker with a shared editor */}
      <TourChapterPicker
        wodFiles={wodFiles}
        chapters={chapters}
        allQuests={quests}
        theme={theme}
        onRun={handleChapterRun}
        onShare={handleChapterShare}
      />

      {interactive && playgroundOverlay}
    </div>
  )
}

/** Static half-viewport header introducing a tagged runway section. */
export function TaglineHeader({
  index,
  before,
  accentText,
  after,
  accent,
  blurb,
}: {
  index: string
  before: string
  accentText: string
  after: string
  accent: string
  blurb: string
}) {
  return (
    <header className="flex min-h-[45vh] items-center border-b border-border/60 px-6 lg:px-12">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground/60">
          {index} / 04
        </div>
        <h2 className="mt-2 text-[clamp(26px,3.6vw,48px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          {before}
          <span
            className="underline decoration-[0.06em] underline-offset-[0.14em]"
            style={{ color: accent, textDecorationColor: accent }}
          >
            {accentText}
          </span>
          {after}
        </h2>
        <p className="mt-3 max-w-xl text-[clamp(14px,1.2vw,16px)] leading-[1.6] text-muted-foreground">
          {blurb}
        </p>
      </div>
    </header>
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
