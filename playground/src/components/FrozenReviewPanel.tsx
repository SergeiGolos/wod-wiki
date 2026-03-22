import { useState, useEffect, useMemo } from 'react'
import { ReviewGrid } from '@/components/review-grid/ReviewGrid'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import { getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer'

const SAMPLE_SEGMENTS: Segment[] = [
  { id: 1, name: 'Deadlifts', type: 'exercise', startTime: 0, endTime: 45, elapsed: 45, total: 45, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 2, name: 'Box Jumps', type: 'exercise', startTime: 46, endTime: 118, elapsed: 72, total: 72, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 3, name: 'Push-ups', type: 'exercise', startTime: 119, endTime: 177, elapsed: 58, total: 58, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
  { id: 4, name: 'Deadlifts', type: 'exercise', startTime: 180, endTime: 226, elapsed: 46, total: 46, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 5, name: 'Box Jumps', type: 'exercise', startTime: 227, endTime: 302, elapsed: 75, total: 75, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 6, name: 'Push-ups', type: 'exercise', startTime: 303, endTime: 360, elapsed: 57, total: 57, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
]

export function FrozenReviewPanel({ runtime }: { runtime: IScriptRuntime | null }) {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!runtime) { setRevision(0); return }
    const unsub = runtime.subscribeToOutput(() => {
      setRevision(r => r + 1)
    })
    return unsub
  }, [runtime])

  const { segments, groups } = useMemo(() => {
    if (!runtime) return { segments: SAMPLE_SEGMENTS, groups: [] }
    const result = getAnalyticsFromRuntime(runtime)
    return result.segments.length > 0 ? result : { segments: SAMPLE_SEGMENTS, groups: [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, revision])

  return (
    <div className="w-full h-full overflow-auto bg-background">
      <ReviewGrid
        runtime={null}
        segments={segments}
        selectedSegmentIds={new Set()}
        onSelectSegment={() => {}}
        groups={groups}
      />
    </div>
  )
}
