import { useEffect, useRef } from 'react';
import { usePageQuests, type Quest } from './usePageQuests';
import type { WorkoutResults } from '@/components/Editor/types';

export interface UseCompletionChallengeArgs {
  pageRoute: string;
  quests: Quest[];
  /** Results of the last finished workout, if any (#945: completion no longer
   * opens a review overlay, so the quest signal rides the results directly). */
  completedResults: WorkoutResults | null;
  enabled?: boolean;
}

export interface UseCompletionChallengeResult {
  questIds: string[];
}

export function useCompletionChallenge({
  pageRoute,
  quests,
  completedResults,
  enabled = true,
}: UseCompletionChallengeArgs): UseCompletionChallengeResult {
  const { markComplete } = usePageQuests(pageRoute, quests);
  
  // Keep track of quest IDs that were completed in this mount to avoid duplicates
  const firedRef = useRef<Set<string>>(new Set());

  // Reset the fired set if quests or route changes
  const questKey = quests.map((q) => q.id).join('|');
  useEffect(() => {
    firedRef.current.clear();
  }, [pageRoute, questKey]);

  // Filter out quests that require workout-complete trigger
  const completionQuests = quests.filter(
    (q) => q.validation?.type === 'workout-complete'
  );

  useEffect(() => {
    if (!enabled || !completedResults) return;

    if (completedResults.completed === true) {
      for (const q of completionQuests) {
        if (firedRef.current.has(q.id)) continue;
        
        markComplete(q.id);
        firedRef.current.add(q.id);
      }
    }
  }, [enabled, completedResults, completionQuests, markComplete]);

  return {
    questIds: completionQuests.map((q) => q.id),
  };
}
