/**
 * useLibraryQueryState — URL ↔ WQL Composer Panel state for the Library route.
 * The URL is the single persistence seam; the panel reads on mount and writes
 * back on every change (debounced for free-text by the panel itself).
 *
 * The tri-state encoding per #809's resolution: each of `note`, `session`,
 * `post` is one of `include | hide | neutral` (the default is `include` when
 * absent).
 */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_PANEL_STATE,
  type PanelState,
  type TriState,
  type TimePreset,
} from '../views/library/WqlComposerPanel'

/** The shape returned by `useLibraryQueryState` — the URL ↔ panel binding. */
export interface LibraryQueryState {
  state: PanelState
  setState: (next: PanelState) => void
}

const TRI_STATES: readonly TriState[] = ['include', 'hide', 'neutral']

function parseTri(value: string | null): TriState {
  if (value && (TRI_STATES as readonly string[]).includes(value)) return value as TriState
  return 'include'
}

function parseTimePreset(value: string | null): TimePreset {
  const valid: readonly TimePreset[] = ['1d', '3d', '1w', '2w', '4w', '12w', '26w', '52w', 'all', 'custom']
  if (value && (valid as readonly string[]).includes(value)) return value as TimePreset
  return DEFAULT_PANEL_STATE.timePreset
}

export function useLibraryQueryState(): LibraryQueryState {
  const [params, setParams] = useSearchParams()

  const state: PanelState = {
    sources: {
      note: parseTri(params.get('note')),
      session: parseTri(params.get('session')),
      post: parseTri(params.get('post')),
    },
    text: params.get('text') ?? DEFAULT_PANEL_STATE.text,
    timePreset: parseTimePreset(params.get('timePreset')),
    customStart: params.get('rangeStart') ?? undefined,
    customEnd: params.get('rangeEnd') ?? undefined,
    filters: DEFAULT_PANEL_STATE.filters,
  }

  const setState = useCallback(
    (next: PanelState) => {
      const patch: Record<string, string> = {}
      // Only write tri-states that differ from the default (include) — keeps
      // URLs short.
      for (const k of ['note', 'session', 'post'] as const) {
        const v = next.sources[k]
        patch[k] = v === 'include' ? '' : v
      }
      if (next.text) patch.text = next.text
      else patch.text = ''
      if (next.timePreset !== DEFAULT_PANEL_STATE.timePreset) patch.timePreset = next.timePreset
      else patch.timePreset = ''
      if (next.timePreset === 'custom') {
        if (next.customStart) patch.rangeStart = next.customStart
        if (next.customEnd) patch.rangeEnd = next.customEnd
      }
      setParams(patch, { replace: true })
    },
    [setParams],
  )

  return { state, setState }
}
