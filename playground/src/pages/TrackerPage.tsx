/**
 * TrackerPage — /tracker/:runtimeId
 *
 * Runs a workout from a pending runtime stored in the in-memory pendingRuntimes
 * map. On completion the result is persisted to IndexedDB and the user is
 * redirected to the review page.
 */

import { useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { notePersistence } from '@/services/persistence'
import { pendingRuntimes } from '../runtimeStore'

export function TrackerPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const pendingRef = useRef(runtimeId ? pendingRuntimes.get(runtimeId) : undefined)

  // Consume from the pending store on mount so it doesn't leak
  useEffect(() => {
    if (runtimeId) pendingRuntimes.delete(runtimeId)
  }, [runtimeId])

  const pending = pendingRef.current

  const handleComplete = useCallback(
    (blockId: string, results: any) => {
      if (!results || !runtimeId || !pending) return
      notePersistence.mutateNote(pending.noteId, {
        workoutResult: {
          id: runtimeId,
          sectionId: blockId,
          data: results,
          completedAt: results.endTime || Date.now(),
        },
      }).then(() => {
        if (results.completed) {
          navigate(`/review/${runtimeId}`, { replace: true })
        }
      }).catch(() => {})
    },
    [runtimeId, pending, navigate],
  )

  const handleClose = useCallback(() => {
    if (!pending) { navigate('/'); return }
    // Go back to the note
    const parts = pending.noteId.split('/')
    if (parts.length >= 2 && parts[0] === 'playground') {
      navigate(`/playground/${encodeURIComponent(parts[1])}`, { replace: true })
    } else if (parts.length >= 2 && parts[0] === 'journal') {
      navigate(`/journal/${encodeURIComponent(parts[1])}`, { replace: true })
    } else if (parts.length >= 2) {
      navigate(`/workout/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [pending, navigate])

  if (!pending) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Runtime not found. Please start the workout from the editor.
      </div>
    )
  }

  return (
    <FullscreenTimer
      block={pending.block}
      onClose={handleClose}
      onCompleteWorkout={handleComplete}
      autoStart
    />
  )
}
