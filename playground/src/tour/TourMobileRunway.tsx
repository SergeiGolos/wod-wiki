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
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import {
  SCREEN_TITLES,
  TOUR_STAGES,
  type TourScreen,
  type TourStage,
  type TourStageId,
} from './tourConstants'
import { TourHero } from './TourHero'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { HomeAnalyticsSection } from './HomeAnalyticsSection'
import { TOUR_CAPTIONS, CaptionBody } from './TourCaptions'
import { TourShortCircuitStrip } from './TourShortCircuitStrip'
import { LearnProgressOverview } from './TourLearnSection'
import { TourRegistrySection } from './TourRegistrySection'
import { TourReferenceSection } from './TourReferenceSection'
import { TelemetryConsentFooter } from './TelemetryConsentFooter'
import { CelebrationBridge } from './CelebrationBridge'
import { ChapterHeroSection } from './ChapterHeroSection'
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
  /** Chapter hero run/share/open — forwarded to each ChapterHeroSection. */
  onChapterRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onChapterShare?: (doc: string) => void
  onChapterOpenInEditor?: (doc: string) => void
  onHomeQuestClick?: (questId: string) => void
  /** Hero editor context — the live welcome-1.md editor at the top of the
   *  page (editable, runnable), matching the desktop hero. */
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  onOpenInEditor: () => void
  /** Runway editor context — the pinned demo window (editor → timer →
   *  analytics), independent of the hero like the desktop runway. */
  runwayDoc: string
  onRunwayDocChange: (next: string) => void
  onRunwayBlocksChange: (blocks: ScriptBlock[]) => void
  onRunwayRun: () => void
  onRunwayShare: () => void
  onRunwayOpenInEditor: () => void
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
  onChapterRun,
  onChapterShare,
  onChapterOpenInEditor,
  onHomeQuestClick,
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onOpenInEditor,
  runwayDoc,
  onRunwayDocChange,
  onRunwayBlocksChange,
  onRunwayRun,
  onRunwayShare,
  onRunwayOpenInEditor,
  sharedBy,
  onResetShared,
  onChoice,
  entered,
  onStageChange,
  timer,
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
    // Active card = the one whose TOP sits nearest just below the pinned
    // window (#dogfood mobile: headline clipped behind the demo card when the
    // center-anchored pick settled mid-card). Anchoring to the top keeps the
    // active card's headline visible; taller cards simply read on downward.
    const anchor = readingZoneTop + 12
    let bestIdx = -1
    let bestDist = Infinity
    visibleRef.current.forEach((idx, el) => {
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(rect.top - anchor)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = idx
      }
    })
    if (bestIdx >= 0) setStage(TOUR_STAGES[bestIdx])
  }, [readingZoneTop])

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
        // block:'start' + the cards' scroll-margin-top lands the card top just
        // below the pinned window — center-landing hid the headline behind it.
        if (idx >= 0) cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef])

  const screen: TourScreen = stage?.screen ?? 'editor'

  // Mobile ring resolution: the desktop slice resolves ringA/ringB beats from
  // scroll progress; the card-driven mobile stage has no local t, so beat A
  // is the anchor (#dogfood: `stage?.ring` doesn't exist on TourStage — the
  // ring never rendered on mobile).
  const ringTarget = stage?.ringA ? { key: stage.ringA, tag: stage.tagA } : null

  return (
    <div data-testid="tour-mobile-runway" className="flex flex-col">
      {/* Hero — same first section as desktop: headline + live welcome-1.md
          demo editor, formatted for mobile. */}
      <div ref={heroRef}>
        <TourHero
          theme={theme}
          doc={doc}
          onDocChange={onDocChange}
          onBlocksChange={onBlocksChange}
          onRun={onRun}
          onShare={onShare}
          onOpenInEditor={onOpenInEditor}
          sharedBy={sharedBy}
          onResetShared={onResetShared}
        />
      </div>

      <TourShortCircuitStrip />

      {/* Runway: the sticky parent spans window + cards, so the window
          releases right after the last caption card. */}
      <div ref={trackRef} data-testid="tour-mobile-runway-track" className="relative">
        <div
          data-testid="tour-mobile-runway-window"
          className="sticky z-20 shrink-0 px-4 pt-2 pb-1"
          style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
        >
          <MacOSChrome title={SCREEN_TITLES[screen]} className="h-full">
            <div ref={windowCanvasRef} className="relative h-full">
              <TourRing target={ringTarget} accent={stage?.accent ?? 'hsl(var(--metric-resistance))'} canvasRef={windowCanvasRef} unscaled />
              <ScreenFade visible={screen === 'editor'}>
                <TourEditorScreen
                  doc={runwayDoc}
                  onDocChange={onRunwayDocChange}
                  onBlocksChange={onRunwayBlocksChange}
                  onRun={onRunwayRun}
                  onShare={onRunwayShare}
                  onOpenInEditor={onRunwayOpenInEditor}
                  theme={theme}
                  sharedBy={sharedBy}
                  onResetShared={onResetShared}
                  withRingTargets
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
              style={{
                minHeight: CARD_SLOT_MIN_HEIGHT,
                // Land scrollToStage arrivals just below the pinned window
                // (window bottom ≈ 50vh + MOBILE_STICKY_TOP / 2).
                scrollMarginTop: `calc(50vh + ${MOBILE_STICKY_TOP / 2}px + 12px)`,
              }}
            >
              <article className="w-full max-w-xl rounded-2xl border border-border bg-card p-6">
                <CaptionBody cap={cap} onChoice={onChoice} />
              </article>
            </div>
          ))}
        </div>
      </div>

      {/* WQL-elements analytics showcase (#938) — one static section; the
          tile grid stacks to a single column on mobile. */}
      <HomeAnalyticsSection />

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
            theme={theme}
            questLabels={questLabels}
            onRun={onChapterRun}
            onShare={onChapterShare}
            onOpenInEditor={onChapterOpenInEditor}
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
