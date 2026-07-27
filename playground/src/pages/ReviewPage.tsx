/**
 * ReviewPage — /review/:runtimeId
 *
 * Loads a stored workout result from IndexedDB and renders it in the
 * FullscreenReview component.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FullscreenReview } from '@/components/organisms/review/FullscreenReview'
import { PostWorkoutRpePrompt } from '@/components/organisms/review/PostWorkoutRpePrompt'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResult } from '@/types/storage'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { notePersistence } from '@/services/persistence'
import { formatDateMedium } from '@/lib/dateFormat'

export function ReviewPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [result, setResult] = useState<WorkoutResult | null>(null)
  const [title, setTitle] = useState('Workout Review')
  const [error, setError] = useState<string | null>(null)

  // Onboarding (ADR-0010, Goal Gradient) — opening a review is the fifth step.
  const { mark } = useOnboardingProgress()
  useEffect(() => {
    mark('openedReview')
  }, [mark])

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
      setResult(result)
      const safeNoteId = result.noteId || ''
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(safeNoteId)
      if (isUUID && safeNoteId) {
        notePersistence.getNote(safeNoteId).then(note => {
          if (cancelled) return
          const humanTitle = note?.title && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(note.title)
            ? note.title
            : undefined
          const dateLabel = formatDateMedium(new Date(result.createdAt || Date.now()))
          setTitle(humanTitle ? `${humanTitle} · ${dateLabel}` : `Workout Review · ${dateLabel}`)
        }).catch(() => {
          if (cancelled) return
          const dateLabel = formatDateMedium(new Date(result.createdAt || Date.now()))
          setTitle(`Workout Review · ${dateLabel}`)
        })
      } else {
        const noteLabel = safeNoteId.includes('/')
          ? safeNoteId.split('/').pop()!
          : safeNoteId || 'Workout Review'
        setTitle(noteLabel)
      }
      if (result.data?.logs?.length) {
        const { segments: s } = getAnalyticsFromLogs(result.data.logs, result.data.startTime)
        setSegments(s)
      } else {
        setSegments([])
      }
    }).catch(() => {
      if (!cancelled) setError('Failed to load result.')
    })
    return () => { cancelled = true }
  }, [runtimeId])

  const handleRpeCaptured = useCallback(() => {
    if (!runtimeId) return
    let cancelled = false
    indexedDBService.getResultById(runtimeId).then(reloaded => {
      if (cancelled) return
      if (!reloaded) {
        setError('Result not found.')
        return
      }
      setResult(reloaded)
      if (reloaded.data?.logs?.length) {
        const { segments: s } = getAnalyticsFromLogs(reloaded.data.logs, reloaded.data.startTime)
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
    <div className="flex-1 flex flex-col">
      <PostWorkoutRpePrompt
        resultId={runtimeId ?? ''}
        logs={result?.data?.logs ?? []}
        onCaptured={handleRpeCaptured}
        className="m-4 mb-0"
      />
      <FullscreenReview
        segments={segments}
        onClose={() => navigate(-1)}
        title={title}
      />
    </div>
  )
}
