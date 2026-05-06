/**
 * ReviewPage — /review/:runtimeId
 *
 * Loads a stored workout result from IndexedDB and renders it in the
 * FullscreenReview component.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'

export function ReviewPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [title, setTitle] = useState('Workout Review')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resultId = runtimeId
    if (!resultId) return
    let cancelled = false
    indexedDBService.getResultById(resultId).then(result => {
      if (cancelled) return
      if (!result) {
        setError('Result not found.')
        return
      }
      const safeNoteId = result.noteId || ''
      const noteLabel = safeNoteId.includes('/')
        ? safeNoteId.split('/').pop()!
        : safeNoteId || 'Workout Review'
      setTitle(noteLabel)
      if (result.data?.logs && result.data.logs.length > 0) {
        const { segments: s } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime)
        setSegments(s)
      } else {
        setSegments([])
      }
    }).catch(() => {
      if (!cancelled) setError('Failed to load result.')
    })
    return () => { cancelled = true }
  }, [runtimeId])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {error}
      </div>
    )
  }

  if (segments === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <FullscreenReview
      segments={segments}
      onClose={() => navigate(-1)}
      title={title}
    />
  )
}
