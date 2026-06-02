import React from 'react';
import { describe, expect, it } from 'bun:test';
import {
  BeakerIcon,
  BookOpenIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { historyEntryToListItem } from './historyAdapter';
import type { HistoryEntry } from '@/types/history';

const baseEntry: HistoryEntry = {
  id: 'entry-1',
  title: '',
  createdAt: new Date('2026-04-27T14:30:22.481Z').getTime(),
  updatedAt: new Date('2026-04-27T14:30:22.481Z').getTime(),
  targetDate: new Date('2026-04-27T14:30:22.481Z').getTime(),
  rawContent: '',
  tags: [],
  schemaVersion: 1,
};

function iconType(item: ReturnType<typeof historyEntryToListItem>) {
  return (item.icon as React.ReactElement).type;
}

describe('historyEntryToListItem', () => {
  it('uses a formatted timestamp label and playground icon for untitled playground entries', () => {
    const item = historyEntryToListItem({
      ...baseEntry,
      type: 'playground',
    });

    expect(item.label).toBe('Playground – Apr 27, 2026 2:30 PM');
    expect(iconType(item)).toBe(BeakerIcon);
  });

  it('keeps the existing untitled workout fallback and note icon for notes', () => {
    const item = historyEntryToListItem({
      ...baseEntry,
      type: 'note',
    });

    expect(item.label).toBe('Untitled workout');
    expect(iconType(item)).toBe(BookOpenIcon);
  });

  it('uses a template icon for template entries', () => {
    const item = historyEntryToListItem({
      ...baseEntry,
      type: 'template',
    });

    expect(iconType(item)).toBe(DocumentDuplicateIcon);
  });
});
