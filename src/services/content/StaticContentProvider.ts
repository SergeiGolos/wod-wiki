/**
 * StaticContentProvider — Read-only in-memory provider.
 *
 * Wraps a single piece of initial content as a HistoryEntry.
 * All write methods throw — this provider is read-only.
 * Used for Storybook demos and embedded scenarios.
 */

import type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';

const STATIC_ID = 'static';

export class StaticContentProvider implements IContentProvider {
  readonly mode: ContentProviderMode = 'static';
  readonly capabilities: ProviderCapabilities = {
    canWrite: false,
    canDelete: false,
    canFilter: false,
    canMultiSelect: false,
    supportsHistory: false,
  };

  private readonly entry: HistoryEntry;

  constructor(initialContent: string) {
    const now = Date.now();
    this.entry = {
      id: STATIC_ID,
      title: 'Untitled Workout',
      createdAt: now,
      updatedAt: now,
      rawContent: initialContent,
      tags: [],
      schemaVersion: 1,
    };
  }

  async getEntries(_query?: EntryQuery): Promise<HistoryEntry[]> {
    return [this.entry];
  }

  async getEntry(id: string): Promise<HistoryEntry | null> {
    return id === STATIC_ID ? this.entry : null;
  }

  async saveEntry(): Promise<HistoryEntry> {
    throw new Error('Static provider is read-only');
  }

  async updateEntry(): Promise<HistoryEntry> {
    throw new Error('Static provider is read-only');
  }

  async deleteEntry(): Promise<void> {
    throw new Error('Static provider is read-only');
  }
}
