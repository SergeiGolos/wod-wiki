/**
 * TourMobileRunway.tsx — the mobile home page: per-chapter sticky runways.
 *
 * The mobile sibling of the desktop runway (HomeTour.tsx), mirroring its
 * chapter anatomy — every chapter set is a bounded section and every
 * boundary is visible (each section opens with its TaglineHeader rule):
 *
 *   hero        — own view box: heading + THE editor at first paint; normal
 *                 scroll content that scrolls out completely
 *   01 / write  — TaglineHeader + bounded sticky editor track (#tour-section-write)
 *   02 / run    — TaglineHeader + bounded sticky clock track  (#tour-section-run)
 *   03 / own    — TaglineHeader + bounded sticky table track  (#tour-section-own)
 *   04 / explore— TaglineHeader + bounded sticky WQL track   (#tour-section-explore)
 *
 * Each chapter owns its sticky window via CSS section ownership: the window
 * pins only while its own section is on screen. The hero and the write
 * window display the SAME controlled document (edits survive the boundary —
 * nothing remounts on scroll). No cross-chapter window, so no hidden
 * duplicated runtimes: one clock, one session table per hosting chapter,
 * each mounted lazily on first arrival and kept alive after. No decorative
 * window chrome on mobile — the bounded viewport belongs to the
 * runtime/editor. Stage detection is card-visibility driven
 * (IntersectionObserver over the reading zone below the windows).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import type { ScriptBlock } from '@/components/Editor/types'
import type { Quest } from '../hooks/usePageQuests'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import {
  TOUR_ACCENTS,
  TOUR_STAGES,
  type TourScreen,
  type TourStage,
  type TourStageId,
  type RingTargetKey,
} from './tourConstants'
import { TourHeroHeading } from './TourHero'
import { TourJumpSection } from './TourJumpSection'
import { TaglineHeader } from './HomeTour'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourSessionAnalytics, DEFAULT_TABLE_QUERY_KEY, DEFAULT_BOARD_SLUG } from './screens/TourSessionAnalytics'
import type { TourSectionTimerWiring, TourSectionSessionWiring } from './TourSectionRunway'
import { TOUR_CAPTIONS, CaptionBody, type TourCaption } from './TourCaptions'
import { TourChapterPicker } from './TourChapterPicker'
import { TourLearnSection } from './TourLearnSection'
import { TourRing, useRingRef } from './TourRing'

const CARD_SLOT_MIN_HEIGHT = '70vh'
/** Bounded sticky stage window: full width, 40vh tall under the app nav. */
const STAGE_WINDOW_HEIGHT = '40vh'
/** The clock needs usable controls — the timer window grows (still bounded). */
const TIMER_WINDOW_HEIGHT = 'min(72vh, 42rem)'
/** First-paint editor box inside the hero view (desktop's is 62vh). */
const HERO_EDITOR_HEIGHT = '52vh'

export interface TourMobileRunwayApi {
  /** Scroll a stage's caption card into the reading zone. */
  scrollToStage(stageId: TourStageId): void
}

// Timer pane wiring mirrors the desktop runway exactly (one inline pane).
export type TourMobileTimerProps = TourSectionTimerWiring

export interface TourMobileRunwayProps {
  theme: string
  wodFiles?: Record<string, string>
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
  /** Chapter example run — runs inline in the pinned timer window. */
  onChapterRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onChapterShare?: (doc: string) => void
  /** The single shared editor document (hero + write window display it). */
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  /** Shared-script attribution + reset, forwarded to the editor (#882). */
  sharedBy?: string
  onResetShared?: () => void
  /** Choose-your-own-adventure workout choice from the editor-blank card. */
  onChoice?: (wod: string) => void
  /** Caption command buttons (Try it / query presets / board picks). */
  onCommand?: (captionId: string, key: string) => void
  /** Session WQL/dashboard pane for the explore window. */
  session?: TourSectionSessionWiring
  /** Reports the stage whose caption card owns the reading zone. */
  onStageChange: (stage: TourStage) => void
  timer: TourMobileTimerProps
  /** Arrival-reset sentinel (#882) — HomeTour observes this wrapper. */
  heroRef: React.Ref<HTMLDivElement>
  /** Imperative escape hatch for quest clicks / completion auto-slide. */
  apiRef: React.MutableRefObject<TourMobileRunwayApi | null>
}

