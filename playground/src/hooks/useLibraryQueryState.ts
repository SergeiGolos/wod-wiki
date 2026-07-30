/**
 * useLibraryQueryState — URL ↔ WQL Composer Panel state for the Library route.
 * Uses `nuqs` (`useQueryState`) to bind state to search parameters, matching the
 * app-wide `<NuqsAdapter>` pattern.
 *
 * Tri-state encoding per #809's resolution: `include | hide | neutral` (default is
 * `include` when absent/empty in the URL).
 */
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import {
  DEFAULT_PANEL_STATE,
  type PanelState,
  type TriState,
  type TimePreset,
} from '../views/library/WqlComposerPanel'

export interface LibraryQueryState {
  state: PanelState
  setState: (next: PanelState) => void
}

const TRI_STATES: readonly TriState[] = ['include', 'hide', 'neutral']
const TIME_PRESETS: readonly TimePreset[] = ['1d', '3d', '1w', '2w', '4w', '12w', '26w', '52w', 'all', 'custom']

export function useLibraryQueryState(): LibraryQueryState {
  const [noteParam, setNoteParam] = useQueryState('note', { defaultValue: '', shallow: true, history: 'replace' })
  const [sessionParam, setSessionParam] = useQueryState('session', { defaultValue: '', shallow: true, history: 'replace' })
  const [postParam, setPostParam] = useQueryState('post', { defaultValue: '', shallow: true, history: 'replace' })
  const [textParam, setTextParam] = useQueryState('text', { defaultValue: '', shallow: true, history: 'replace' })
  const [presetParam, setPresetParam] = useQueryState('timePreset', { defaultValue: '', shallow: true, history: 'replace' })
  const [startParam, setStartParam] = useQueryState('rangeStart', { defaultValue: '', shallow: true, history: 'replace' })
  const [endParam, setEndParam] = useQueryState('rangeEnd', { defaultValue: '', shallow: true, history: 'replace' })

  const note = (TRI_STATES as readonly string[]).includes(noteParam) ? (noteParam as TriState) : 'include'
  const session = (TRI_STATES as readonly string[]).includes(sessionParam) ? (sessionParam as TriState) : 'include'
  const post = (TRI_STATES as readonly string[]).includes(postParam) ? (postParam as TriState) : 'include'
  const text = textParam || DEFAULT_PANEL_STATE.text
  const timePreset = (TIME_PRESETS as readonly string[]).includes(presetParam) ? (presetParam as TimePreset) : DEFAULT_PANEL_STATE.timePreset
  const customStart = startParam || undefined
  const customEnd = endParam || undefined

  const state: PanelState = useMemo(
    () => ({
      sources: { note, session, post },
      text,
      timePreset,
      customStart,
      customEnd,
      filters: DEFAULT_PANEL_STATE.filters,
    }),
    [note, session, post, text, timePreset, customStart, customEnd],
  )

  const setState = useCallback(
    (next: PanelState) => {
      setNoteParam(next.sources.note === 'include' ? '' : next.sources.note)
      setSessionParam(next.sources.session === 'include' ? '' : next.sources.session)
      setPostParam(next.sources.post === 'include' ? '' : next.sources.post)
      setTextParam(next.text || '')
      setPresetParam(next.timePreset === DEFAULT_PANEL_STATE.timePreset ? '' : next.timePreset)
      if (next.timePreset === 'custom') {
        setStartParam(next.customStart || '')
        setEndParam(next.customEnd || '')
      } else {
        setStartParam('')
        setEndParam('')
      }
    },
    [setNoteParam, setSessionParam, setPostParam, setTextParam, setPresetParam, setStartParam, setEndParam],
  )

  return { state, setState }
}
