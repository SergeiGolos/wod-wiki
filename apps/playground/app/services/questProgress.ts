/**
 * questProgress — localStorage-backed global quest progress ledger.
 *
 * Saves onboarding quest completion progress globally, **namespaced by page
 * route** to prevent quest-id collisions across pages (e.g. two chapters
 * each shipping a `round-1` capstone).
 *
 * Storage shape: `Record<pageRoute, Record<questId, boolean>>`.
 *
 * Maintains monotonic completion in production (markQuestComplete) while
 * permitting toggling (toggleQuestState) for Storybook sandbox debugging.
 */

/** Page-scoped quest progress. */
export type QuestProgress = Record<string, boolean>;

/** Cross-page map: pageRoute → questId → done. */
export type QuestProgressLedger = Record<string, QuestProgress>;

const STORAGE_KEY = 'wodwiki.quests.v1';

/** Read the full cross-page ledger. Returns `{}` on missing/parse errors. */
export function readQuestLedger(): QuestProgressLedger {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as QuestProgressLedger;
    }
  } catch (e) {
    console.error('Failed to read quest progress:', e);
  }
  return {};
}

function writeQuestLedger(ledger: QuestProgressLedger): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch (e) {
    console.error('Failed to write quest progress:', e);
  }
}

/**
 * Read the progress map for a single page route. Returns `{}` if no entries
 * exist for that route — never returns `undefined`.
 */
export function readQuestProgress(pageRoute: string): QuestProgress {
  const ledger = readQuestLedger();
  return ledger[pageRoute] ?? {};
}

/**
 * Write the full progress map for a single page route, replacing any prior
 * entries. Other page routes' progress is preserved.
 */
function writePageProgress(pageRoute: string, progress: QuestProgress): void {
  const ledger = readQuestLedger();
  ledger[pageRoute] = progress;
  writeQuestLedger(ledger);
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

/**
 * Idempotently mark a quest complete on a specific page route. Production
 * path (monotonic).
 */
export function markQuestComplete(pageRoute: string, questId: string): void {
  const progress = readQuestProgress(pageRoute);
  if (progress[questId]) return; // already done

  progress[questId] = true;
  writePageProgress(pageRoute, progress);
}

/**
 * Toggle a quest completion state on a specific page route. Sandbox path
 * (non-monotonic) for Storybook debugging.
 */
export function toggleQuestState(pageRoute: string, questId: string): void {
  const progress = readQuestProgress(pageRoute);
  progress[questId] = !progress[questId];
  writePageProgress(pageRoute, progress);
}
