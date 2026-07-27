import { useEffect, useRef } from 'react';
import { usePageQuests, type Quest } from './usePageQuests';
import type { FullscreenState } from './useCanvasRuntime';

export interface UseCompletionChallengeArgs {
  pageRoute: string;
  quests: Quest[];
  fullscreen: FullscreenState;
  enabled?: boolean;
}

export interface UseCompletionChallengeResult {
  questIds: string[];
}

export function useCompletionChallenge({
  pageRoute,
  quests,
  fullscreen,
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
    if (!enabled || !fullscreen) return;

    if (fullscreen.kind === 'review' && fullscreen.results?.completed === true) {
      for (const q of completionQuests) {
        if (firedRef.current.has(q.id)) continue;
        
        markComplete(q.id);
        firedRef.current.add(q.id);
      }
    }
  }, [enabled, fullscreen, completionQuests, markComplete]);

  return {
    questIds: completionQuests.map((q) => q.id),
  };
}
