import { useCallback, useEffect, useRef, useState } from 'react'
import type { TourStageSlice } from './tourStages'

export interface UseTypewriterArgs {
  script: string
  doc: string
  setDoc: (next: string) => void
  subscribe: (cb: (slice: TourStageSlice, progress: number) => void) => () => void
  enabled: boolean
}

export interface UseTypewriterResult {
  /** True once the user has edited the document diverging from the typewriter trace. */
  userDiverged: boolean
  /** Immediately complete the document to the full script (no-op if user diverged). */
  complete: () => void
}

export function useTypewriter({
  script,
  doc,
  setDoc,
  subscribe,
  enabled,
}: UseTypewriterArgs): UseTypewriterResult {
  const [userDiverged, setUserDiverged] = useState(false)

  // Last doc value the typewriter wrote and observed as committed.
  const lastTypedRef = useRef(doc)
  // Doc target we just dispatched but haven't seen committed yet.
  const pendingRef = useRef<string | null>(null)
  const docRef = useRef(doc)
  const divergedRef = useRef(userDiverged)

  docRef.current = doc
  divergedRef.current = userDiverged

  // Keep lastTypedRef in sync with committed typewriter writes, and detect
  // user edits that happen outside the typewriter.
  useEffect(() => {
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
  }, [doc, script])

  useEffect(() => {
    if (!enabled) {
      pendingRef.current = null
      return
    }

    const unsubscribe = subscribe((slice) => {
      if (divergedRef.current) return
      if (pendingRef.current !== null) return

      let chars: number
      if (slice.stage.id === 'overview') {
        // Overview shows the finished note; entering the editor stage
        // rewinds and retypes it (POC behavior).
        chars = script.length + 4
      } else if (slice.stage.id === 'editor') {
        const t = Math.max(0, Math.min(1, (slice.t - 0.05) / 0.75))
        chars = Math.floor(t * (script.length + 4))
      } else {
        // timer / analytics / library: finish the script
        chars = script.length + 4
      }

      const target = script.slice(0, Math.min(chars, script.length))
      const currentDoc = docRef.current

      // User-edit guard: never clobber a user edit.
      if (currentDoc !== lastTypedRef.current && currentDoc !== script) {
        setUserDiverged(true)
        return
      }

      if (target === currentDoc) return

      pendingRef.current = target
      setDoc(target)
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, script, setDoc, subscribe])

  const complete = useCallback(() => {
    if (divergedRef.current) return
    if (pendingRef.current !== null) return

    const currentDoc = docRef.current
    if (currentDoc !== lastTypedRef.current && currentDoc !== script) return

    const target = script
    if (target === currentDoc) return

    pendingRef.current = target
    setDoc(target)
  }, [script, setDoc])

  return { userDiverged, complete }
}
