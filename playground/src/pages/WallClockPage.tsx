/**
 * WallClockPage — /run/:runtimeId
 *
 * Runs a workout from a pending runtime stored in the in-memory pendingRuntimes
 * map. On completion the result is persisted to IndexedDB and the user is
 * redirected to the review page.
 */

import { useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { reviewPath } from '../lib/routes'
import { parseNoteId, noteRefToPath } from '../lib/noteIdentity'
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer'
import { playgroundRecorder } from '../services/resultRecorder'
import { pendingRuntimes } from '../runtimeStore'

export function WallClockPage() {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  const navigate = useNavigate()
  const pendingRef = useRef(runtimeId ? pendingRuntimes.get(runtimeId) : undefined)

  // Consume from the pending store on mount so it doesn't leak
  useEffect(() => {
    if (runtimeId) pendingRuntimes.delete(runtimeId)
  }, [runtimeId])

  const pending = pendingRef.current

  const handleComplete = useCallback(
    (_blockId: string, results: any) => {
      if (!results || !runtimeId || !pending) return
      playgroundRecorder.record({
        runBlock: pending.block,
        blockId: pending.block.id,
        noteId: pending.noteId,
        resultId: runtimeId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }).then(() => {
        if (results.completed) {
          navigate(reviewPath(runtimeId), { replace: true })
        }
      }).catch(() => {})
    },
    [runtimeId, pending, navigate],
  )

  const handleClose = useCallback(() => {
    if (!pending) { navigate('/'); return }
    // Route back to the note via the typed NoteRef — the kind→path rule lives
    // in noteRefToPath, not an ad-hoc noteId.split('/') switch here.
    navigate(noteRefToPath(parseNoteId(pending.noteId)), { replace: true })
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
