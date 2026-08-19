/**
 * HomeAnalyticsRunway.tsx — the analytics story as a scroll runway.
 *
 * The WQL-elements showcase (#938) broken into stages: a sticky pane whose
 * presentation cross-fades (vocabulary → table → graphs → dashboard) while
 * caption text scrolls beside it, and the tour ring glides a box highlight
 * onto the active presentation — the same focus contract as the editor
 * runway, minus the typewriter (the widgets are live queries, not scripts).
 *
 * Desktop mirrors the ```scroll runway layout (sticky pane + cross-fading
 * caption column over a tall track, driven by useScrollRunway); mobile
 * mirrors TourMobileRunway (pinned window + caption cards, card-visibility
 * driven through the same resolveScrollStage seam). Reduced motion keeps
 * the static HomeAnalyticsSection (TourMobileStack).
 */
import type { ScrollStage } from '../canvas/parseCanvasMarkdown'
import { resolveScrollStage } from '../canvas/scrollRunway'
import { useScrollRunway } from '../canvas/useScrollRunway'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { MOBILE_STICKY_TOP } from '../canvas/canvasUtils'
import { TourRing, useRingRef } from './TourRing'
import type { RingTargetKey } from './tourConstants'
import { TOUR_ACCENTS } from './tourConstants'
import {
  DashboardTile,
  GraphsTile,
  TableTile,
  VocabularyStrip,
  useHomeAnalyticsData,
} from './HomeAnalyticsSection'
import type { HomeAnalyticsData } from './homeAnalyticsData'

export interface AnalyticsRunwayStage extends ScrollStage {
  title: string
  body: string
}

/**
 * The five beats of the analytics story, decomposed from the static
 * showcase's header + strip + three tiles. Ranges are fractions of the
 * section's own scroll track (desktop) / card order (mobile maps the
 * active card to its range midpoint through resolveScrollStage).
 */
export const ANALYTICS_STAGES: AnalyticsRunwayStage[] = [
  {
    id: 'wql-idea',
    range: [0, 0.2],
    ring: { key: 'analytics.vocab', tag: 'WQL elements' },
    title: 'Query what you just did',
    body: 'Every result is one query away. WQL turns your journal into queryable facts — pick an aggregator and a metric, filter by tag, group by a dimension, roll up over time. The same elements drive every presentation below.',
  },
  {
    id: 'wql-table',
    range: [0.2, 0.4],
    ring: { key: 'analytics.table', tag: 'Table list' },
    title: 'Read it as a list',
    body: 'One aggregator, one metric, one dimension: sum total reps grouped by effort becomes a ranked table the moment the workout is logged. The chips above the widget are the parsed query — the vocabulary, front and center.',
  },
  {
    id: 'wql-graphs',
    range: [0.4, 0.6],
    ring: { key: 'analytics.graphs', tag: 'Graphs' },
    title: 'See it as trends',
    body: 'Roll the same facts up by week and they become a timeseries — is tonnage rising, is training polarized? A graph is not a feature you enable; it is a rollup away.',
  },
  {
    id: 'wql-dashboard',
    range: [0.6, 0.8],
    ring: { key: 'analytics.dashboard', tag: 'Dashboard' },
    title: 'Compose a dashboard',
    body: 'A dashboard is just N queries on one screen. Mix values, lists, and graphs — each tile its own WQL statement, exactly like the DashboardView you get in the app.',
  },
  {
    id: 'wql-live',
    range: [0.8, 1],
    title: "It's your data",
    body: 'Every widget here executes against your live journal — these are the sample answers until you have logged work of your own. Open the Dashboards tab to query anything, your way.',
  },
]

export interface HomeAnalyticsRunwayProps {
  /**
   * Pre-resolved widget data (Storybook / tests). Omit to execute the
   * queries against the live store with the sample fallback.
   */
  data?: HomeAnalyticsData
  /** Fired once when the runway scrolls into view (quest completion). */
  onEnterView?: () => void
  /** External anchor for the host's quest-click scrollIntoView. */
  sectionRef?: Ref<HTMLElement>
  /** Presentation branch — the host knows its form factor (no runtime
   * detection: one mount point per factor, and jsdom has no matchMedia). */
  variant?: 'desktop' | 'mobile'
  className?: string
}

