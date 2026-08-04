/**
 * useSuggestions — React hook over the slot suggestion bindings (#831).
 *
 * Loads a slot's suggestions on mount (and when the binding changes),
 * honoring the binding's cache policy via loadSuggestions. Slots without a
 * binding (target/scope/time — static option lists, where — custom editor)
 * resolve to an empty item list with `loading: false`.
 */

import { useEffect, useState } from 'react'
import {
  getSuggestionBinding,
  loadSuggestions,
  type SuggestionBinding,
  type SuggestionItem,
} from './suggestionSources'

export interface ClauseSuggestions {
  items: SuggestionItem[]
  /** True while the first load for this slot is in flight. */
  loading: boolean
  /** The slot's binding (cache policy, open flag, empty-state copy). */
  binding?: SuggestionBinding
}

export function useSuggestions(type: string): ClauseSuggestions {
  const binding = getSuggestionBinding(type)
  const [items, setItems] = useState<SuggestionItem[]>([])
  const [loading, setLoading] = useState(Boolean(binding))

  useEffect(() => {
    if (!binding) {
      setItems([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    loadSuggestions(type).then(result => {
      if (cancelled) return
      setItems(result)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [type, binding])

  return { items, loading, binding }
}
