/**
 * questProgress — localStorage-backed global quest progress ledger.
 *
 * Saves onboarding quest completion progress globally keyed by `[questId]`.
 * This allows cross-page events (e.g. running a workout or opening a review)
 * to mark quests complete globally, which then reflects in onboarding banners
 * on other page routes.
 *
 * Maintains monotonic completion in production (markQuestComplete) while
 * permitting toggling (toggleQuestState) for Storybook sandbox debugging.
 */

export type QuestProgress = Record<string, boolean>;

const STORAGE_KEY = 'wodwiki.quests.v1';

export function readQuestProgress(): QuestProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as QuestProgress;
    }
  } catch (e) {
    console.error('Failed to read quest progress:', e);
  }
  return {};
}

export function writeQuestProgress(progress: QuestProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to write quest progress:', e);
  }
}

/**
 * Idempotently mark a quest complete. Production path (monotonic).
 */
export function markQuestComplete(questId: string): void {
  const progress = readQuestProgress();
  if (progress[questId]) return; // already done

  progress[questId] = true;
  writeQuestProgress(progress);

  // Notify other hooks / tabs of the progress change
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

/**
 * Toggle a quest completion state. Sandbox path (non-monotonic).
 */
export function toggleQuestState(questId: string): void {
  const progress = readQuestProgress();
  progress[questId] = !progress[questId];
  writeQuestProgress(progress);

  // Notify other hooks / tabs of the progress change
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}
