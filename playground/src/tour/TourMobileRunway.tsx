/**
 * TourMobileRunway.tsx — the mobile home page: sticky-editor scroll runway.
 *
 * The mobile sibling of the desktop runway (HomeTour.tsx). Mirrors the
 * syntax-guides' mobile pattern (CanvasEditorPanel's `lg:hidden sticky`
 * panel): a pinned window just below the app header shows the live hero
 * editor while the caption cards scroll beneath it, swaps to the
 * timer/analytics screens for those stages, and releases after the last
 * caption card. The headline and short-circuit strip scroll away naturally.
 *
 * Stage detection is card-visibility driven (IntersectionObserver over the
 * reading zone below the pinned window) instead of the desktop's scroll-
 * progress driver — the cards scroll, so the cards say which stage is live.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import {
  SCREEN_TITLES,
  TOUR_STAGES,
  type TourScreen,
  type TourStage,
  type TourStageId,
} from './tourStages'
import { TourHeroHeading } from './TourHero'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourAnalyticsScreen } from './screens/TourAnalyticsScreen'
import { TOUR_CAPTIONS, CaptionBody } from './TourCaptions'
import { TourShortCircuitStrip } from './TourShortCircuitStrip'
import { TourLearnSection } from './TourLearnSection'
import { TourRegistrySection } from './TourRegistrySection'
import { TourReferenceSection } from './TourReferenceSection'
import { TelemetryConsentFooter } from './TelemetryConsentFooter'
import { CelebrationBridge } from './CelebrationBridge'
import { ChapterHeroSection } from './ChapterHeroSection'
import { LearnProgressOverview } from './TourLearnSection'
import { TourRing } from './TourRing'

/**
 * Scroll pacing per caption card: each card dwells in the reading zone for
 * roughly this much scroll. 7 slots ≈ 490vh of runway under the ~50vh window.
 */
const CARD_SLOT_MIN_HEIGHT = '70vh'

export interface TourMobileRunwayApi {
  /** Scroll a stage's caption card into the reading zone. */
  scrollToStage(stageId: TourStageId): void
}

export interface TourMobileTimerProps {
  sessionKey: number
  block: ScriptBlock | null
  autoStart: boolean
  /** Scroll-out stop (#885): halt without resetting when off the timer cards. */
  externalPause: boolean
  onClose: () => void
  onComplete: (blockId: string, results: WorkoutResults) => void
  onRuntimeReady: (runtime: IScriptRuntime) => void
  onReset: () => void
}

export interface TourMobileRunwayProps {
  theme: string
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
  /** Hero editor context — the pinned live editor (editable, runnable). */
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  onOpenInEditor: () => void
  /** Shared-script attribution + reset, forwarded to the editor (#882). */
  sharedBy?: string
  onResetShared?: () => void
  /** Choose-your-own-adventure workout choice from the editor-blank card. */
  onChoice?: (wod: string) => void
  /** Lazy-mount flags for the timer/analytics screens (owned by HomeTour). */
  entered: Record<TourScreen, boolean>
  /** Reports the stage whose caption card owns the reading zone. */
  onStageChange: (stage: TourStage) => void
  timer: TourMobileTimerProps
  analyticsSegments: Segment[]
  /** Arrival-reset sentinel (#882) — HomeTour observes this wrapper. */
  heroRef: React.Ref<HTMLDivElement>
  /** Imperative escape hatch for quest clicks / completion auto-slide. */
  apiRef: React.MutableRefObject<TourMobileRunwayApi | null>
}

