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
 * (IntersectionObserver over the description zone: the 40% band under a
 * stacked window; in split mode captions render in the window's side pane
 * and the cards below act purely as the scroll driver).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import { TOUR_DEMO_SHARE, useTourContextSize } from './tourContextSize'
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
import { TourSessionResult } from './screens/TourSessionResult'
import type { TourSectionTimerWiring, TourSectionSessionWiring } from './TourSectionRunway'
import { TOUR_CAPTIONS, CaptionBody, type TourCaption } from './TourCaptions'
import { TourChapterPicker } from './TourChapterPicker'
import { TourLearnSection } from './TourLearnSection'
import { RingElementRegistrar, RingTargetsProvider, TourRing } from './TourRing'

/** Sticky demo window under the app nav: the full context when split (the
    caption pane lives inside it), the 60% share when stacked. */
const demoWindowHeight = (split: boolean) =>
  split
    ? `calc(100dvh - ${MOBILE_STICKY_TOP}px)`
    : `calc((100dvh - ${MOBILE_STICKY_TOP}px) * ${TOUR_DEMO_SHARE})`
/** Description zone slot under a stacked window: the 40% remainder. */
const cardZoneHeight = `calc((100dvh - ${MOBILE_STICKY_TOP}px) * ${1 - TOUR_DEMO_SHARE})`

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
  /** Chapter example run through the normal fullscreen note runner. */
  onChapterRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  /** The single shared editor document (hero + write window display it). */
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onHeroRun?: () => void
  /** Shared-script attribution + reset, forwarded to the hero editor. */
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
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onHeroRun,
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
  // target (registered inside its ChapterWindow's own RingTargetsProvider);
  // the other windows measure their own canvas without registering.
  const writeCanvasRef = useRef<HTMLDivElement | null>(null)
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
  // Measured context (window below the app nav, re-measured on resize).
  // Orients the 60/40 windows and the matching card reading zone.
  const context = useTourContextSize(MOBILE_STICKY_TOP)
  const split = context.mode === 'split'
  // Description zone in viewport space. Stacked: the 40% band under the demo
  // window, where the caption cards scroll. Split: captions render in the
  // window's side pane, so the cards below are pure scroll driver and
  // trigger from an approach band just past the fold.
  const zoneTop = split
    ? MOBILE_STICKY_TOP + context.height
    : Math.round(MOBILE_STICKY_TOP + context.height * TOUR_DEMO_SHARE)
  const zoneBand = split
    ? Math.round(context.height * (1 - TOUR_DEMO_SHARE))
    : Math.max(0, MOBILE_STICKY_TOP + context.height - zoneTop)

  const resolveVisibleStage = useCallback(() => {
    const anchor = zoneTop + Math.round(zoneBand / 2)
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
  }, [zoneTop, zoneBand])

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
      // Stacked: the zone is the viewport band under the demo window.
      // Split: cards approach from below the fold, so the root extends
      // downward by the band height instead.
      { rootMargin: `-${zoneTop}px 0px ${split ? zoneBand : 0}px 0px` },
    )
    for (const el of cards) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [zoneTop, zoneBand, split, resolveVisibleStage])

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
  const exploreCaptions = TOUR_CAPTIONS.filter((c) => c.id.startsWith('wql-')).map((cap, index) => ({ ...cap, num: `04${String.fromCharCode(97 + index)}` }))
  const chapterCaptions: Record<ChapterTrackId, TourCaption[]> = {
    write: writeCaptions,
    run: runCaptions,
    own: ownCaptions,
    explore: exploreCaptions,
  }
  /** Split-window side pane: the live stage's caption while this chapter
      hosts the stage, else the chapter's opening caption. */
  const captionFor = (id: ChapterTrackId): TourCaption => {
    const active = stage ? chapterCaptions[id].find((c) => c.id === stage.id) : undefined
    return stage && active && stage.screen === CHAPTER_SCREENS[id] ? active : chapterCaptions[id][0]
  }

  const renderCard = (cap: TourCaption) => {
    const globalIdx = TOUR_CAPTIONS.findIndex((c) => c.id === cap.id)
    const slot = {
      key: cap.id,
      ref: (el: HTMLDivElement | null) => {
        if (globalIdx >= 0) cardRefs.current[globalIdx] = el
      },
      style: {
        minHeight: cardZoneHeight,
        // scrollIntoView lands a card's top just inside the zone (stack) or
        // peeking above the fold (split).
        scrollMarginTop: Math.max(MOBILE_STICKY_TOP, zoneTop - 24),
      },
    }
    if (split) {
      // Wide context: the description renders in the pinned window's side
      // pane; these slots remain only as the scroll/stage driver.
      return (
        <div
          {...slot}
          data-testid={`tour-mobile-card-${cap.id}`}
          className="px-6"
          aria-hidden="true"
        />
      )
    }
    return (
      <div
        {...slot}
        data-testid={`tour-mobile-card-${cap.id}`}
        className="flex items-center justify-center px-6 py-8"
      >
        <article
          className="w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6"
          style={{ maxHeight: `calc(${cardZoneHeight} - 4rem)` }}
        >
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
      <div
        ref={heroRef}
        id="tour-hero"
        data-testid="tour-hero"
        className="relative grid gap-6 px-4 pt-8 pb-10"
        style={{ height: `calc(100dvh - ${MOBILE_STICKY_TOP}px)`, gridTemplateRows: '2fr 3fr' }}
      >
        {/* Heading rides the 2fr row (scrolling when a short landscape
            context squeezes it); the demo owns the 3fr row — the same
            bounded usable-viewport grid as the desktop hero. */}
        <div className="min-h-0 overflow-y-auto">
          <TourHeroHeading />
        </div>
        {/* Flat native card — no decorative chrome on mobile. This is the
            first display of the shared document; the write section's sticky
            pane below is the second display of the same controlled doc. */}
        <div className="min-h-0 w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <TourEditorScreen
            doc={doc}
            onDocChange={onDocChange}
            onBlocksChange={onBlocksChange}
            onRun={onHeroRun ?? onRun}
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
            height={demoWindowHeight(split)}
            description={
              split ? <CaptionBody cap={captionFor('write')} onChoice={onChoice} onCommand={onCommand} /> : null
            }
            canvasRef={writeCanvasRef}
            windowRingKey="editor.window"
            ringTarget={ringFor('write')}
            accent={accentFor('write')}
          >
            {reached.write && (
              <TourEditorScreen
                doc={doc}
                onDocChange={onDocChange}
                onBlocksChange={onBlocksChange}
                onRun={onRun}
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
            height={demoWindowHeight(split)}
            description={
              split ? <CaptionBody cap={captionFor('run')} onChoice={onChoice} onCommand={onCommand} /> : null
            }
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
                onStart={timer.onStart}
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
            height={demoWindowHeight(split)}
            description={
              split ? <CaptionBody cap={captionFor('own')} onChoice={onChoice} onCommand={onCommand} /> : null
            }
            canvasRef={ownCanvasRef}
            ringTarget={ringFor('own')}
            accent={accentFor('own')}
          >
            {reached.own && (
              session?.result ? (
                <TourSessionResult result={session.result} />
              ) : (
                <TourSessionAnalytics
                  activeStageId="wql-table"
                  noteId={session?.noteId ?? null}
                  queryKey={session?.queryKey ?? DEFAULT_TABLE_QUERY_KEY}
                  boardSlug={session?.boardSlug ?? DEFAULT_BOARD_SLUG}
                />
              )
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
            height={demoWindowHeight(split)}
            description={
              split ? <CaptionBody cap={captionFor('explore')} onChoice={onChoice} onCommand={onCommand} /> : null
            }
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

      {/* Syntax chapter picker — single slide with shared editor */}
      <TourChapterPicker wodFiles={wodFiles} theme={theme} onRun={onChapterRun} />

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
 * In split (wide-context) mode the window is a 60/40 row: demo beside a
 * caption pane, and `height` covers the full context; stacked, the window
 * is demo-only at the 60% share and the caption cards scroll below it.
 */
function ChapterWindow({
  id,
  height,
  description,
  canvasRef,
  windowRingKey,
  ringTarget,
  accent,
  children,
}: {
  id: ChapterTrackId
  height: string
  /** Present only in split mode: the 40% caption pane beside the demo. */
  description?: React.ReactNode
  /** Ring measuring surface (plain ref, shared with the canvas div). */
  canvasRef: React.RefObject<HTMLDivElement | null>
  /** Ring key under which the canvas div itself is registered — only the
      write window registers ('editor.window'), inside its own
      RingTargetsProvider (a useRingRef here would reach the outer
      provider). */
  windowRingKey?: RingTargetKey
  ringTarget: { key: RingTargetKey; tag?: string } | null
  accent: string
  children: React.ReactNode
}) {
  const [innerEl, setInnerEl] = useState<HTMLDivElement | null>(null)
  const setDivRef = useCallback(
    (el: HTMLDivElement | null) => {
      setInnerEl(el)
      canvasRef.current = el
    },
    [canvasRef],
  )
  return (
    <div
      data-testid={`tour-mobile-runway-window-${id}`}
      className="sticky z-20 shrink-0 px-3 pt-2 pb-1"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height }}
    >
      <div
        ref={setDivRef}
        className="relative h-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      >
        {/* Private ring registry per window — several chapter windows mount
            concurrently and would otherwise overwrite each other's
            'editor.window' registration under a shared provider. */}
        <RingTargetsProvider>
          {windowRingKey && <RingElementRegistrar ringKey={windowRingKey} el={innerEl} />}
          {description ? (
            <div className="flex h-full gap-3 p-2">
              <div className="relative h-full min-h-0 min-w-0 flex-[3_1_0%]">{children}</div>
              <div className="min-h-0 min-w-0 flex-[2_1_0%] overflow-y-auto p-2">{description}</div>
            </div>
          ) : (
            <div className="relative h-full">{children}</div>
          )}
          <TourRing target={ringTarget} accent={accent} canvasRef={canvasRef} />
        </RingTargetsProvider>
      </div>
    </div>
  )
}
