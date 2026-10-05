/**
 * HomeTour.tsx — the home page: hero + jump section + four tagged
 * walkthrough sections (Write it in Markdown / Run it as a Timer / Own the
 * Metrics / Explore your analytics) + the Learn-the-Language chapter picker.
 *
 * Each tagged section owns a sticky mini-runway (TourSectionRunway) driven by
 * its own scroll progress over a partition of the canonical ```scroll spec;
 * the metrics explainer section is code-declared (it has no markdown source).
 *
 * One shared editor document: the desktop hero view and the write-section
 * sticky pane are two displays of the same doc + block list (edits in either
 * place are edits to the run document; neither resets at the boundary).
 * Runs are INLINE — no fullscreen overlay on
 * any form factor: dwelling at the run stages auto-starts a fresh playground
 * run (usePlaygroundRun mints a persisted note per identity, once per
 * identity — backward scroll never re-runs), the Stop button / metrics
 * arrival / scroll-out finalize the partial exactly once, and the explore
 * section answers from the run's note (note-scoped WQL table + real seeded
 * dashboards).
 *
 * Preserved contracts:
 *  - Arrival (#882): /load?z= shared script replaces welcome-1.md in the hero.
 *  - quick-start quests (qs-arrive / qs-edit / qs-run) plus scroll quests
 *    fired as each tour stage scrolls into view
 *  - ChallengeHeaderBadge on '/' (mounted by App.tsx) — home quests only
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
import { NextEvent } from '@bitcobblers/wod-wiki-engine'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'
import type { ScriptBlock, Sessions } from '@/components/Editor/types'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter, ScrollSpec, ScrollStage } from '../canvas/parseCanvasMarkdown'
import { useQuickStartAutoComplete } from '../hooks/useQuickStartAutoComplete'
import { useCompletionChallenge } from '../hooks/useCompletionChallenge'
import { useRunStartedChallenge } from '../hooks/useRunStartedChallenge'
import { useTourScrollQuests } from '../hooks/useTourScrollQuests'
import { useIsMobile } from '../hooks/useIsMobile'
import { usePlaygroundRun } from '../hooks/usePlaygroundRun'
import { RingTargetsProvider } from './TourRing'
import { TOUR_ACCENTS, SCREEN_TITLES, type TourStageId } from './tourConstants'
import { TourHeroHeading } from './TourHero'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { TourEditorScreen } from './screens/TourEditorScreen'
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
import {
  BOARD_SLUGS,
  DEFAULT_BOARD_SLUG,
  DEFAULT_TABLE_QUERY_KEY,
  TABLE_QUERIES,
} from './screens/TourSessionAnalytics'

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

  // ── Editor document ──
  // Arrival contract (#882): the initial load content is the shared script
  // stored by /load?z= when present, else welcome-1.md (home intro page).
  //
  // ONE editor document: the desktop hero view and the write-section sticky
  // pane are two displays of the same doc state. Edits in either place are
  // edits to the run document.
  const welcomeScript = useMemo(() => resolveSource(HOME_DEMO_SOURCE, wodFiles), [wodFiles])
  const [sharedScript, setSharedScript] = useState<HomeSharedScript | null>(() => loadHomeShared())
  const initialContent = sharedScript?.content ?? welcomeScript
  const sharedBy = sharedScript ? sharedScript.by?.trim() || 'anonymous' : undefined

  const [doc, setDoc] = useState(initialContent)
  const docRef = useRef(doc)
  docRef.current = doc
  const blocksRef = useRef<ScriptBlock[]>([])
  const editedRecordedRef = useRef(false)

  // Runway runtime — set by the run section's inline timer pane; feeds the TV
  // card and lets the host pop the auto-start gate.
  const [tourRuntime, setTourRuntime] = useState<IScriptRuntime | null>(null)

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
    // Explore is dashboard-primary: a brief vocabulary beat, then the real
    // seeded boards (the session table lives in Own-the-Metrics).
    explore: [
      { id: 'wql-idea', range: [0.0, 0.3] as [number, number], screen: 'analytics', accent: TOUR_ACCENTS.analytics, label: 'The WQL vocabulary', caption: 'The whole language fits on one strip.', ring: { key: 'analytics.vocab', tag: 'WQL elements' } },
      { id: 'wql-dashboard', range: [0.3, 1.0] as [number, number], screen: 'analytics', accent: TOUR_ACCENTS.analytics, label: 'Seeded dashboards', caption: 'Real boards, range, units, inspect.', ring: { key: 'analytics.dashboard', tag: 'Dashboard' } },
    ],
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
  const sectionApis: Record<SectionId, React.MutableRefObject<TourSectionRunwayApi | null>> = useMemo(
    () => ({
      write: writeApiRef,
      run: runApiRef,
      own: ownApiRef,
      explore: exploreApiRef,
    }),
    [],
  )

  const [runInView, setRunInView] = useState(true)
  const handleRunViewport = useCallback((inView: boolean) => setRunInView(inView), [])
  const [activeStages, setActiveStages] = useState<Partial<Record<SectionId, string>>>({})
  const activeStagesRef = useRef(activeStages)
  activeStagesRef.current = activeStages
  const handleActiveStage = useCallback(
    (section: SectionId) => (stageId: string) => {
      setActiveStages((prev) => (prev[section] === stageId ? prev : { ...prev, [section]: stageId }))
      markStageViewedRef.current?.(stageId as TourStageId)
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

  // ── Session results (inline playground run) ──
  const [session, setSession] = useState<Sessions | null>(null)
  // Scroll-stage ids arrive as plain strings from the markdown spec; the
  // quest hook keys on the constants union.
  const markStageViewedRef = useRef<(id: TourStageId) => void>(() => {})

  // ── Playground run identity (usePlaygroundRun — fresh note per run) ──
  const { run, start, finalize, reset, end } = usePlaygroundRun()
  const runRef = useRef(run)
  runRef.current = run
  // Whether the current run's execution ever left idle (panel onRunStarted)
  // and whether its results are already recorded — both gate which stop
  // path a host request can take.
  const runStartedRef = useRef(false)
  const finalizedRef = useRef(false)
  // A failed finalize keeps the outputs here; every subsequent host action
  // retries the save before proceeding (hook preserves pending until then).
  const unsavedRef = useRef<Sessions | null>(null)

  // Host-driven finalize stop: flipping this halts the live panel execution
  // and reports partial results (externalStop on RuntimeTimerPanel).
  const [externalStop, setExternalStop] = useState(false)
  const externalStopRef = useRef(false)
  const pendingActionRef = useRef<
    | { kind: 'apply-doc'; doc: string }
    | { kind: 'restart'; doc: string; block: ScriptBlock; sectionTitle: string }
    | { kind: 'restart-unstarted'; doc: string; block: ScriptBlock; sectionTitle: string }
    | { kind: 'reset' }
    | null
  >(null)

  // ── Explore stage state: caption-driven WQL query + dashboard board ──
  const [tableQueryKey, setTableQueryKey] = useState(DEFAULT_TABLE_QUERY_KEY)
  const [boardSlug, setBoardSlug] = useState<string>(DEFAULT_BOARD_SLUG)

  // ── Session key for remounting the inline timer pane between runs ──
  const [timerSessionKey, setTimerSessionKey] = useState(0)
  // Auto-start is consumed by the fresh pane mount of a new run identity.
  const [autoStart, setAutoStart] = useState(false)

  const clearSession = useCallback(() => {
    setSession(null)
    setTourRuntime(null)
  }, [])

  const scrollTimerStage = useCallback(() => {
    if (mobileRunwayApiRef.current) {
      mobileRunwayApiRef.current.scrollToStage('timer-wallclock')
      return
    }
    runApiRef.current?.scrollToStage('timer-wallclock')
  }, [])

  // ── Run lifecycle (inline — no fullscreen) ──
  // Identity intent: choice / reset / explicit Run mint a NEW run identity
  // (fresh persisted note). Mere stage re-entry never re-runs — "once per
  // identity, backward no rerun". `runSeed` is the intent counter;
  // startedSeedRef records which intent doStart consumed.
  const [runSeed, setRunSeed] = useState(0)
  const runSeedRef = useRef(runSeed)
  runSeedRef.current = runSeed
  const startedSeedRef = useRef(0)
  // Marks a visitor-initiated run (quest qs-tour-timer); autostarted
  // entrances never validate it.
  const [demoRunning, setDemoRunning] = useState(false)

  const doStart = useCallback(async (docText: string, block: ScriptBlock | null, sectionTitle: string): Promise<boolean> => {
    if (!block) return false
    try {
      await start(docText, block, { pageTitle: 'Home', sectionTitle })
    } catch (err) {
      console.error('[HomeTour] failed to persist playground run note:', err)
      toast({
        title: 'Could not start workout',
        description: 'The playground entry could not be saved.',
        variant: 'destructive',
      })
      return false
    }
    startedSeedRef.current = runSeedRef.current
    finalizedRef.current = false
    runStartedRef.current = false
    unsavedRef.current = null
    setTimerSessionKey((k) => k + 1)
    setAutoStart(true)
    setSession(null)
    return true
  }, [start])

  // Fresh unstarted snapshot note (reset contract) — the previous partial is
  // expected to be finalized BEFORE doReset runs (requestStop chain).
  const doReset = useCallback(async (): Promise<boolean> => {
    try {
      await reset(docRef.current, { pageTitle: 'Home', sectionTitle: 'Run' })
    } catch (err) {
      console.error('[HomeTour] failed to reset playground run:', err)
      toast({
        title: 'Could not reset',
        description: 'The previous session is kept — nothing was lost.',
        variant: 'destructive',
      })
      return false
    }
    finalizedRef.current = false
    runStartedRef.current = false
    unsavedRef.current = null
    setTimerSessionKey((k) => k + 1)
    setAutoStart(false)
    setSession(null)
    setTourRuntime(null)
    return true
  }, [reset])

  // Runs the action parked by requestStop once the partial is recorded.
  const performPending = useCallback(async () => {
    externalStopRef.current = false
    setExternalStop(false)
    // Retry a previously failed save first — the hook refuses every other
    // operation while results are pending, so this is the recovery path.
    if (unsavedRef.current) {
      try {
        await finalize(unsavedRef.current, false)
        unsavedRef.current = null
      } catch (err) {
        console.error('[HomeTour] retry save failed:', err)
        toast({
          title: 'Session still not saved',
          description: 'The run is kept — try again.',
          variant: 'destructive',
        })
        return
      }
    }
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (!action) return
    switch (action.kind) {
      case 'apply-doc':
        // Adventure picks, hero re-arrival and clear-shared all restore a
        // clean editor over a settled run.
        editedRecordedRef.current = false
        setDoc(action.doc)
        clearSession()
        setTimerSessionKey((k) => k + 1)
        setAutoStart(false)
        break
      case 'restart': {
        const ok = await doStart(action.doc, action.block, action.sectionTitle)
        if (ok) scrollTimerStage()
        break
      }
      case 'restart-unstarted':
        // Discard the never-started snapshot (end() — no note churn) and
        // mint the running note.
        await end()
        {
          const ok = await doStart(action.doc, action.block, action.sectionTitle)
          if (ok) scrollTimerStage()
        }
        break
      case 'reset':
        await doReset()
        break
    }
  }, [doStart, doReset, clearSession, scrollTimerStage, end, finalize])

  // Finalize entry point for host-driven stops. When the run was never
  // started, is already recorded, or has an unsaved pending write (the
  // execution can no longer report), the pending action runs immediately —
  // performPending retries the save first.
  const requestStop = useCallback((pending: typeof pendingActionRef.current) => {
    if (pendingActionRef.current) return // a stop is already in flight
    if (!runRef.current || finalizedRef.current || !runStartedRef.current || unsavedRef.current) {
      pendingActionRef.current = pending
      void performPending()
      return
    }
    pendingActionRef.current = pending
    externalStopRef.current = true
    setExternalStop(true)
  }, [performPending])

  // ── Hero-reset contract (#882): re-entering the hero viewport resets the
  // editor to the initial load content, discarding edits and session state.
  // The initial entry (page load) is arrival, not a re-entry. ──
  const heroRef = useRef<HTMLDivElement | null>(null)
  const heroVisibleRef = useRef(true) // the hero mounts at the top of the page
  const resetHeroToArrival = useCallback(() => {
    setRunSeed((s) => s + 1)
    requestStop({ kind: 'apply-doc', doc: initialContent })
  }, [initialContent, requestStop])

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
    setRunSeed((s) => s + 1)
    requestStop({ kind: 'apply-doc', doc: welcomeScript })
  }, [welcomeScript, requestStop])

  // ── Timer-stage presence ──
  // Desktop: the run section's sticky window with a timer-* stage active.
  // Mobile: a timer-* caption card owning the reading zone.
  const runStageId = activeStages.run
  const stageInTimer =
    (!isMobile && runInView && runStageId != null && runStageId.startsWith('timer-')) ||
    (isMobile && mobileStage?.screen === 'timer')

  // Automatic entrance: dwelling at the timer stages starts the run ONCE per
  // identity. Blowing past (fast scroll) clears the dwell — no hidden run;
  // backward re-entry with a settled identity never re-runs.
  useEffect(() => {
    if (!stageInTimer) return
    if (runRef.current && !finalizedRef.current) return // identity in progress
    if (runRef.current && runSeed === startedSeedRef.current) return // settled; backward re-entry
    const t = window.setTimeout(() => {
      if (runRef.current && !finalizedRef.current) return
      if (runRef.current && runSeed === startedSeedRef.current) return
      void doStart(docRef.current, blocksRef.current[0], 'Run')
    }, 400)
    return () => window.clearTimeout(t)
  }, [stageInTimer, runSeed, run, doStart])

  const [everInTimer, setEverInTimer] = useState(false)
  useEffect(() => {
    if (stageInTimer) setEverInTimer(true)
  }, [stageInTimer])

  // Scroll-out save: leaving the run stages after they were visited halts the
  // live execution and records the partial exactly once (Stop-scroll save).
  const prevStageInTimerRef = useRef(stageInTimer)
  useEffect(() => {
    if (everInTimer && !stageInTimer && prevStageInTimerRef.current) {
      if (runRef.current && runStartedRef.current && !finalizedRef.current) {
        requestStop(null)
      }
    }
    prevStageInTimerRef.current = stageInTimer
  }, [stageInTimer, everInTimer, requestStop])

  // ── Quest + challenge hooks ──
  useQuickStartAutoComplete({
    pageRoute: '/',
    quests,
    initialSource: initialContent,
    currentSource: doc,
  })
  useCompletionChallenge({ pageRoute: '/', quests, completedResults: session })

  const markStageViewed = useTourScrollQuests('/', quests)
  markStageViewedRef.current = markStageViewed

  // The qs-tour-timer interaction quest validates on a *visitor-initiated*
  // run (demoRunning set at the click). The stage-entrance autostart is the
  // guided demo and must never validate the quest.
  // Per-chapter scoping (#919): the global run-started hook handles only the
  // home-tour's own run quest (qs-tour-timer). Each chapter's `<chapter>-run`
  // lead quest is completed by the chapter picker's Run.
  useRunStartedChallenge({ pageRoute: '/', quests, running: demoRunning })

  // ── Editor interactions (one shared document: hero + write pane) ──
  const handleDocChange = useCallback(
    (next: string) => {
      setDoc(next)
      if (next !== initialContent && !editedRecordedRef.current) {
        editedRecordedRef.current = true
        track?.(HOME_EVENTS.demoEdited)
      }
    },
    [initialContent, track],
  )

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    blocksRef.current = blocks
  }, [])

  // Choose-your-own-adventure: a caption workout pick replaces the shared
  // script; any live run is saved first (apply-doc chains after finalize),
  // then the dwell re-runs the new script as a fresh identity.
  const handleWorkoutChoice = useCallback(
    (wod: string) => {
      track?.(HOME_EVENTS.demoEdited)
      setRunSeed((s) => s + 1)
      requestStop({ kind: 'apply-doc', doc: buildAdventureScript(wod) })
    },
    [requestStop, track],
  )

  // Explicit Run (hero / write-pane Run command / Try-it): persist a fresh
  // playground note, then glide onto the timer stage where the inline pane
  // auto-starts. A live unrecorded run is saved first.
  const beginRun = useCallback(
    (sectionTitle: string, doc: string, block: ScriptBlock | null, demo: boolean) => {
      if (!block) return
      track?.(HOME_EVENTS.demoRun)
      if (demo) setDemoRunning(true)
      setRunSeed((s) => s + 1)
      if (runRef.current && runStartedRef.current && !finalizedRef.current) {
        pendingActionRef.current = { kind: 'restart', doc, block, sectionTitle }
        setExternalStop(true)
        return
      }
      if (runRef.current && !finalizedRef.current) {
        pendingActionRef.current = { kind: 'restart-unstarted', doc, block, sectionTitle }
        void performPending()
        return
      }
      void doStart(doc, block, sectionTitle).then((ok) => {
        if (ok) scrollTimerStage()
      })
    },
    [doStart, performPending, scrollTimerStage, track],
  )

  const handleRun = useCallback(() => {
    beginRun('Run', docRef.current, blocksRef.current[0], true)
  }, [beginRun])

  // Chapter example run — scoped per chapter (#919): runs inline WITHOUT
  // firing the global run-started quest; the chapter's own lead quest is
  // completed by the picker. Each run mints a fresh note named for it.
  const handleChapterRun = useCallback(
    (chapterId: string, block: ScriptBlock | null, chapterDoc: string) => {
      track?.(HOME_EVENTS.chapterExampleRun, { chapter: chapterId })
      beginRun(`Chapter ${chapterId}`, chapterDoc, block, false)
    },
    [beginRun, track],
  )

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

  const handleShare = useCallback(() => {
    void shareDoc(docRef.current)
  }, [shareDoc])

  // Chapter picker share (#926): use the chapter's own example doc.
  const handleChapterShare = useCallback((doc: string) => void shareDoc(doc), [shareDoc])

  // Stop click / metrics arrival / scroll-out: the panel reports partial or
  // completed results; finalize records them against the run's note exactly
  // once, then any parked action (reset/restart/doc swap) executes.
  const handleTimerComplete = useCallback(
    (_blockId: string, results: Sessions) => {
      if (!externalStopRef.current) {
        // A panel-originated completion (Stop button or natural finish) slides
        // the visitor onward to the metrics section — the bridge from the run
        // they just saved to querying it. Host-driven stops (metrics arrival,
        // scroll-out) never pull the visitor back.
        if (mobileRunwayApiRef.current) mobileRunwayApiRef.current.scrollToStage('metrics-e')
        else ownApiRef.current?.scrollToStage('metrics-e')
      }
      setSession(results)
      if ((results.logs ?? []).length === 0) {
        finalizedRef.current = true
        void performPending()
        return
      }
      finalizedRef.current = true
      void finalize(results, results.completed)
        .then(() => {
          unsavedRef.current = null
        })
        .then(() => performPending())
        .catch((err) => {
          console.error('[HomeTour] failed to log session to playground:', err)
          finalizedRef.current = false
          // The execution is already halted — it cannot report again. Park
          // the outputs; the next host action retries the save.
          runStartedRef.current = false
          unsavedRef.current = results
          externalStopRef.current = false
          setExternalStop(false)
          pendingActionRef.current = null
          toast({
            title: 'Session not saved',
            description: 'The run could not be recorded. Nothing was lost — your next action retries the save.',
            variant: 'destructive',
          })
        })
    },
    [finalize, performPending],
  )

  // The pane's ✕ returns to the write stage; a live run is saved by the
  // scroll-out rule when the run section's viewport releases.
  const handleTimerClose = useCallback(() => {
    if (mobileRunwayApiRef.current) {
      mobileRunwayApiRef.current.scrollToStage('editor-blank')
      return
    }
    writeApiRef.current?.scrollToStage('editor-blank')
  }, [])

  // Header Reset: save the live partial, then a fresh unstarted snapshot —
  // the dwell (still inside the timer stages) immediately re-runs it.
  const handleTimerReset = useCallback(() => {
    setRunSeed((s) => s + 1)
    requestStop({ kind: 'reset' })
  }, [requestStop])

  // Inline runtime — stored for the TV card. Every tour run auto-starts, so
  // the WaitingToStart gate is popped as soon as the runtime exists (deferred
  // one microtask so the panel's auto-start effect has begun execution).
  const handleRuntimeReady = useCallback((runtime: IScriptRuntime) => {
    setTourRuntime(runtime)
    queueMicrotask(() => {
      runtime.handle(new NextEvent(undefined, runtime.nowProvider))
    })
  }, [])

  // First idle→running transition of the current pane's execution.
  const handleRunStarted = useCallback(() => {
    runStartedRef.current = true
  }, [])

  // Caption command buttons: query presets, board picks, Try-it.
  const handleCaptionCommand = useCallback(
    (captionId: string, key: string) => {
      if (TABLE_QUERIES[key]) {
        setTableQueryKey(key)
        return
      }
      if ((BOARD_SLUGS as readonly string[]).includes(key)) {
        setBoardSlug(key)
        return
      }
      if (key === 'try') {
        beginRun('Run', docRef.current, blocksRef.current[0], true)
      }
    },
    [beginRun],
  )

  // Explore section wiring: the WQL table is scoped to the current run's
  // note; without a run it answers from the live journal or the independent
  // sample dataset.
  const sessionWiring = useMemo(
    () => ({
      noteId: run?.noteId ?? null,
      queryKey: tableQueryKey,
      boardSlug,
    }),
    [run?.noteId, tableQueryKey, boardSlug],
  )

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

  // Inline timer pane wiring — one shape for desktop runway, mobile runway,
  // and the reduced-motion stack. Fresh mount per run identity (sessionKey),
  // auto-start on mount, host-driven finalize stop.
  const timerWiring = {
    sessionKey: timerSessionKey,
    block: run?.block ?? blocksRef.current[0] ?? null,
    autoStart,
    externalStop,
    onClose: handleTimerClose,
    onComplete: handleTimerComplete,
    onRuntimeReady: handleRuntimeReady,
    onRunStarted: handleRunStarted,
    onReset: handleTimerReset,
  }

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
          doc={doc}
          onDocChange={handleDocChange}
          onBlocksChange={handleBlocksChange}
          onRun={handleRun}
          onShare={handleShare}
          onChoice={handleWorkoutChoice}
          onCommand={handleCaptionCommand}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
          timer={timerWiring}
        />
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
          doc={doc}
          onDocChange={handleDocChange}
          onBlocksChange={handleBlocksChange}
          onRun={handleRun}
          onShare={handleShare}
          sharedBy={sharedBy}
          onResetShared={handleClearShared}
          onChoice={handleWorkoutChoice}
          onCommand={handleCaptionCommand}
          session={sessionWiring}
          onStageChange={handleMobileStageChange}
          timer={timerWiring}
          heroRef={heroRef}
          apiRef={mobileRunwayApiRef}
        />
      </div>
    )
  }

  // ── Desktop: a normal-flow hero view (heading + THE editor at first
  // paint — it scrolls out completely before the write track pins), then the
  // write section in the standard tagline-header + sticky-runway pattern,
  // then run / own / explore sections → chapters ──
  return (
    <div data-testid="home-tour">
      {/* Arrival sentinel (#882): a 1px mark at the very top of the page —
          re-entering it from below resets the shared document. */}
      <div ref={heroRef} aria-hidden className="h-px" />

      <section
        id="tour-hero"
        data-testid="tour-hero"
        className="relative flex min-h-[calc(100vh-104px)] flex-col items-center justify-center gap-5 px-5 pt-10 pb-16 text-center lg:px-10"
      >
        <div className="w-full">
          <TourHeroHeading />
        </div>
        <div className="flex w-full max-w-3xl items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          <span>{sharedBy ? `shared by: ${sharedBy}` : 'welcome-1.md'}</span>
          {sharedBy && (
            <button
              type="button"
              onClick={handleClearShared}
              title="Reset"
              className="rounded-md border border-border px-2 py-1 text-[10px] transition-colors hover:bg-accent"
              data-testid="tour-hero-reset-shared"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="tour-hero-run"
          >
            Run
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent"
            data-testid="tour-hero-share"
          >
            Copy share link
          </button>
        </div>
        {/* The write section's sticky pane below is a second display of this
            same shared document — no ring targets here, those belong to the
            runway window. */}
        <div className="h-[62vh] min-h-[420px] w-full max-w-[1200px]">
          <MacOSChrome title={SCREEN_TITLES.editor} className="h-full">
            <TourEditorScreen
              doc={doc}
              theme={theme}
              onDocChange={handleDocChange}
              onBlocksChange={handleBlocksChange}
              onRun={handleRun}
              onShare={handleShare}
            />
          </MacOSChrome>
        </div>
      </section>

      {/* Jump exits sit between the editor window and the first tagline —
          the hero (and its scroll cue) are fully scrolled out by the time the
          write track pins. */}
      <TourJumpSection />

      <TourSectionRunway
        ref={writeApiRef}
        id="write"
        heightVh="300vh"
        header={
          <TaglineHeader
            index="01"
            before="Write it in "
            accentText="Markdown"
            after=""
            accent={TOUR_ACCENTS.editor}
            blurb="Freeform Markdown notes, fenced ```time blocks, property and tag suggestions. Everything starts as plain text you can edit."
          />
        }
        stages={sectionStages.write}
        captions={sectionCaptions.write}
        onChoice={handleWorkoutChoice}
        onCommand={handleCaptionCommand}
        onActiveStageChange={stageHandlers.write}
        editor={{
          doc,
          theme,
          onDocChange: handleDocChange,
          onBlocksChange: handleBlocksChange,
          onRun: handleRun,
          onShare: handleShare,
        }}
      />

      <TourSectionRunway
        ref={runApiRef}
        id="run"
        heightVh="300vh"
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
        onCommand={handleCaptionCommand}
        onActiveStageChange={stageHandlers.run}
        onViewportChange={handleRunViewport}
        timer={timerWiring}
        tvRuntime={tourRuntime}
        tvStageId="timer-cast"
      />

      <TourSectionRunway
        ref={ownApiRef}
        id="own"
        heightVh="260vh"
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
        onCommand={handleCaptionCommand}
        onActiveStageChange={stageHandlers.own}
        session={{ ...sessionWiring, fixedStage: 'wql-table' }}
      />

      <TourSectionRunway
        ref={exploreApiRef}
        id="explore"
        heightVh="320vh"
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
        onCommand={handleCaptionCommand}
        onActiveStageChange={stageHandlers.explore}
        session={sessionWiring}
        toastLabel={
          session
            ? `Stopped at ${fmtClock(session.duration)} — saving results to playground…`
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