export function TourMobileRunway({
  theme,
  quests,
  chapters,
  questLabels,
  onHomeQuestClick,
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onOpenInEditor,
  sharedBy,
  onResetShared,
  onChoice,
  entered,
  onStageChange,
  timer,
  analyticsSegments,
  heroRef,
  apiRef,
}: TourMobileRunwayProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  const windowCanvasRef = useRef<HTMLDivElement | null>(null)
  // ── Stage detection ──
  // reached: the track top has hit the app header — nothing counts before.
  const reachedRef = useRef(false)
  // Cards currently inside the reading zone (element → stage index).
  const visibleRef = useRef(new Map<Element, number>())
  const [stage, setStage] = useState<TourStage | null>(null)
  // Reading-zone geometry: below the pinned window (~50vh + half its offset),
  // same math as MarkdownCanvasPage's mobile scroll-spy.
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const readingZoneTop = Math.round(viewportHeight / 2 + MOBILE_STICKY_TOP / 2)

  const resolveVisibleStage = useCallback(() => {
    // Pick the visible card nearest the reading-zone center.
    const zoneCenter = readingZoneTop + (viewportHeight - readingZoneTop) / 2
    let bestIdx = -1
    let bestDist = Infinity
    visibleRef.current.forEach((idx, el) => {
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(rect.top + rect.height / 2 - zoneCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = idx
      }
    })
    if (bestIdx >= 0) setStage(TOUR_STAGES[bestIdx])
  }, [readingZoneTop, viewportHeight])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const cards = cardRefs.current
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = cards.indexOf(entry.target as HTMLDivElement)
          if (idx === -1) continue
          if (entry.isIntersecting) visibleRef.current.set(entry.target, idx)
          else visibleRef.current.delete(entry.target)
        }
        if (reachedRef.current) resolveVisibleStage()
      },
      { rootMargin: `-${readingZoneTop}px 0px -30% 0px` },
    )
    for (const el of cards) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [readingZoneTop, resolveVisibleStage])

  useEffect(() => {
    const el = trackRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        reachedRef.current = true
        resolveVisibleStage()
        observer.disconnect()
      },
      { rootMargin: `-${MOBILE_STICKY_TOP + 1}px 0px 0px 0px` },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [resolveVisibleStage])

  useEffect(() => {
    if (stage) onStageChange(stage)
  }, [stage, onStageChange])

  // ── Imperative api: scroll a stage's card into the reading zone ──
  useEffect(() => {
    apiRef.current = {
      scrollToStage: (stageId) => {
        const idx = TOUR_STAGES.findIndex((s) => s.id === stageId)
        if (idx >= 0) cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef])

  // ── Spec §2: the mobile analytics card degrades to a single live stat ──
  const [weekFacts, setWeekFacts] = useState<number | undefined>(undefined)
  useEffect(() => {
    const end = Date.now()
    let cancelled = false
    void indexedDBService
      .getFactsByTimeRange(end - 7 * 86_400_000, end)
      .then((facts) => {
        if (!cancelled) setWeekFacts(facts.length)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const screen: TourScreen = stage?.screen ?? 'editor'

  return (
    <div data-testid="tour-mobile-runway" className="flex flex-col">
      {/* Headline — scrolls away naturally; the editor lives in the pinned window. */}
      <div
        ref={heroRef}
        className="relative flex flex-col items-center justify-center px-6 pt-10 pb-6 text-center"
        style={{ minHeight: 'auto' }}
      >
        <TourHeroHeading />
      </div>

      <TourShortCircuitStrip />

      {/* Runway: the sticky parent spans window + cards, so the window
          releases right after the last caption card. */}
      <div ref={trackRef} data-testid="tour-mobile-runway-track" className="relative">
        <div
          data-testid="tour-mobile-runway-window"
          className="sticky z-20 shrink-0 px-4 pt-[2px] pb-1"
          style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
        >
          <MacOSChrome title={SCREEN_TITLES[screen]} className="h-full">
            <div ref={windowCanvasRef} className="relative h-full">
              <TourRing target={stage?.ring} accent="hsl(var(--metric-resistance))" canvasRef={windowCanvasRef} unscaled />
              <ScreenFade visible={screen === 'editor'}>
                <TourEditorScreen
                  doc={doc}
                  onDocChange={onDocChange}
                  onBlocksChange={onBlocksChange}
                  onRun={onRun}
                  onShare={onShare}
                  onOpenInEditor={onOpenInEditor}
                  theme={theme}
                  sharedBy={sharedBy}
                  onResetShared={onResetShared}
                />
              </ScreenFade>
              {entered.timer && (
                <ScreenFade visible={screen === 'timer'}>
                  <TourTimerScreen
                    key={timer.sessionKey}
                    block={timer.block}
                    autoStart={timer.autoStart}
                    onClose={timer.onClose}
                    onComplete={timer.onComplete}
                    onRuntimeReady={timer.onRuntimeReady}
                    onReset={timer.onReset}
                    externalPause={timer.externalPause}
                  />
                </ScreenFade>
              )}
              {entered.analytics && (
                <ScreenFade visible={screen === 'analytics'}>
                  <TourAnalyticsScreen segments={analyticsSegments} />
                </ScreenFade>
              )}
            </div>
          </MacOSChrome>
        </div>

        {/* Caption cards scroll through the reading zone below the window. */}
        <div data-testid="tour-mobile-runway-cards">
          {TOUR_CAPTIONS.map((cap, i) => (
            <div
              key={cap.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              data-testid={`tour-mobile-card-${cap.id}`}
              className="flex items-center justify-center px-6 py-8"
              style={{ minHeight: CARD_SLOT_MIN_HEIGHT }}
            >
              <article className="w-full max-w-xl rounded-2xl border border-border bg-card p-6">
                <CaptionBody cap={cap} onChoice={onChoice} />
                {cap.id === 'analytics-scorecard' && weekFacts !== undefined && (
                  <div className="mt-4">
                    <div className="text-3xl font-black text-foreground">{weekFacts}</div>
                    <div className="text-xs text-muted-foreground">
                      facts logged in the last 7 days
                    </div>
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>
      </div>

      <CelebrationBridge chapters={chapters} />

      {/* Six Syntax Chapter Heroes */}
      {chapters
        .filter((c) => c.id !== 'home-tour')
        .map((ch) => (
          <ChapterHeroSection
            key={ch.id}
            chapter={ch}
            allChapters={chapters}
            allQuests={quests}
            questLabels={questLabels}
            onRunExample={(chapterId, source) => {
              onDocChange(source)
              onRun()
            }}
          />
        ))}

      <LearnProgressOverview
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={onHomeQuestClick}
      />
      <TourRegistrySection />
      <TourReferenceSection />
      <TelemetryConsentFooter />
    </div>
  )
}

/** Cross-fade wrapper for a screen inside the pinned window. */
function ScreenFade({ visible, children }: { visible: boolean; children: React.ReactNode }) {
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
