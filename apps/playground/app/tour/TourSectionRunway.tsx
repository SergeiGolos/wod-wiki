/**
 * TourSectionRunway.tsx — one tagged section of the redesigned home page:
 * a static half-viewport tagline header followed by its own sticky demo
 * runway (own scroll driver, pips, captions column, ring).
 *
 * The old single 1300vh runway was split into four of these — Write it in
 * Markdown / Run it as a Timer / Own the Metrics / Explore your analytics —
 * so each tagline level gets a real scroll-past header and a focused stage
 * group. Heavy screens mount lazily on first section entry and stay alive
 * after, matching the old single-driver `entered` contract; the write
 * section's editor stays mounted from load exactly as before.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import type { ScriptBlock, Sessions } from '@/components/Editor/types'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'
import type { ScrollStage } from '../canvas/parseCanvasMarkdown'
import { useScrollRunway, scrollRunwayTo } from '../canvas/useScrollRunway'
import type { ScrollSlice } from '../canvas/scrollRunway'
import {
  SCREEN_TITLES,
  TOUR_ACCENTS,
  type TourScreen,
  type RingTargetKey,
} from './tourConstants'
import { TourRing, useRingRef } from './TourRing'
import { TourTvCard } from './TourTvCard'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { TourTimerScreen } from './screens/TourTimerScreen'
import { TourSessionAnalytics } from './screens/TourSessionAnalytics'
import { TourCaptions, CaptionBody, type TourCaption } from './TourCaptions'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface TourSectionEditorWiring {
  doc: string
  theme: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
}

export interface TourSectionTimerWiring {
  sessionKey: number
  block: ScriptBlock | null
  autoStart: boolean
  /** Host-driven finalize stop (metrics arrival / reset chaining). */
  externalStop?: boolean
  onClose: () => void
  onComplete: (blockId: string, results: Sessions) => void
  onRuntimeReady: (runtime: IScriptRuntime) => void
  /** First idle→running transition of the current pane's execution. */
  onRunStarted?: () => void
  onReset: () => void
}

/** Session WQL/dashboard wiring for a section's stage pane (TourSessionAnalytics). */
export interface TourSectionSessionWiring {
  noteId: string | null
  queryKey: string
  boardSlug: string
  /** Pin the pane to one stage (e.g. the metrics section's live table). */
  fixedStage?: string
}

export interface TourSectionRunwayProps {
  /** Stable section slug — drives testids. */
  id: string
  /** Track height, e.g. '420vh'. */
  heightVh: string
  /** Static half-viewport header scrolled past before the sticky window. */
  header?: ReactNode
  /** Lead block rendered atop the caption rail (the write section's hero). */
  railLead?: ReactNode
  stages: ScrollStage[]
  /** Caption subset matching `stages` order. */
  captions: TourCaption[]
  /** Discrete active-stage notifications (quest marking, pause derivation). */
  onActiveStageChange?: (stageId: string) => void
  /** Persistent viewport signal (scroll-out pause derivation for the host). */
  onViewportChange?: (inView: boolean) => void
  /** Choose-your-own-adventure combobox (write section only). */
  onChoice?: (wod: string) => void
  /** Caption command buttons (Try it / query presets / board picks). */
  onCommand?: (captionId: string, key: string) => void
  /** Session WQL/dashboard pane (explore section). Omitted → static showcase. */
  session?: TourSectionSessionWiring
  editor?: TourSectionEditorWiring
  timer?: TourSectionTimerWiring
  /** Ambient runtime feeding the cast TV card (run section). */
  tvRuntime?: IScriptRuntime | null
  /**
   * Stage whose local progress raises the TV card (run section: timer-cast).
   * Omitted → no TV card.
   */
  tvStageId?: string
  /** Toast label shown during the section's final beat (explore section). */
  toastLabel?: string | null
}

export interface TourSectionRunwayApi {
  /** Smooth-scroll the section track onto a stage's early span. */
  scrollToStage: (stageId: string) => void
  /** Per-frame scrub subscription for host-driven effects (typewriter reset). */
  subscribe: (cb: (slice: ScrollSlice, progress: number) => void) => () => void
  /** Force a re-sync from the current scroll position (playground exit). */
  resync: () => void
}

/** Cross-fade wrapper for a screen inside the section window. */
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

