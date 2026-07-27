/**
 * usePageQuests — hook for loading, tracking, and validating page-specific
 * quests, namespaced by the current page route.
 *
 * Hydrates quest completion status from the global localStorage ledger,
 * scoped to the supplied `pageRoute` so identical quest ids on different
 * pages (e.g. `round-1` on two different chapters) don't collide.
 *
 * Exposes helper actions for marking quests complete and toggling them
 * (Storybook sandbox path).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  readQuestProgress,
  markQuestComplete as ledgerMark,
  toggleQuestState as ledgerToggle,
  type QuestProgress,
} from '../services/questProgress';

export interface Quest {
  id: string;
  label: string;
  desc?: string;
  validation?: {
    type: string;
    [key: string]: unknown;
  };
}

export interface UsePageQuestsResult {
  quests: Array<Quest & { isCompleted: boolean }>;
  stepsComplete: number;
  totalSteps: number;
  isComplete: boolean;
  markComplete: (questId: string) => void;
  toggleQuest: (questId: string) => void;
}

export function usePageQuests(
  pageRoute: string,
  pageQuests: Quest[],
): UsePageQuestsResult {
  const [progress, setProgress] = useState<QuestProgress>(() =>
    readQuestProgress(pageRoute),
  );

  // Sync state reactively across local actions and storage changes
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'wodwiki.quests.v1') {
        setProgress(readQuestProgress(pageRoute));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [pageRoute]);

  const markComplete = useCallback(
    (questId: string) => {
      ledgerMark(pageRoute, questId);
      setProgress(readQuestProgress(pageRoute));
    },
    [pageRoute],
  );

  const toggleQuest = useCallback(
    (questId: string) => {
      ledgerToggle(pageRoute, questId);
      setProgress(readQuestProgress(pageRoute));
    },
    [pageRoute],
  );

  const questsWithStatus = pageQuests.map((q) => ({
    ...q,
    isCompleted: !!progress[q.id],
  }));

  const totalSteps = pageQuests.length;
  const stepsComplete = questsWithStatus.filter((q) => q.isCompleted).length;

  return {
    quests: questsWithStatus,
    stepsComplete,
    totalSteps,
    isComplete: totalSteps > 0 && stepsComplete === totalSteps,
    markComplete,
    toggleQuest,
  };
}
