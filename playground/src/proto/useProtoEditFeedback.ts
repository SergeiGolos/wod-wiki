// PROTOTYPE — throwaway
// Hook that debounces the diff between the editor's current source and the
// original example source, then pushes changed-line feedback into CodeMirror.

import { useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { useProtoVariant } from './ProtoVariantSwitch'
import { dispatchEditFeedback } from './editFeedback'

export interface UseProtoEditFeedbackArgs {
  route: string
  editorSource: string
  activeOriginalSource: string
  viewRef: React.MutableRefObject<EditorView | null>
}

export function useProtoEditFeedback({
  route,
  editorSource,
  activeOriginalSource,
  viewRef,
}: UseProtoEditFeedbackArgs) {
  const { proto } = useProtoVariant()
  const lastDispatchedRef = useRef<string | null>(null)

  useEffect(() => {
    if (route !== '/') return

    if (!proto) {
      const view = viewRef.current
      // Guard: tests and early mounts may hold a stub without `dispatch`.
      if (view && typeof view.dispatch === 'function' && lastDispatchedRef.current !== '') {
        dispatchEditFeedback(view, [])
        lastDispatchedRef.current = ''
      }
      return
    }

    const timer = setTimeout(() => {
      const view = viewRef.current
      if (!view || typeof view.dispatch !== 'function') return

      const originalLines = activeOriginalSource.split('\n')
      const currentLines = editorSource.split('\n')
      const changed: string[] = []

      for (let i = 0; i < currentLines.length; i++) {
        const trimmed = currentLines[i].trim()
        if (!trimmed) continue
        if (trimmed !== (originalLines[i] ?? '').trim()) {
          changed.push(trimmed)
        }
      }

      const key = changed.join('\n')
      if (key === lastDispatchedRef.current) return
      lastDispatchedRef.current = key

      dispatchEditFeedback(view, changed)
    }, 300)

    return () => clearTimeout(timer)
  }, [route, proto, editorSource, activeOriginalSource, viewRef])
}
