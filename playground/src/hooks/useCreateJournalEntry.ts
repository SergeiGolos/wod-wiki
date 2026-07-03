/**
 * useCreateJournalEntry — wraps the triplicated "create a journal entry"
 * flow that `App.tsx`, `ListViews.tsx`, and `PlanPage.tsx` each duplicated.
 *
 * The flow runs the n-step palette chain via `createJournalEntryFlow`, then
 * saves the page in IndexedDB and navigates to it. The hook owns the wiring;
 * the caller decides what to pass as the entry date (a `Date` for
 * click-on-calendar or a `dateKey` string for click-on-feed-row).
 *
 * The optional `workoutItems` arg is accepted for leaf-component prop
 * stability (see the handoff contract) but not used by the flow today.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJournalEntryFlow } from '../services/journalEntryFlow'
import { playgroundContent } from '../services/playgroundContent'
import { journalEntryPath } from '../lib/routes'

export type CreateEntryInput = Date | string

export interface UseCreateJournalEntryOptions {
  /**
   * Workout library items. Currently unused — `createJournalEntryFlow` does
   * not read them, but the prop is kept on the hook so leaf components that
   * forward `workoutItems` (ListViews, PlanPage) keep a stable interface.
   */
  workoutItems?: readonly unknown[]
}

function toDateKey(input: CreateEntryInput): string {
  if (typeof input === 'string') return input
  const y = input.getFullYear()
  const m = String(input.getMonth() + 1).padStart(2, '0')
  const d = String(input.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useCreateJournalEntry(_opts: UseCreateJournalEntryOptions = {}) {
  const navigate = useNavigate()

  return useCallback(
    async (input: CreateEntryInput) => {
      const dateKey = toDateKey(input)
      await createJournalEntryFlow({
        dateKey,
        onCreated: async (content) => {
          await playgroundContent.savePage({
            id: `journal/${dateKey}`,
            name: dateKey,
            category: 'journal',
            content,
            updatedAt: Date.now(),
          })
          navigate(journalEntryPath(dateKey))
        },
      })
    },
    [navigate],
  )
}
