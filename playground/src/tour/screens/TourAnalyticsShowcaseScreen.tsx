/**
 * TourAnalyticsShowcaseScreen.tsx — the WQL-elements showcase (#938) as the
 * analytics screen of the shared tour window.
 *
 * The five wql-* beats of the canonical home runway (editor → timer →
 * analytics) drive four cross-fading presentations (vocabulary → table →
 * graphs → dashboard) inside the same MacOS window the editor and timer
 * use. Each pane registers its own ring target and scales to fit the
 * window (the Pane fit contract moved here from the retired
 * HomeAnalyticsRunway, which owned a separate scroll track).
 *
 * Data is self-contained: useHomeAnalyticsData executes the showcase
 * queries against the live store with the per-widget sample fallback, so
 * the screen never blocks or throws regardless of store state. The
 * post-run session review stays in the fullscreen playground overlay
 * (TourAnalyticsScreen) — this screen is the story, not the result.
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useRingRef } from '../TourRing'
import type { RingTargetKey } from '../tourConstants'
import {
  DashboardTile,
  GraphsTile,
  TableTile,
  VocabularyStrip,
  useHomeAnalyticsData,
} from '../HomeAnalyticsSection'
import type { HomeAnalyticsData } from '../homeAnalyticsData'

export interface TourAnalyticsShowcaseScreenProps {
  /** Active runway stage id — one of the wql-* analytics beats. */
  activeStageId: string
  /**
   * Pre-resolved widget data (tests). Omit to execute the queries against
   * the live store with the sample fallback.
   */
  data?: HomeAnalyticsData
}

/** Pane 0..3 for a wql-* stage id; the closing beat keeps the dashboard. */
function paneIndexFor(stageId: string): number {
  switch (stageId) {
    case 'wql-idea':
      return 0
    case 'wql-table':
      return 1
    case 'wql-graphs':
      return 2
    default:
      return 3
  }
}

/**
 * Cross-fading presentation inside the window, scaled to fit: the content's
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

export function TourAnalyticsShowcaseScreen({ activeStageId, data }: TourAnalyticsShowcaseScreenProps) {
  const { data: liveData } = useHomeAnalyticsData()
  const d = data ?? liveData
  const pane = paneIndexFor(activeStageId)

  return (
    <div className="relative h-full" data-testid="tour-analytics-showcase">
      <Pane visible={pane === 0} ringKey="analytics.vocab">
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
      <Pane visible={pane === 1} ringKey="analytics.table">
        <TableTile data={d} />
      </Pane>
      <Pane visible={pane === 2} ringKey="analytics.graphs">
        <GraphsTile data={d} />
      </Pane>
      <Pane visible={pane >= 3} ringKey="analytics.dashboard">
        <DashboardTile data={d} />
      </Pane>
    </div>
  )
}
