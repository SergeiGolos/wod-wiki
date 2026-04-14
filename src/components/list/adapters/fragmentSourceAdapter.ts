import type { FragmentSourceEntry } from '@/components/metrics/MetricSourceRow';
import type { IListItem } from '../types';

export function fragmentSourceToListItem(
  entry: FragmentSourceEntry,
  index: number,
): IListItem<FragmentSourceEntry> {
  const label = entry.label ?? `Item ${index}`;
  const duration = entry.duration;
  const durationStr = duration != null ? `${Math.round(duration / 1000)}s` : undefined;

  return {
    id: String(entry.source?.id ?? `frag-${index}`),
    label,
    subtitle: durationStr,
    depth: entry.depth,
    isActive: entry.isLeaf,
    isDisabled: false,
    payload: entry,
  };
}
