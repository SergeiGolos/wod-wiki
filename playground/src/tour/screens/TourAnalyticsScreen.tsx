import React, { useMemo, useState } from 'react'
import { ReviewGrid } from '@/components/organisms/review/ReviewGrid'
import { useUserOverrides } from '@/components/organisms/review/useUserOverrides'
import { AnalyticsScorecard } from '@/components/organisms/review/AnalyticsScorecard'
import type { Segment } from '@bitcobblers/wod-wiki-engine'
import { MetricType } from '@bitcobblers/wod-wiki-engine'
import type { ProjectionResult } from '@bitcobblers/wod-wiki-engine'

export interface TourAnalyticsScreenProps {
  segments: Segment[]
  title?: string
}

export const TourAnalyticsScreen: React.FC<TourAnalyticsScreenProps> = ({
  segments,
  title,
}) => {
  const { overrides } = useUserOverrides(true)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set())

  const projections = useMemo(() => extractProjections(segments), [segments])

  const handleSelectSegment = (
    id: number,
    modifiers?: { ctrlKey: boolean; shiftKey: boolean },
    visibleIds?: number[]
  ) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev)
      if (modifiers?.ctrlKey) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else if (modifiers?.shiftKey && visibleIds) {
        const lastId = Array.from(prev).pop()
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId)
          const endIdx = visibleIds.indexOf(id)
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx)
            const max = Math.max(startIdx, endIdx)
            for (let i = min; i <= max; i++) {
              next.add(visibleIds[i])
            }
          } else {
            next.add(id)
          }
        } else {
          next.add(id)
        }
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const crumb = title ?? 'Session review'

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-6 py-3 font-mono text-[10px] uppercase tracking-mono text-muted-foreground">
        {crumb}
      </div>

      <div className="shrink-0 px-6 pb-3">
        {projections.length > 0 ? (
          <AnalyticsScorecard projections={projections} />
        ) : segments.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Finish or stop the timer — results land here
          </div>
        ) : null}
      </div>

      <section className="flex min-h-0 flex-1 flex-col px-6 pb-6">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-label text-muted-foreground">
          Workout Log
        </h3>
        <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card">
          <ReviewGrid
            runtime={null}
            segments={segments}
            selectedSegmentIds={selectedSegmentIds}
            onSelectSegment={handleSelectSegment}
            groups={[]}
            userOutputOverrides={overrides}
            gridViewPreset="default"
          />
        </div>
      </section>
    </div>
  )
}

function extractProjections(segments: Segment[]): ProjectionResult[] {
  return segments
    .filter((s) => getSegmentContext(s)?.outputType === 'analytics')
    .map((s) => {
      const metrics = s.metrics?.toArray() || []
      const labelMetric = metrics.find((m) => m.type === MetricType.Label)
      const valueMetric = metrics.find((m) => m.type !== MetricType.Label)
      const value =
        valueMetric && typeof valueMetric.value === 'number'
          ? valueMetric.value
          : 0

      return {
        name: labelMetric?.value?.toString() || labelMetric?.image || 'Stat',
        value,
        unit: valueMetric?.unit || '',
        metricType: valueMetric?.type,
        origin: valueMetric?.origin || 'analyzed',
        timeSpan: { started: s.startTime, ended: s.endTime },
      } satisfies ProjectionResult
    })
}

function getSegmentContext(s: Segment): Record<string, unknown> | undefined {
  // AnalyticsTransformer attaches a runtime context bag to Segment, but the
  // shared Segment interface does not declare it. Read it through a typed cast
  // at the boundary and validate consumers with `typeof` / `in` checks.
  return (s as unknown as Segment & { context?: Record<string, unknown> }).context
}

export default TourAnalyticsScreen
