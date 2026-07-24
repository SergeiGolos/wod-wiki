import type { FilteredListItem } from '../views/queriable-list/types';

export type ProtoPrBadge = {
  kind: 'first' | 'prev-best' | 'new-pr';
  durationMs: number;
  deltaMs?: number;
};

function isFinitePositiveDuration(item: FilteredListItem): boolean {
  if (item.type !== 'result') return false;
  const duration = item.payload?.data?.duration;
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
}

export function computePrBadges(items: FilteredListItem[]): Map<string, ProtoPrBadge> {
  const badges = new Map<string, ProtoPrBadge>();

  const groups = new Map<string, FilteredListItem[]>();
  for (const item of items) {
    if (!isFinitePositiveDuration(item)) continue;
    const title = (item.title ?? '').trim().toLowerCase();
    if (!title) continue;
    const list = groups.get(title) ?? [];
    list.push(item);
    groups.set(title, list);
  }

  for (const [, group] of groups) {
    const sorted = group.slice().sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
    let runningBest: FilteredListItem | null = null;
    let runningBestIndex = -1;

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const durationMs: number = item.payload.data.duration;

      if (i === 0) {
        badges.set(item.id, { kind: 'first', durationMs });
        runningBest = item;
        runningBestIndex = 0;
        continue;
      }

      if (!runningBest) continue;
      const bestDurationMs: number = runningBest.payload.data.duration;
      if (durationMs < bestDurationMs) {
        const deltaMs = bestDurationMs - durationMs;
        badges.set(item.id, { kind: 'new-pr', durationMs, deltaMs });

        // The record that just got beaten becomes the previous best, unless it
        // is the very first attempt — that keeps its "first attempt" badge.
        if (runningBestIndex !== 0) {
          badges.set(runningBest.id, { kind: 'prev-best', durationMs: bestDurationMs });
        }

        runningBest = item;
        runningBestIndex = i;
      }
    }
  }

  return badges;
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
