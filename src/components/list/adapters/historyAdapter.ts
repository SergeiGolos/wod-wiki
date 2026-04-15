import React from 'react';
import { Calendar } from 'lucide-react';
import type { HistoryEntry } from '@/types/history';
import type { IListItem } from '../types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}:00`;
}

export function historyEntryToListItem(entry: HistoryEntry): IListItem<HistoryEntry> {
  const duration = entry.results?.duration;
  const durationStr = duration ? formatDuration(duration) : undefined;
  const dateStr = formatDate(entry.targetDate);

  return {
    id: entry.id,
    label: entry.title || 'Untitled workout',
    subtitle: durationStr ? `${dateStr} · ${durationStr}` : dateStr,
    icon: React.createElement(Calendar, { className: 'w-4 h-4' }),
    group: new Date(entry.targetDate).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    keywords: entry.tags,
    badge: entry.tags.length > 0 ? entry.tags[0] : undefined,
    payload: entry,
  };
}
