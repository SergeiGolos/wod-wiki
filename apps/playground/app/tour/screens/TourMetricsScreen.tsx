/**
 * TourMetricsScreen.tsx — the "Own the Metrics" explainer window.
 *
 * Three cross-fading panes over stylized script displays (static, not live
 * editors — these beats explain concepts rather than demo interaction):
 *
 *   metrics-e   → every tracked thing is an EFFORT (the movement registry)
 *   metrics-d   → each effort line collects MEASURES (reps, load, distance, time)
 *   metrics-c   → efforts × measures compound into queryable analytics facts
 *
 * Each pane registers its framed region under its own ring target so the
 * tour ring can slide onto exactly the concept the caption talks about.
 */
import { useRingRef } from '../TourRing'
import type { RingTargetKey } from '../tourConstants'
import { TOUR_ACCENTS } from '../tourConstants'

export type MetricsStageId = 'metrics-e' | 'metrics-d' | 'metrics-c'

/** Pane 0..2 for a metrics-* stage id; unknown ids keep the compound pane. */
export function metricsPaneIndex(stageId: string): number {
  if (stageId === 'metrics-e') return 0
  if (stageId === 'metrics-d') return 1
  return 2
}

function Pane({
  visible,
  ringKey,
  children,
}: {
  visible: boolean
  ringKey: RingTargetKey
  children: React.ReactNode
}) {
  const ringRef = useRingRef(ringKey)
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: 'none' }}
      aria-hidden={!visible}
    >
      <div ref={ringRef} className="w-full max-w-[520px] rounded-lg bg-card/60 p-4 font-mono text-[13px] leading-[1.9]">
        {children}
      </div>
    </div>
  )
}

const EFFORT = { color: TOUR_ACCENTS.timer }
const MEASURE = { color: TOUR_ACCENTS.editor }
const FACT = { color: TOUR_ACCENTS.analytics }

export function TourMetricsScreen({ activeStageId }: { activeStageId: string }) {
  const pane = metricsPaneIndex(activeStageId)
  return (
    <div className="relative h-full bg-background text-left" data-testid="tour-metrics-screen">
      {/* Pane 0 — efforts */}
      <Pane visible={pane === 0} ringKey="metrics.efforts">
        <div>Back Squat</div>
        <div>Pullups</div>
        <div>500m Row</div>
        <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Every line tracks an <span style={EFFORT}>effort</span> — the movement registry knows it, its tags, and its discipline.
        </div>
      </Pane>

      {/* Pane 1 — measures */}
      <Pane visible={pane === 1} ringKey="metrics.data">
        <div>
          <span style={MEASURE}>5</span> Back Squat <span style={MEASURE}>225lb</span>
        </div>
        <div>
          Run <span style={MEASURE}>400m</span>
        </div>
        <div>
          <span style={MEASURE}>*:90</span> Rest
        </div>
        <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          Each line also collects <span style={MEASURE}>micro data points</span> — reps, load, distance, timed rest.
        </div>
      </Pane>

      {/* Pane 2 — compounding into analytics */}
      <Pane visible={pane === 2} ringKey="metrics.compound">
        <div>(3 Rounds)</div>
        <div>
          {'  '}5 Back Squat 225lb <span className="text-muted-foreground">// effort × load → tonnage</span>
        </div>
        <div>
          {'  '}400m Run <span className="text-muted-foreground">// effort × distance → pace</span>
        </div>
        <div>
          {'  '}*:90 Rest <span className="text-muted-foreground">// runtime splits lock the clock</span>
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <span style={FACT}>sum:tonnage{'{}'} by {'{effort}'}</span>
          <span className="ml-2 text-[11px] text-muted-foreground">← WQL-ready facts</span>
        </div>
      </Pane>
    </div>
  )
}