/**
 * Cross-fading presentation inside the pane, scaled to fit: the content's
 * natural size (offsetWidth/Height — unaffected by the transform) is
 * measured against the pane and scaled down when it would overflow. The
 * ring registers the content element, whose rect is post-scale, so the
 * highlight tracks the visual box at every size.
 */
function Pane({
  visible,
  ringKey,
  children,
}: {
  visible: boolean
  ringKey: RingTargetKey
  children: ReactNode
}) {
  const ringRef = useRingRef(ringKey)
  const outerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  // Stable identity: an inline arrow detaches/reattaches every render and
  // each attach bumps the registry version → re-render loop.
  const contentRingRef = useCallback(
    (el: HTMLDivElement | null) => {
      contentRef.current = el
      ringRef(el)
    },
    [ringRef],
  )
  const [fit, setFit] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const content = contentRef.current
    if (!outer || !content) return
    const measure = () => {
      const ch = content.offsetHeight
      const cw = content.offsetWidth
      if (!ch || !cw) return
      // A little horizontal bleed keeps wide tiles from over-shrinking.
      const next = Math.min(1, outer.clientHeight / ch, (outer.clientWidth + 64) / cw)
      setFit((prev) => (Math.abs(prev - next) > 0.01 ? next : prev))
    }
    measure()
    const t = window.setTimeout(measure, 120)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(outer)
    ro?.observe(content)
    return () => {
      window.clearTimeout(t)
      ro?.disconnect()
    }
  }, [children])

  return (
    <div
      ref={outerRef}
      className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={contentRingRef}
        className="w-full max-w-[640px]"
        style={fit < 1 ? { transform: `scale(${fit})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

export function HomeAnalyticsRunway({ data, onEnterView, sectionRef, variant = 'desktop', className }: HomeAnalyticsRunwayProps) {
  const { data: liveData } = useHomeAnalyticsData()
  const d = data ?? liveData

  const localSectionRef = useRef<HTMLElement | null>(null)
  // Stable combined ref: re-renders must not re-trigger the observer, and
  // the host's ref (quest-click scrollIntoView) must stay in sync.
  const setSection = useCallback(
    (el: HTMLElement | null) => {
      localSectionRef.current = el
      if (typeof sectionRef === 'function') sectionRef(el)
      else if (sectionRef) (sectionRef as { current: HTMLElement | null }).current = el
    },
    [sectionRef],
  )
  // Stable callback ref (re-renders must not re-trigger the observer).
  const enterViewRef = useRef(onEnterView)
  enterViewRef.current = onEnterView

  // Quest completion: fires once when the section enters the viewport,
  // any form factor (moved here from HomeTour's wrapper IO so the mobile
  // branch fires it too).
  useEffect(() => {
    const el = localSectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          enterViewRef.current?.()
          io.disconnect()
        }
      },
      { rootMargin: '-30% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (variant === 'mobile') return <HomeAnalyticsRunwayMobile ref={setSection} data={d} className={className} />
  return <HomeAnalyticsRunwayDesktop ref={setSection} data={d} className={className} />
}

function HomeAnalyticsRunwayDesktop({
  ref: sectionRef,
  data,
  className,
}: {
  ref: Ref<HTMLElement>
  data: HomeAnalyticsData
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const paneRef = useRef<HTMLDivElement | null>(null)
  const { slice } = useScrollRunway(trackRef, false, ANALYTICS_STAGES)
  const index = slice.index

  return (
    <section
      ref={sectionRef}
      data-testid="home-analytics-section"
      className={className}
    >
      <div ref={trackRef} className="relative" style={{ height: '500vh' }}>
        <div className="sticky top-[104px] mx-auto flex h-[calc(100vh-104px)] w-full max-w-[1500px] items-center gap-[clamp(24px,3.5vw,56px)] px-6 pb-5 lg:px-12">
          {/* presentation pane */}
          <div
            ref={paneRef}
            className="relative h-full min-w-0 flex-1"
          >
            <Pane visible={index === 0} ringKey="analytics.vocab">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Own the analytics
                  </span>
                  <p className="text-sm text-muted-foreground">
                    aggregator · metric · filter · dimension · rollup — the whole
                    language fits on one strip.
                  </p>
                </div>
                <VocabularyStrip />
              </div>
            </Pane>
            <Pane visible={index === 1} ringKey="analytics.table">
              <TableTile data={data} />
            </Pane>
            <Pane visible={index === 2} ringKey="analytics.graphs">
              <GraphsTile data={data} />
            </Pane>
            <Pane visible={index >= 3} ringKey="analytics.dashboard">
              <DashboardTile data={data} />
            </Pane>
            <TourRing
              target={
                slice.ring
                  ? { key: slice.ring.key as RingTargetKey, tag: slice.ring.tag }
                  : null
              }
              accent={TOUR_ACCENTS.analytics}
              canvasRef={paneRef}
            />
          </div>

          {/* caption column */}
          <div className="flex w-[360px] flex-none flex-col gap-6 max-lg:hidden">
            {ANALYTICS_STAGES.map((stage, i) => (
              <article
                key={stage.id}
                aria-hidden={i !== index}
                className={`flex flex-col gap-2 transition-all duration-500 ${
                  i === index ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-35'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(i + 1).padStart(2, '0')} / {String(ANALYTICS_STAGES.length).padStart(2, '0')}
                  </span>
                  {i < index && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary">done</span>
                  )}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{stage.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HomeAnalyticsRunwayMobile({
  ref: sectionRef,
  data,
  className,
}: {
  ref: Ref<HTMLElement>
  data: HomeAnalyticsData
  className?: string
}) {
  const paneRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  // Card-visibility driver — the same reading-zone contract as the ```scroll
  // mobile runway: the card with the largest intersection wins.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const ratios = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.cardIndex)
          ratios.set(i, e.intersectionRatio)
        }
        let best = -1
        let bestRatio = 0
        ratios.forEach((r, i) => {
          if (r > bestRatio) {
            bestRatio = r
            best = i
          }
        })
        if (best >= 0) setActiveIndex(best)
      },
      { rootMargin: '-52% 0px -18% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // One seam: the card index maps to its stage's range midpoint, then
  // through the same resolver the desktop scroll driver uses.
  const slice = useMemo(() => {
    const stage = ANALYTICS_STAGES[activeIndex] ?? ANALYTICS_STAGES[0]
    const mid = (stage.range[0] + stage.range[1]) / 2
    return resolveScrollStage(mid, ANALYTICS_STAGES)
  }, [activeIndex])
  const index = slice.index

  return (
    <section
      ref={sectionRef}
      data-testid="home-analytics-section"
      className={className}
    >
      {/* Pinned presentation window — sticks under the nav, releases after
          the last caption card. */}
      <div className="relative">
        <div
          className="sticky z-20 px-4 pt-2 pb-1"
          style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
        >
          <div ref={paneRef} className="relative h-full">
            <Pane visible={index === 0} ringKey="analytics.vocab">
              <VocabularyStrip />
            </Pane>
            <Pane visible={index === 1} ringKey="analytics.table">
              <TableTile data={data} />
            </Pane>
            <Pane visible={index === 2} ringKey="analytics.graphs">
              <GraphsTile data={data} />
            </Pane>
            <Pane visible={index >= 3} ringKey="analytics.dashboard">
              <DashboardTile data={data} />
            </Pane>
            <TourRing
              target={
                slice.ring
                  ? { key: slice.ring.key as RingTargetKey, tag: slice.ring.tag }
                  : null
              }
              accent={TOUR_ACCENTS.analytics}
              canvasRef={paneRef}
            />
          </div>
        </div>

        {/* Caption cards — the scroll track. */}
        <div className="relative z-10 px-4 pb-[16vh]">
          {ANALYTICS_STAGES.map((stage, i) => (
            <div
              key={stage.id}
              data-card-index={i}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className="mx-auto flex min-h-[46vh] max-w-[520px] flex-col justify-center gap-2 py-8"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, '0')} / {String(ANALYTICS_STAGES.length).padStart(2, '0')}
                </span>
                <span
                  className="h-1 w-6 rounded-full transition-colors duration-300"
                  style={{ background: i === index ? TOUR_ACCENTS.analytics : 'hsl(var(--foreground) / 0.15)' }}
                />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">{stage.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