export const TourSectionRunway = forwardRef<TourSectionRunwayApi, TourSectionRunwayProps>(
  function TourSectionRunway(
    {
      id,
      heightVh,
      header,
      railLead,
      stages,
      captions,
      onActiveStageChange,
      onViewportChange,
      onChoice,
      onCommand,
      session,
      editor,
      timer,
      tvRuntime,
      tvStageId,
      toastLabel,
    },
    ref,
  ) {
    const runwayRef = useRef<HTMLElement | null>(null)
    const canvasInnerRef = useRef<HTMLDivElement | null>(null)
    // The whole section window (outside the chrome) is the 'editor.window'
    // ring target — mirrors the old single-runway framing.
    const editorWindowRef = useRingRef('editor.window')
    const canvasInnerRingRef = useCallback(
      (el: HTMLDivElement | null) => {
        canvasInnerRef.current = el
        editorWindowRef(el)
      },
      [editorWindowRef],
    )
    const tvCardRef = useRef<HTMLDivElement | null>(null)
    const toastRef = useRef<HTMLDivElement | null>(null)

    const { slice, subscribe, resync, runwayReached } = useScrollRunway(runwayRef, false, stages)
    const inView = useInView(runwayRef)
    useEffect(() => {
      onViewportChange?.(inView)
    }, [inView, onViewportChange])

    // ── Native caption flow (railLead branch): the active caption comes from
    // actual DOM reading zones, not scroll progress — the natural column is
    // taller than the track fraction. Index 0 while the hero lead is read. ──
    const captionSlotRefs = useRef<Array<HTMLElement | null>>([])
    const [nativeActive, setNativeActive] = useState(0)
    useEffect(() => {
      if (!railLead || typeof IntersectionObserver === 'undefined') return
      const slots = captionSlotRefs.current.filter(Boolean) as HTMLElement[]
      if (slots.length === 0) return
      const zoneTop = Math.round(window.innerHeight * 0.4)
      let best = -1
      let bestDist = Infinity
      const measure = () => {
        best = -1
        bestDist = Infinity
        const anchor = zoneTop + 12
        slots.forEach((el, i) => {
          const dist = Math.abs(el.getBoundingClientRect().top - anchor)
          if (dist < bestDist) {
            bestDist = dist
            best = i
          }
        })
        if (best >= 0) setNativeActive(best)
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) { measure(); break }
        },
        { rootMargin: `-${zoneTop}px 0px -30% 0px` },
      )
      slots.forEach((el) => observer.observe(el))
      window.addEventListener('scroll', measure, { passive: true })
      measure()
      return () => {
        observer.disconnect()
        window.removeEventListener('scroll', measure)
      }
    }, [railLead])

    const [everReached, setEverReached] = useState(false)
    const reachedOnce = useReachedOnce(runwayRef)
    useEffect(() => {
      if (reachedOnce || runwayReached) setEverReached(true)
    }, [reachedOnce, runwayReached])

    const activeScreen: TourScreen =
      (slice.stage?.screen as TourScreen | undefined) ?? 'editor'
    // Heavy panes mount once their section first enters; keep alive. The
    // runtime-carrying timer pane additionally mounts only after its stage
    // was ACTIVELY visited — skipping straight past the run stages (e.g.
    // jump-to-metrics) never creates a runtime.
    const [timerEngaged, setTimerEngaged] = useState(false)
    useEffect(() => {
      if (activeScreen === 'timer') setTimerEngaged(true)
    }, [activeScreen])
    const showScreens = everReached

    // Notify once per stage change — never per render. Parent handlers are
    // inline closures; re-running on their identity would loop
    // setActiveStages -> render -> effect forever (max update depth).
    const lastNotifiedStageRef = useRef<string | null>(null)
    useEffect(() => {
      if (!everReached) return
      if (lastNotifiedStageRef.current === slice.stage?.id) return
      lastNotifiedStageRef.current = slice.stage?.id ?? null
      if (slice.stage?.id) onActiveStageChange?.(slice.stage.id)
    }, [slice.stage?.id, onActiveStageChange, everReached])

    // Imperative scrub: TV parallax + stop toast — transform/opacity only.
    useEffect(() => {
      return subscribe((s: ScrollSlice) => {
        const tv = tvCardRef.current
        if (tv) {
          if (tvStageId && s.stage.id === tvStageId) {
            const k = clamp01((s.t - 0.2) / 0.5)
            const e = 1 - Math.pow(1 - k, 2)
            tv.style.opacity = String(k)
            tv.style.transform = `translateY(${lerp(90, 0, e)}px)`
          } else {
            tv.style.opacity = '0'
          }
        }

        const toast = toastRef.current
        if (toast) {
          if (toastLabel != null && s.index === stages.length - 1) {
            const tIn = clamp01((s.t - 0.04) / 0.2)
            const tOut = clamp01((s.t - 0.7) / 0.2)
            toast.style.opacity = String(Math.max(0, tIn - tOut))
            toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
          } else {
            toast.style.opacity = '0'
          }
        }
      })
    }, [subscribe, tvStageId, toastLabel, stages.length])

    useImperativeHandle(
      ref,
      () => ({
        scrollToStage: (stageId: string) => {
          const el = runwayRef.current
          const stage = stages.find((s) => s.id === stageId)
          if (!el || !stage) return
          scrollRunwayTo(el, Math.min(stage.range[0] + 0.02, stage.range[1] - 0.005))
        },
        subscribe,
        resync,
      }),
      [stages, subscribe, resync],
    )

    // ── Native hero flow (write section): the hero lead and captions are a
    // NORMAL-FLOW column beside the sticky editor — the hero scrolls out
    // naturally and captions push in; the rail never stays pinned. ──
    if (railLead) {
      const nativeIdx = Math.min(nativeActive, Math.max(0, stages.length - 1))
      const nativeStage = stages[nativeIdx] ?? stages[0]
      return (
        <section id={`tour-section-${id}`} data-testid={`tour-section-${id}`}>
          <section ref={runwayRef} data-testid="tour-runway" className="relative" style={{ height: heightVh }}>
            <div className="grid w-full grid-cols-[minmax(0,1fr)_clamp(320px,24vw,400px)] items-start gap-[clamp(20px,2.5vw,44px)] px-5 pt-6 pb-10 lg:px-10">
              {/* sticky editor pane — the one runtime-capable surface */}
              <div className="sticky top-[104px] flex h-[calc(100vh-104px)] min-w-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between px-2 pt-4 pb-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {nativeStage?.label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {stages.map((seg, i) => (
                      <span
                        key={seg.id}
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          width: nativeIdx === i ? 30 : 10,
                          background:
                            nativeIdx === i
                              ? (seg.accent ?? TOUR_ACCENTS.editor)
                              : nativeIdx > i
                                ? 'hsl(var(--foreground))'
                                : 'hsl(var(--foreground) / 0.15)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="relative min-h-0 w-full flex-1">
                  <div ref={canvasInnerRingRef} className="absolute inset-0">
                    <MacOSChrome title={SCREEN_TITLES[activeScreen]} className="absolute inset-0">
                      <div className="relative h-full">
                        {editor && (
                          <Screen visible={nativeStage?.screen !== 'timer'}>
                            <TourEditorScreen
                              doc={editor.doc}
                              onDocChange={editor.onDocChange}
                              onBlocksChange={editor.onBlocksChange}
                              onRun={editor.onRun}
                              onShare={editor.onShare}
                              theme={editor.theme}
                              withRingTargets
                            />
                          </Screen>
                        )}
                      </div>
                    </MacOSChrome>
                    <TourRing
                      target={
                        !nativeStage?.ring || nativeStage.ring === true || !nativeStage.ring.key
                          ? null
                          : { key: nativeStage.ring.key as RingTargetKey, tag: nativeStage.ring.tag }
                      }
                      accent={nativeStage?.accent ?? TOUR_ACCENTS.editor}
                      canvasRef={canvasInnerRef}
                    />
                  </div>
                </div>
              </div>

              {/* normal-flow rail: hero lead scrolls out, captions push in */}
              <div className="flex flex-col">
                {railLead}
                <div className="mt-[40vh] flex flex-col pb-[15vh]">
                  {captions.map((cap, i) => (
                    <div
                      key={cap.id}
                      ref={(el) => { captionSlotRefs.current[i] = el }}
                      data-active={nativeIdx === i}
                      className="flex min-h-[65vh] items-center"
                    >
                      <article
                        className="w-full rounded-2xl border bg-card p-6 transition-shadow"
                        style={{
                          borderColor: nativeIdx === i ? cap.accent : 'hsl(var(--border))',
                          boxShadow: nativeIdx === i ? '0 8px 30px hsl(var(--foreground) / 0.08)' : 'none',
                        }}
                      >
                        <CaptionBody cap={cap} onChoice={onChoice} onCommand={onCommand} />
                      </article>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </section>
      )
    }

    return (
      <section id={`tour-section-${id}`} data-testid={`tour-section-${id}`}>
        {header}
        <section ref={runwayRef} data-testid="tour-runway" className="relative" style={{ height: heightVh }}>
          <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
            {/* stage bar */}
            <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {slice.stage.label}
              </div>
              <div className="flex items-center gap-1.5">
                {stages.map((seg, i) => {
                  const live = slice.index === i
                  const done = slice.index > i
                  return (
                    <span
                      key={seg.id}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: live ? 30 : 10,
                        background: live
                          ? (seg.accent ?? TOUR_ACCENTS.editor)
                          : done
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--foreground) / 0.15)',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* stage main — the pane fills the sticky viewport; the caption
                rail stays a readable 320–400px column. Content smaller than
                the pane centers inside it (screens own their fit). */}
            <div className="flex min-h-0 w-full flex-1 items-stretch gap-[clamp(20px,2.5vw,44px)] px-5 pb-5 lg:px-10">
              {/* stage pane */}
              <div className="relative h-full min-w-0 flex-1">
                <div ref={canvasInnerRingRef} className="absolute inset-0">
                  <MacOSChrome title={SCREEN_TITLES[activeScreen]} className="absolute inset-0">
                    <div className="relative h-full">
                      {editor && (
                        <Screen visible={activeScreen === 'editor'}>
                          <TourEditorScreen
                            doc={editor.doc}
                            onDocChange={editor.onDocChange}
                            onBlocksChange={editor.onBlocksChange}
                            onRun={editor.onRun}
                            onShare={editor.onShare}
                            theme={editor.theme}
                            withRingTargets
                          />
                        </Screen>
                      )}
                      {showScreens && timer && timerEngaged && (
                        <Screen visible={activeScreen === 'timer'}>
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
                        </Screen>
                      )}
                      {/* Sections that carry an editor never host these panes;
                          mounting them hidden re-runs their fit measurement
                          against a zero-size box forever. */}
                      {showScreens && !timer && !editor && session && (
                        <Screen visible={activeScreen === 'analytics' || activeScreen === 'metrics'}>
                          <TourSessionAnalytics
                            activeStageId={session.fixedStage ?? slice.stage.id}
                            noteId={session.noteId}
                            queryKey={session.queryKey}
                            boardSlug={session.boardSlug}
                          />
                        </Screen>
                      )}
                      {toastLabel != null && (
                        <div
                          ref={toastRef}
                          className="pointer-events-none absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full border border-[hsl(var(--metric-rounds)/0.55)] bg-card px-5 py-2.5 font-mono text-[10.5px] tracking-[0.04em] opacity-0 shadow-xl"
                        >
                          <span className="size-[9px] rounded-sm bg-[hsl(var(--metric-rounds))]" />
                          {toastLabel}
                        </div>
                      )}
                    </div>
                  </MacOSChrome>

                  {tvStageId && <TourTvCard ref={tvCardRef} runtime={tvRuntime ?? null} />}

                  <TourRing
                    target={
                      !slice.ring?.key
                        ? null
                        : { key: slice.ring.key as RingTargetKey, tag: slice.ring.tag }
                    }
                    accent={slice.stage.accent ?? TOUR_ACCENTS.editor}
                    canvasRef={canvasInnerRef}
                  />
                </div>
              </div>

              {/* caption rail — hero lead (write section) then captions */}
              <div className="flex w-[clamp(320px,24vw,400px)] flex-none min-h-[280px] flex-col">
                {railLead}
                <div className="relative min-h-[280px] flex-1">
                  <TourCaptions
                    activeIndex={slice.index}
                    captions={captions}
                    onChoice={onChoice}
                    onCommand={onCommand}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    )
  },
)

/**
 * One-shot section-entry observer: true after any part of the sticky track
 * first scrolls into view; never resets. Drives lazy screen mounting.
 * Without IntersectionObserver (jsdom) it reports entered immediately.
 */
function useReachedOnce(runwayRef: React.RefObject<HTMLElement | null>): boolean {
  const [reached, setReached] = useState(false)
  useEffect(() => {
    const el = runwayRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReached(true)
          observer.disconnect()
        }
      },
      { threshold: 0.05 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [runwayRef])
  return reached
}

/**
 * Persistent viewport signal for the sticky track. Without IntersectionObserver
 * (jsdom, ancient browsers) the section reports in-view — the pause contract
 * degrades to "never externally paused" rather than freezing mid-demo.
 */
function useInView(runwayRef: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = runwayRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [runwayRef])
  return inView
}
