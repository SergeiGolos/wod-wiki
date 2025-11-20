import { useMemo } from 'react';
import { MemoryEntry, MemoryGrouping, UseMemoryVisualizationReturn } from '../types/interfaces';

/**
 * Hook for filtering and grouping memory entries with computed statistics
 * Provides efficient memory visualization with search and grouping capabilities
 *
 * @param entries - All memory entries to visualize
 * @param filterText - Text to filter entries by (searches in labels, types, owners)
 * @param groupBy - Grouping strategy for entries
 * @returns Filtered and grouped memory entries with statistics
 */
export function useMemoryVisualization(
  entries: MemoryEntry[],
  filterText: string,
  groupBy: MemoryGrouping
): UseMemoryVisualizationReturn {
  return useMemo(() => {
    // Filter entries based on search text
    const filteredEntries = filterText.trim()
      ? entries.filter(entry =>
          entry.label.toLowerCase().includes(filterText.toLowerCase()) ||
          entry.type.toLowerCase().includes(filterText.toLowerCase()) ||
          (entry.ownerLabel || entry.ownerId).toLowerCase().includes(filterText.toLowerCase()) ||
          entry.valueFormatted.toLowerCase().includes(filterText.toLowerCase())
        )
      : entries;

    // Group entries based on strategy
    const groupedEntries = groupBy === 'none'
      ? new Map([['All Entries', filteredEntries]])
      : groupEntries(filteredEntries, groupBy);

    // Calculate statistics
    const stats = {
      totalEntries: entries.length,
      filteredCount: filteredEntries.length,
      groupCount: groupedEntries.size
    };

    return {
      entries,
      filteredEntries,
      groupedEntries,
      stats
    };
  }, [entries, filterText, groupBy]);
}

/**
 * Groups memory entries by the specified strategy
 */
function groupEntries(entries: MemoryEntry[], groupBy: MemoryGrouping): Map<string, MemoryEntry[]> {
  const groups = new Map<string, MemoryEntry[]>();

  for (const entry of entries) {
    let groupKey: string;

    switch (groupBy) {
      case 'owner':
        groupKey = entry.ownerLabel || entry.ownerId;
        break;
      case 'type':
        groupKey = entry.type;
        break;
      default:
        groupKey = 'Unknown';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(entry);
  }

  return groups;
}
