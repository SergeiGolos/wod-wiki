/**
 * useScrollTypewriter.ts — per-stage scroll-scrubbed typewriter for
 * ```scroll canvas pages.
 *
 * Sibling of the home tour's useTypewriter, but stage/source-aware: each
 * stage owns a script (its resolved `source`), and crossing a stage
 * boundary rewinds — the new stage's source types in from scratch
 * (per-stage restart: one concept per stage). Within a stage the char
 * count follows quadOut(local t) over the whole stage for a calmer feel
 * than the tour's linear window.
 *
 * Stages without a source hold the previous editor content. Divergence
 * detection is copied verbatim from the tour: an edit that is neither
 * the last typed value nor the current script marks userDiverged and the
 * typewriter stops writing (never clobbers a user edit).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp01, quadOut, type ScrollSlice } from './scrollRunway'

export interface UseScrollTypewriterArgs {
  /** Stage id → resolved script (resolveSource output), pre-resolved. */
  sourcesByStageId: Record<string, string>
  doc: string
  setDoc: (next: string) => void
  subscribe: (cb: (slice: ScrollSlice) => void) => () => void
  enabled: boolean
}

export interface UseScrollTypewriterResult {
  /** True once the user has edited the document diverging from the typewriter trace. */
  userDiverged: boolean
  /** Immediately complete the document to the current stage's full script (no-op if diverged). */
  complete: () => void
}

export function useScrollTypewriter({
  sourcesByStageId,
  doc,
  setDoc,
  subscribe,
  enabled,
}: UseScrollTypewriterArgs): UseScrollTypewriterResult {
  const [userDiverged, setUserDiverged] = useState(false)

  // Last doc value the typewriter wrote and observed as committed.
  const lastTypedRef = useRef(doc)
  // Doc target we just dispatched but haven't seen committed yet.
  const pendingRef = useRef<string | null>(null)
  const docRef = useRef(doc)
  const divergedRef = useRef(userDiverged)
  // Script of the stage the typewriter is currently writing.
  const scriptRef = useRef('')
  const stageIdRef = useRef<string | null>(null)
  // True between a stage-change reset and the typewriter's first write
  // into the new stage: the doc still holds the PREVIOUS stage's content,
  // which legitimately matches neither lastTyped ('') nor the new script
  // — the user-edit guard must not read that as divergence.
  const stageJustChangedRef = useRef(false)

  docRef.current = doc
  divergedRef.current = userDiverged

  // Keep lastTypedRef in sync with committed typewriter writes, and detect
  // user edits that happen outside the typewriter. (Verbatim from the
  // tour's useTypewriter divergence detection.)
  useEffect(() => {
    const script = scriptRef.current
    if (pendingRef.current !== null) {
      if (doc === pendingRef.current) {
        lastTypedRef.current = doc
        pendingRef.current = null
        return
      }
      if (doc !== lastTypedRef.current) {
        setUserDiverged(true)
        return
      }
    }

    if (doc !== lastTypedRef.current && doc !== script) {
      setUserDiverged(true)
    }
  }, [doc])

  useEffect(() => {
    if (!enabled) {
      pendingRef.current = null
      return
    }

    const unsubscribe = subscribe((slice) => {
      // Stage change → rewind: the new stage's source types from zero.
      if (slice.stage.id !== stageIdRef.current) {
        stageIdRef.current = slice.stage.id
        scriptRef.current = sourcesByStageId[slice.stage.id] ?? ''
        lastTypedRef.current = ''
        pendingRef.current = null
        setUserDiverged(false)
        stageJustChangedRef.current = true
      }

      if (divergedRef.current) return
      if (pendingRef.current !== null) return

      const script = scriptRef.current
      // Stage without a source holds the previous editor content.
      if (!script) return

      const chars = Math.floor(quadOut(clamp01(slice.t)) * script.length)
      const target = script.slice(0, chars)
      const currentDoc = docRef.current

      // User-edit guard: never clobber a user edit. Skipped for the
      // first write after a stage change (see stageJustChangedRef).
      if (
        !stageJustChangedRef.current &&
        currentDoc !== lastTypedRef.current &&
        currentDoc !== script
      ) {
        setUserDiverged(true)
        return
      }
      stageJustChangedRef.current = false

      if (target === currentDoc) return

      pendingRef.current = target
      setDoc(target)
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, sourcesByStageId, setDoc, subscribe])

  const complete = useCallback(() => {
    if (divergedRef.current) return
    const script = scriptRef.current
    if (!script) return
    pendingRef.current = script
    setDoc(script)
  }, [setDoc])

  return { userDiverged, complete }
}
