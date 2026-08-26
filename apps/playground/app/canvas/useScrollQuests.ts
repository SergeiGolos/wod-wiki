/**
 * useScrollQuests — fires a ```scroll page's stage quests.
 *
 * Generalizes the home tour's useTourScrollQuests (which hardcodes
 * TOUR_STAGE_QUEST_IDS): the stage→quest map is built from each parsed
 * ScrollStage's `quest` field. As the visitor scrolls a stage into view —
 * or, under `prefers-reduced-motion`, scrolls the matching static card
 * into view — the caller invokes `markStageViewed(stageId)` and the
 * stage's quest is marked complete in the page-scoped ledger (monotonic —
 * never un-completed).
 *
 * Safe on any page: stages without a `quest` field, or whose quest id is
 * not declared on the page, are ignored.
 */

import { useCallback, useRef } from 'react'
import { usePageQuests, type Quest } from '../hooks/usePageQuests'
import type { ScrollStage } from './parseCanvasMarkdown'

/**
 * Validation types that require an external interaction signal. Scroll/visibility
 * alone must not mark these quests complete.
 */
const INTERACTION_VALIDATIONS: Record<string, true> = {
  'workout-complete': true,
  'run-started': true,
};

export function useScrollQuests(
  pageRoute: string,
  quests: Quest[],
  stages: ScrollStage[],
): (stageId: string) => void {
  const { markComplete } = usePageQuests(pageRoute, quests)

  // Refs so the returned callback stays stable when the quests/stages
  // array identities change between renders. Interaction-gated quests are
  // excluded because their completion is driven by an external signal.
  const questIdsRef = useRef<Set<string>>(new Set())
  questIdsRef.current = new Set(
    quests
      .filter((q) => !q.validation || !INTERACTION_VALIDATIONS[q.validation.type])
      .map((q) => q.id),
  )
  const stageQuestRef = useRef<Record<string, string>>({})
  const stageQuest: Record<string, string> = {}
  for (const s of stages) {
    if (s.quest) stageQuest[s.id] = s.quest
  }
  stageQuestRef.current = stageQuest

  return useCallback(
    (stageId: string) => {
      const questId = stageQuestRef.current[stageId]
      if (questId && questIdsRef.current.has(questId)) {
        markComplete(questId)
      }
    },
    [markComplete],
  )
}
