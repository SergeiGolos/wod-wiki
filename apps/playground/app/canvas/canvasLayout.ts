import type { CSSProperties } from 'react'

export const DEFAULT_EDITOR_WIDTH = '50%'
export const DEFAULT_EDITOR_MIN_WIDTH = '22rem'
export const DEFAULT_EDITOR_MAX_WIDTH = '42rem'
export const DEFAULT_EDITOR_MIN_HEIGHT = '20rem'
export const DEFAULT_EDITOR_MAX_HEIGHT = 'calc(100dvh - var(--canvas-sticky-top) - 2rem)'

export interface CanvasLayoutPolicy {
  editorWidth: string
  editorMinWidth: string
  editorMaxWidth: string
  editorMinHeight: string
  editorMaxHeight: string
}

export function resolveCanvasLayout(width?: string): CanvasLayoutPolicy {
  return {
    editorWidth: width || DEFAULT_EDITOR_WIDTH,
    editorMinWidth: DEFAULT_EDITOR_MIN_WIDTH,
    editorMaxWidth: DEFAULT_EDITOR_MAX_WIDTH,
    editorMinHeight: DEFAULT_EDITOR_MIN_HEIGHT,
    editorMaxHeight: DEFAULT_EDITOR_MAX_HEIGHT,
  }
}

/**
 * Estimates a preferred editor frame from authored source without measuring DOM
 * during render. The frame remains capped by the available viewport in CSS.
 */
export function getEditorPreferredHeight(source: string): string {
  const lineCount = Math.max(1, source.split('\n').length)
  const bodyHeight = Math.min(560, Math.max(180, lineCount * 22))
  return `calc(${bodyHeight}px + 3.5rem)`
}

export function getCanvasLayoutVariables(policy: CanvasLayoutPolicy, source: string): CSSProperties {
  return {
    '--canvas-editor-width': policy.editorWidth,
    '--canvas-editor-min-width': policy.editorMinWidth,
    '--canvas-editor-max-width': policy.editorMaxWidth,
    '--canvas-editor-min-height': policy.editorMinHeight,
    '--canvas-editor-max-height': policy.editorMaxHeight,
    '--canvas-editor-preferred-height': getEditorPreferredHeight(source),
  } as CSSProperties
}
