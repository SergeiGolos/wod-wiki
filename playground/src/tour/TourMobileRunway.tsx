/**
 * TourMobileRunway.tsx — the mobile home page: sticky-editor scroll runway.
 *
 * The mobile sibling of the desktop runway (HomeTour.tsx). A pinned window
 * below the mobile header showcases the active demo (editor → timer →
 * metrics → analytics) as the visitor scrolls through the 4 tagline sections:
 *
 *   01 / Write it in Markdown  (#tour-section-write)
 *   02 / Run it as a Timer      (#tour-section-run)
 *   03 / Own the Metrics        (#tour-section-own)
 *   04 / Explore your analytics (#tour-section-explore)
 *
 * Stage detection is card-visibility driven (IntersectionObserver over the
 * reading zone below the pinned window).
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
  TOUR_ACCENTS,
  TOUR_STAGES,
  type TourScreen,
  type TourStage,
  type TourStageId,
} from './tourConstants'
import { TourHero } from './TourHero'
import { TourJumpSection } from './TourJumpSection'
import { TaglineHeader } from './HomeTour'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourMetricsScreen } from './screens/TourMetricsScreen'
import { TourAnalyticsShowcaseScreen } from './screens/TourAnalyticsShowcaseScreen'
import { TOUR_CAPTIONS, CaptionBody, type TourCaption } from './TourCaptions'
import { TourChapterPicker } from './TourChapterPicker'
import { TourLearnSection } from './TourLearnSection'
import { TourRing, useRingRef } from './TourRing'

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
  wodFiles?: Record<string, string>
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
  /** Hero editor context — the live welcome-1.md editor at the top of the page. */
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  /** Runway editor context — the pinned demo window. */
  runwayDoc: string
  onRunwayDocChange: (next: string) => void
  onRunwayBlocksChange: (blocks: ScriptBlock[]) => void
  onRunwayRun: () => void
  onRunwayShare: () => void
  /** Shared-script attribution + reset, forwarded to the editor (#882). */
  sharedBy?: string
  onResetShared?: () => void
  /** Choose-your-own-adventure workout choice from the editor-blank card. */
  onChoice?: (wod: string) => void
  /** Lazy-mount flags for the timer/metrics/analytics screens. */
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
  wodFiles = {},
  quests,
  chapters,
  questLabels,
  onHomeQuestClick,
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  runwayDoc,
  onRunwayDocChange,
  onRunwayBlocksChange,
  onRunwayRun,
  onRunwayShare,
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
  const editorWindowRef = useRingRef('editor.window')
  const windowCanvasRingRef = useCallback((el: HTMLDivElement | null) => {
    windowCanvasRef.current = el
    editorWindowRef(el)
  }, [editorWindowRef])

  const reachedRef = useRef(false)
  const visibleRef = useRef(new Map<Element, number>())
  const [stage, setStage] = useState<TourStage | null>(null)
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
    if (bestIdx >= 0) setStage(TOUR_STAGES[bestIdx] ?? null)
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
        if (idx >= 0) cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef])

  const screen: TourScreen = stage?.screen ?? 'editor'
  const ringTarget = stage?.ringA ? { key: stage.ringA, tag: stage.tagA } : null

  // Categorize captions into the 4 tagged sections
  const writeCaptions = TOUR_CAPTIONS.filter((c) => c.id.startsWith('editor-'))
  const runCaptions = TOUR_CAPTIONS.filter((c) => c.id.startsWith('timer-'))
  const ownCaptions = TOUR_CAPTIONS.filter((c) => c.id.startsWith('metrics-'))
  const exploreCaptions = TOUR_CAPTIONS.filter((c) => c.id.startsWith('wql-'))

  const renderCard = (cap: TourCaption) => {
    const globalIdx = TOUR_CAPTIONS.findIndex((c) => c.id === cap.id)
    return (
      <div
        key={cap.id}
        ref={(el) => {
          if (globalIdx >= 0) cardRefs.current[globalIdx] = el
        }}
        data-testid={`tour-mobile-card-${cap.id}`}
        className="flex items-center justify-center px-6 py-8"
        style={{
          minHeight: CARD_SLOT_MIN_HEIGHT,
          scrollMarginTop: `calc(50vh + ${MOBILE_STICKY_TOP / 2}px + 12px)`,
        }}
      >
        <article className="w-full max-w-xl rounded-2xl border border-border bg-card p-6">
          <CaptionBody cap={cap} onChoice={onChoice} />
        </article>
      </div>
    )
  }

  return (
    <div data-testid="tour-mobile-runway" className="flex flex-col">
      {/* Hero — interactive greeting and live editor */}
      <div ref={heroRef}>
        <TourHero
          theme={theme}
          doc={doc}
          onDocChange={onDocChange}
          onBlocksChange={onBlocksChange}
          onRun={onRun}
          onShare={onShare}
          sharedBy={sharedBy}
          onResetShared={onResetShared}
        />
      </div>

      {/* Jump section immediately below hero */}
      <TourJumpSection />

      {/* Runway: the sticky parent spans window + cards */}
      <div ref={trackRef} data-testid="tour-mobile-runway-track" className="relative">
        <div
          data-testid="tour-mobile-runway-window"
          className={`sticky z-20 shrink-0 px-4 pt-2 pb-1 ${
            screen === 'analytics' || screen === 'metrics' ? 'min-h-[26rem]' : ''
          }`}
          style={{
            top: `${MOBILE_STICKY_TOP}px`,
            height:
              screen === 'analytics' || screen === 'metrics'
                ? 'min(72vh, 42rem)'
                : `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)`,
          }}
        >
          <div ref={windowCanvasRingRef} className="relative h-full">
            <MacOSChrome title={SCREEN_TITLES[screen]} className="h-full">
              <div className="relative h-full">
                <ScreenFade visible={screen === 'editor'}>
                  <TourEditorScreen
                    doc={runwayDoc}
                    onDocChange={onRunwayDocChange}
                    onBlocksChange={onRunwayBlocksChange}
                    onRun={onRunwayRun}
                    onShare={onRunwayShare}
                    theme={theme}
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
                {entered.metrics && (
                  <ScreenFade visible={screen === 'metrics'}>
                    <TourMetricsScreen activeStageId={stage?.id ?? 'metrics-e'} />
                  </ScreenFade>
                )}
                {entered.analytics && (
                  <ScreenFade visible={screen === 'analytics'}>
                    <TourAnalyticsShowcaseScreen activeStageId={stage?.id ?? 'wql-idea'} />
                  </ScreenFade>
                )}
              </div>
            </MacOSChrome>
            <TourRing
              target={ringTarget}
              accent={stage?.accent ?? 'hsl(var(--metric-resistance))'}
              canvasRef={windowCanvasRef}
            />
          </div>
        </div>

        {/* 4 Tagline sections with cards */}
        <div data-testid="tour-mobile-runway-cards">
          {/* Section 01: Write it in Markdown */}
          <div id="tour-section-write" data-testid="tour-section-write">
            <TaglineHeader
              index="01"
              before="Write it in "
              accentText="Markdown"
              after=""
              accent={TOUR_ACCENTS.editor}
              blurb="Freeform Markdown notes, fenced ```time blocks, live type-ahead. Everything starts as plain text you can edit."
            />
            {writeCaptions.map((cap) => renderCard(cap))}
          </div>

          {/* Section 02: Run it as a Timer */}
          <div id="tour-section-run" data-testid="tour-section-run">
            <TaglineHeader
              index="02"
              before="Run it as a "
              accentText="Timer"
              after=""
              accent={TOUR_ACCENTS.timer}
              blurb="The script becomes the clock. Step through rounds, cast to the big screen, and pace the room together."
            />
            {runCaptions.map((cap) => renderCard(cap))}
          </div>

          {/* Section 03: Own the Metrics */}
          <div id="tour-section-own" data-testid="tour-section-own">
            <TaglineHeader
              index="03"
              before="Own the "
              accentText="Metrics"
              after=""
              accent={TOUR_ACCENTS.analytics}
              blurb="Every movement produces facts. Metrics bind to efforts, accumulating structured workout data on every pass."
            />
            {ownCaptions.map((cap) => renderCard(cap))}
          </div>

          {/* Section 04: Explore your analytics */}
          <div id="tour-section-explore" data-testid="tour-section-explore">
            <TaglineHeader
              index="04"
              before=""
              accentText="Explore"
              after=" your analytics"
              accent={TOUR_ACCENTS.rounds}
              blurb="Query what you just did in WQL. Roll up totals, graph volume over time, and build custom dashboards."
            />
            {exploreCaptions.map((cap) => renderCard(cap))}
          </div>
        </div>
      </div>

      {/* Syntax chapter picker — single slide with shared editor & dual buttons */}
      <TourChapterPicker wodFiles={wodFiles} theme={theme} />

      {/* High-level learn & quest progress */}
      <TourLearnSection
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={onHomeQuestClick}
      />
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