/** The chapter tracks, in page order — one bounded sticky runway each. */
type ChapterTrackId = 'write' | 'run' | 'own' | 'explore'

/** The screen each chapter's window hosts. */
const CHAPTER_SCREENS: Record<ChapterTrackId, TourScreen> = {
  write: 'editor',
  run: 'timer',
  own: 'metrics',
  explore: 'analytics',
}

/** Ring accent fallback per chapter window. */
const CHAPTER_ACCENTS: Record<ChapterTrackId, string> = {
  write: TOUR_ACCENTS.editor,
  run: TOUR_ACCENTS.timer,
  own: TOUR_ACCENTS.analytics,
  explore: TOUR_ACCENTS.analytics,
}

export function TourMobileRunway({
  theme,
  wodFiles = {},
  quests,
  chapters,
  questLabels,
  onHomeQuestClick,
  onChapterRun,
  onChapterShare,
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onChoice,
  onCommand,
  session,
  onStageChange,
  timer,
  heroRef,
  apiRef,
}: TourMobileRunwayProps) {
  const writeTrackRef = useRef<HTMLDivElement | null>(null)
  const runTrackRef = useRef<HTMLDivElement | null>(null)
  const ownTrackRef = useRef<HTMLDivElement | null>(null)
  const exploreTrackRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  // Ring canvases: the write window keeps the registered `editor.window`
  // target; the other windows measure their own canvas without registering.
  const writeCanvasRef = useRef<HTMLDivElement | null>(null)
  const editorWindowRef = useRingRef('editor.window')
  const writeCanvasRingRef = useCallback(
    (el: HTMLDivElement | null) => {
      writeCanvasRef.current = el
      editorWindowRef(el)
    },
    [editorWindowRef],
  )
  const runCanvasRef = useRef<HTMLDivElement | null>(null)
  const ownCanvasRef = useRef<HTMLDivElement | null>(null)
  const exploreCanvasRef = useRef<HTMLDivElement | null>(null)

  // Heavy panes mount once their chapter track is first reached, then stay
  // alive (keep-alive — same contract as the desktop sections; dirty edits
  // and run state survive scrolling). Any track arrival also unlocks
  // card-driven stage detection.
  const [reached, setReached] = useState<Record<ChapterTrackId, boolean>>({
    write: false,
    run: false,
    own: false,
    explore: false,
  })
  // The card observer must NOT re-create when `reached` flips (a fresh
  // IntersectionObserver would orphan the test/page triggers) — the guard
  // reads a ref while the state only gates pane mounting.
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

  // One arrival observer per chapter track: latches that track's keep-alive
  // mount and unlocks stage detection on the first one.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const tracks: Array<[ChapterTrackId, HTMLDivElement | null]> = [
      ['write', writeTrackRef.current],
      ['run', runTrackRef.current],
      ['own', ownTrackRef.current],
      ['explore', exploreTrackRef.current],
    ]
    const observers = tracks.map(([id, el]) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          reachedRef.current = true
          setReached((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
          resolveVisibleStage()
          observer.disconnect()
        },
        { rootMargin: `-${MOBILE_STICKY_TOP + 1}px 0px 0px 0px` },
      )
      if (el) observer.observe(el)
      return observer
    })
    return () => observers.forEach((o) => o.disconnect())
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

  // The runtime pane mounts only after the clock stage was actively visited.
  const [timerEngaged, setTimerEngaged] = useState(false)
  useEffect(() => {
    if (stage?.screen === 'timer') setTimerEngaged(true)
  }, [stage])

  const ringTarget = stage?.ringA ? { key: stage.ringA, tag: stage.tagA } : null
  /** A window's ring is live only while its own chapter owns the stage. */
  const ringFor = (id: ChapterTrackId) =>
    stage?.screen === CHAPTER_SCREENS[id] ? ringTarget : null
  const accentFor = (id: ChapterTrackId) =>
    stage?.screen === CHAPTER_SCREENS[id] && stage?.accent ? stage.accent : CHAPTER_ACCENTS[id]

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
          <CaptionBody cap={cap} onChoice={onChoice} onCommand={onCommand} />
        </article>
      </div>
    )
  }

  return (
    <div data-testid="tour-mobile-runway" className="flex flex-col">
      {/* ── Hero — its own view box: heading + THE editor at first paint,
          normal scroll content; it scrolls out completely before the write
          track pins (mirrors the desktop hero view). ── */}
      <div ref={heroRef} id="tour-hero" data-testid="tour-hero" className="relative px-4 pt-8 pb-10">
        <TourHeroHeading />
        {/* Flat native card — no decorative chrome on mobile. This is the
            first display of the shared document; the write section's sticky
            pane below is the second display of the same controlled doc. */}
        <div
          className="mt-6 min-h-[300px] w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
          style={{ height: HERO_EDITOR_HEIGHT }}
        >
          <TourEditorScreen
            doc={doc}
            onDocChange={onDocChange}
            onBlocksChange={onBlocksChange}
            onRun={onRun}
            onShare={onShare}
            theme={theme}
          />
        </div>
      </div>

      {/* Direct exits sit between the hero view and the first chapter. */}
      <TourJumpSection />

      {/* ── Section 01: Write it in Markdown — the chapter owns its sticky
          editor track (CSS section ownership: the window pins only inside
          this section, then scrolls out with it). ── */}
      <section id="tour-section-write" data-testid="tour-section-write" className="flex flex-col">
        <TaglineHeader
          index="01"
          before="Write it in "
          accentText="Markdown"
          after=""
          accent={TOUR_ACCENTS.editor}
          blurb="Freeform Markdown notes, fenced ```time blocks, property and tag suggestions. Everything starts as plain text you can edit."
        />
        <div ref={writeTrackRef} data-testid="tour-mobile-runway-track-write" className="relative">
          <ChapterWindow
            id="write"
            height={STAGE_WINDOW_HEIGHT}
            canvasRef={writeCanvasRef}
            innerRef={writeCanvasRingRef}
            ringTarget={ringFor('write')}
            accent={accentFor('write')}
          >
            {reached.write && (
              <TourEditorScreen
                doc={doc}
                onDocChange={onDocChange}
                onBlocksChange={onBlocksChange}
                onRun={onRun}
                onShare={onShare}
                theme={theme}
                withRingTargets
              />
            )}
          </ChapterWindow>
          {writeCaptions.map((cap) => renderCard(cap))}
        </div>
      </section>

      {/* ── Section 02: Run it as a Timer — own bounded clock track. ── */}
      <section id="tour-section-run" data-testid="tour-section-run" className="flex flex-col">
        <TaglineHeader
          index="02"
          before="Run it as a "
          accentText="Timer"
          after=""
          accent={TOUR_ACCENTS.timer}
          blurb="The script becomes the clock. Step through rounds, cast to the big screen, and pace the room together."
        />
        <div ref={runTrackRef} data-testid="tour-mobile-runway-track-run" className="relative">
          <ChapterWindow
            id="run"
            height={TIMER_WINDOW_HEIGHT}
            canvasRef={runCanvasRef}
            ringTarget={ringFor('run')}
            accent={accentFor('run')}
          >
            {/* The runtime mounts only after the clock stage was actively
                visited — skipping past never creates a hidden runtime. */}
            {reached.run && timerEngaged && (
              <TourTimerScreen
                key={timer.sessionKey}
                block={timer.block}
                autoStart={timer.autoStart}
                onClose={timer.onClose}
                onComplete={timer.onComplete}
                onRuntimeReady={timer.onRuntimeReady}
                onRunStarted={timer.onRunStarted}
                onReset={timer.onReset}
                externalStop={timer.externalStop}
              />
            )}
          </ChapterWindow>
          {runCaptions.map((cap) => renderCard(cap))}
        </div>
      </section>

      {/* ── Section 03: Own the Metrics — hosts the LIVE session table. ── */}
      <section id="tour-section-own" data-testid="tour-section-own" className="flex flex-col">
        <TaglineHeader
          index="03"
          before="Own the "
          accentText="Metrics"
          after=""
          accent={TOUR_ACCENTS.analytics}
          blurb="Every movement produces facts. Metrics bind to efforts, accumulating structured workout data on every pass."
        />
        <div ref={ownTrackRef} data-testid="tour-mobile-runway-track-own" className="relative">
          <ChapterWindow
            id="own"
            height={STAGE_WINDOW_HEIGHT}
            canvasRef={ownCanvasRef}
            ringTarget={ringFor('own')}
            accent={accentFor('own')}
          >
            {reached.own && (
              <TourSessionAnalytics
                activeStageId="wql-table"
                noteId={session?.noteId ?? null}
                queryKey={session?.queryKey ?? DEFAULT_TABLE_QUERY_KEY}
                boardSlug={session?.boardSlug ?? DEFAULT_BOARD_SLUG}
              />
            )}
          </ChapterWindow>
          {ownCaptions.map((cap) => renderCard(cap))}
        </div>
      </section>

      {/* ── Section 04: Explore your analytics — own bounded WQL track. ── */}
      <section id="tour-section-explore" data-testid="tour-section-explore" className="flex flex-col">
        <TaglineHeader
          index="04"
          before=""
          accentText="Explore"
          after=" your analytics"
          accent={TOUR_ACCENTS.rounds}
          blurb="Query what you just did in WQL. Roll up totals, graph volume over time, and build custom dashboards."
        />
        <div ref={exploreTrackRef} data-testid="tour-mobile-runway-track-explore" className="relative">
          <ChapterWindow
            id="explore"
            height={STAGE_WINDOW_HEIGHT}
            canvasRef={exploreCanvasRef}
            ringTarget={ringFor('explore')}
            accent={accentFor('explore')}
          >
            {reached.explore && (
              <TourSessionAnalytics
                activeStageId={stage?.id ?? 'wql-idea'}
                noteId={session?.noteId ?? null}
                queryKey={session?.queryKey ?? DEFAULT_TABLE_QUERY_KEY}
                boardSlug={session?.boardSlug ?? DEFAULT_BOARD_SLUG}
              />
            )}
          </ChapterWindow>
          {exploreCaptions.map((cap) => renderCard(cap))}
        </div>
      </section>

      {/* Syntax chapter picker — single slide with shared editor & dual buttons */}
      <TourChapterPicker wodFiles={wodFiles} theme={theme} onRun={onChapterRun} onShare={onChapterShare} />

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

/**
 * A chapter's bounded sticky stage window — pins under the app nav only
 * while its own chapter section is on screen, then scrolls out with it.
 * The pane inside mounts lazily (caller gates on `reached`) and stays alive.
 */
function ChapterWindow({
  id,
  height,
  canvasRef,
  innerRef,
  ringTarget,
  accent,
  children,
}: {
  id: ChapterTrackId
  height: string
  /** Ring measuring surface (plain ref, shared with the canvas div). */
  canvasRef: React.RefObject<HTMLDivElement | null>
  /** The canvas div's ref — the write window passes its ring-registering
      callback; other windows leave it off and reuse `canvasRef`. */
  innerRef?: React.Ref<HTMLDivElement>
  ringTarget: { key: RingTargetKey; tag?: string } | null
  accent: string
  children: React.ReactNode
}) {
  return (
    <div
      data-testid={`tour-mobile-runway-window-${id}`}
      className="sticky z-20 shrink-0 px-3 pt-2 pb-1"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height }}
    >
      <div
        ref={innerRef ?? canvasRef}
        className="relative h-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      >
        <div className="relative h-full">{children}</div>
        <TourRing target={ringTarget} accent={accent} canvasRef={canvasRef} />
      </div>
    </div>
  )
}
