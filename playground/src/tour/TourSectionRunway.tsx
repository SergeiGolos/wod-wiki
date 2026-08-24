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
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
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
import { TourAnalyticsShowcaseScreen } from './screens/TourAnalyticsShowcaseScreen'
import { TourMetricsScreen } from './screens/TourMetricsScreen'
import { TourCaptions, type TourCaption } from './TourCaptions'

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
  externalPause: boolean
  onClose: () => void
  onComplete: (blockId: string, results: WorkoutResults) => void
  onRuntimeReady: (runtime: IScriptRuntime) => void
  onReset: () => void
}

export interface TourSectionRunwayProps {
  /** Stable section slug — drives testids. */
  id: string
  /** Track height, e.g. '420vh'. */
  heightVh: string
  /** Static half-viewport header scrolled past before the sticky window. */
  header: ReactNode
  stages: ScrollStage[]
  /** Caption subset matching `stages` order. */
  captions: TourCaption[]
  /** True while the fullscreen playground owns the viewport — freezes the driver. */
  frozen: boolean
  /** Which non-timer presentation fills the window: WQL showcase or metrics explainer. */
  screenKind?: 'showcase' | 'metrics'
  /** Discrete active-stage notifications (quest marking, pause derivation). */
  onActiveStageChange?: (stageId: string) => void
  /** Persistent viewport signal (scroll-out pause derivation for the host). */
  onViewportChange?: (inView: boolean) => void
  /** Choose-your-own-adventure combobox (write section only). */
  onChoice?: (wod: string) => void
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
      stages,
      captions,
      frozen,
      screenKind = 'showcase',
      onActiveStageChange,
      onViewportChange,
      onChoice,
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

    const { slice, subscribe, resync } = useScrollRunway(runwayRef, frozen, stages)
    const inView = useInView(runwayRef)
    useEffect(() => {
      onViewportChange?.(inView)
    }, [inView, onViewportChange])

    const [everReached, setEverReached] = useState(false)
    const reachedOnce = useReachedOnce(runwayRef)
    useEffect(() => {
      if (reachedOnce) setEverReached(true)
    }, [reachedOnce])

    const activeScreen: TourScreen =
      (slice.stage.screen as TourScreen | undefined) ?? 'editor'

    // Lazy-mount heavy screens once their section first enters; keep alive.
    const showScreens = everReached

    // Notify once per stage change — never per render. Parent handlers are
    // inline closures; re-running on their identity would loop
    // setActiveStages -> render -> effect forever (max update depth).
    const lastNotifiedStageRef = useRef<string | null>(null)
    useEffect(() => {
      if (lastNotifiedStageRef.current === slice.stage.id) return
      lastNotifiedStageRef.current = slice.stage.id
      onActiveStageChange?.(slice.stage.id)
    }, [slice.stage.id, onActiveStageChange])

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

    return (
      <section data-testid={`tour-section-${id}`}>
        {header}
        <section ref={runwayRef} data-testid="tour-runway" className="relative" style={{ height: heightVh }}>
          <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
            {/* stage bar */}
            <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {frozen ? 'Playground mode' : slice.stage.label}
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

            {/* stage main */}
            <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 items-center justify-center gap-[clamp(24px,3.5vw,56px)] px-0 pb-0 lg:px-12 lg:pb-5">
              {/* canvas */}
              <div
                className={`relative min-w-0 shrink ${activeScreen === 'analytics' || activeScreen === 'metrics' ? 'h-[min(720px,calc(100vh-180px))] w-[min(1040px,calc(100vw-400px))]' : 'aspect-[1200/720] w-[min(920px,calc(100vw-440px))]'}`}
              >
                <div ref={canvasInnerRingRef} className="absolute inset-0 transition-[width,height] duration-300">
                  <MacOSChrome title={SCREEN_TITLES[activeScreen]} className="absolute inset-x-2 top-2 bottom-2">
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
                      {showScreens && timer && (
                        <Screen visible={activeScreen === 'timer'}>
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
                        </Screen>
                      )}
                      {/* Sections that carry an editor never host these panes;
                          mounting them hidden re-runs their fit measurement
                          against a zero-size box forever. */}
                      {showScreens && !timer && !editor && (
                        <Screen visible={activeScreen === 'analytics' || activeScreen === 'metrics'}>
                          {screenKind === 'metrics' ? (
                            <TourMetricsScreen activeStageId={slice.stage.id} />
                          ) : (
                            <TourAnalyticsShowcaseScreen activeStageId={slice.stage.id} />
                          )}
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
                      frozen || !slice.ring?.key
                        ? null
                        : { key: slice.ring.key as RingTargetKey, tag: slice.ring.tag }
                    }
                    accent={slice.stage.accent ?? TOUR_ACCENTS.editor}
                    canvasRef={canvasInnerRef}
                  />
                </div>
              </div>

              {/* captions */}
              <TourCaptions activeIndex={slice.index} captions={captions} onChoice={onChoice} />
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
    if (!el || typeof IntersectionObserver === 'undefined') {
      setReached(true)
      return
    }
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
