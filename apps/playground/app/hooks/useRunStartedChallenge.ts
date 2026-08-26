/**
 * useRunStartedChallenge — completes quests that gate on the workout/demo run
 * actually reaching a running state.
 *
 * Works with the page-scoped quest ledger the same way `useCompletionChallenge`
 * does, but for the `run-started` validation type rather than `workout-complete`.
 *
 * Safe on any page: if the page has no `run-started` quests, the hook is a no-op.
 */

import { useEffect, useMemo } from 'react';
import { usePageQuests, type Quest } from './usePageQuests';

export interface UseRunStartedChallengeArgs {
  pageRoute: string;
  quests: Quest[];
  /** True once the runtime has transitioned to a running state. */
  running: boolean;
}

export function useRunStartedChallenge({
  pageRoute,
  quests,
  running,
}: UseRunStartedChallengeArgs): void {
  const { markComplete } = usePageQuests(pageRoute, quests);

  const runStartedQuests = useMemo(
    () => quests.filter((q) => q.validation?.type === 'run-started'),
    [quests],
  );

  useEffect(() => {
    if (!running) return;
    for (const q of runStartedQuests) {
      markComplete(q.id);
    }
  }, [running, runStartedQuests, markComplete]);
}
