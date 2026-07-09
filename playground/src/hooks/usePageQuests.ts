/**
 * usePageQuests — hook for loading, tracking, and validating page-specific quests.
 *
 * Automatically hydrates quest completion status from the global localStorage ledger.
 * Exposes helper actions for marking quests complete and toggling them (Storybook
 * sandbox path).
 */

import { useCallback, useEffect, useState } from 'react';
import { readQuestProgress, markQuestComplete, toggleQuestState, type QuestProgress } from '../services/questProgress';

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

export function usePageQuests(pageQuests: Quest[]): UsePageQuestsResult {
  const [progress, setProgress] = useState<QuestProgress>(readQuestProgress);

  // Sync state reactively across local actions and storage changes
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'wodwiki.quests.v1') {
        setProgress(readQuestProgress());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markComplete = useCallback((questId: string) => {
    markQuestComplete(questId);
    setProgress(readQuestProgress());
  }, []);

  const toggleQuest = useCallback((questId: string) => {
    toggleQuestState(questId);
    setProgress(readQuestProgress());
  }, []);

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
