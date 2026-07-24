/**
 * useChapterProgress — cross-route quest aggregation for chapter badges.
 *
 * Chapter quests can live on any page (e.g. /guide/syntax/basics, /challenge),
 * but the chapter badge lives in the QuestMenu on the global header —
 * which is mounted on every page, including pages that don't ship the quest
 * list. This hook reads the full localStorage ledger once and computes, for
 * each chapter, how many of its quest ids are complete across ALL pages.
 *
 * Pure read-only — it does not mark quests complete (that's
 * `usePageQuests`'s job on the owning page). It just aggregates the
 * existing ledger so the badge can show per-chapter progress.
 */

import { useEffect, useState } from 'react';
import { readQuestLedger } from '../services/questProgress';
import type { Chapter } from '../canvas/parseCanvasMarkdown';

export interface ChapterProgress {
  chapter: Chapter;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}

export interface UseChapterProgressResult {
  chapters: ChapterProgress[];
  isHydrated: boolean;
}

export function useChapterProgress(
  chapters: Chapter[],
): UseChapterProgressResult {
  // Start un-hydrated so server-rendered HTML doesn't include stale state.
  // Flip to true on the first client render + on every storage event.
  const [hydrated, setHydrated] = useState(false);
  const [ledger, setLedger] = useState<Record<string, Record<string, boolean>>>(
    {},
  );

  useEffect(() => {
    setLedger(readQuestLedger());
    setHydrated(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'wodwiki.quests.v1') {
        setLedger(readQuestLedger());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // A quest id is "done" if ANY page route has it marked complete. The
  // page-scoped ledger means collisions are rare, but the cross-route
  // OR makes badge progress consistent regardless of where the user
  // completed the quest.
  const isDone = (questId: string): boolean => {
    for (const pageRoute in ledger) {
      if (ledger[pageRoute]?.[questId]) return true;
    }
    return false;
  };

  const result: ChapterProgress[] = chapters.map((chapter) => {
    const total = chapter.questIds.length;
    const completed = chapter.questIds.filter(isDone).length;
    return {
      chapter,
      completedCount: completed,
      totalCount: total,
      isComplete: total > 0 && completed === total,
    };
  });

  return { chapters: result, isHydrated: hydrated };
}
