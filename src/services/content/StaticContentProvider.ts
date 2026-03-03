/**
 * StaticContentProvider — Mutable in-memory provider.
 *
 * Wraps initial content as a HistoryEntry and maintains updates in memory.
 * Used for Storybook demos and ephemeral playground scenarios where
 * full production lifecycles (auto-save, results tracking) are needed
 * without persistent database side-effects.
 */

import type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import { v4 as uuidv4 } from 'uuid';

const STATIC_ID = 'static';

export class StaticContentProvider implements IContentProvider {
  readonly mode: ContentProviderMode = 'static';
  readonly capabilities: ProviderCapabilities = {
    canWrite: true,
    canDelete: false, // Deletion is not typically needed in static mode
    canFilter: false,
    canMultiSelect: false,
    supportsHistory: true, // We support session history (in-memory)
  };

  private entry: HistoryEntry;

  constructor(initialContent: string) {
    const now = Date.now();
    this.entry = {
      id: STATIC_ID,
      title: 'Untitled Workout',
      createdAt: now,
      updatedAt: now,
      targetDate: now,
      rawContent: initialContent,
      tags: [],
      results: undefined,
      extendedResults: [], // Initialize extended results
      schemaVersion: 1,
      type: 'template',
    };
  }

  async getEntries(_query?: EntryQuery): Promise<HistoryEntry[]> {
    return [this.entry];
  }

  async getEntry(_id: string): Promise<HistoryEntry | null> {
    return this.entry;
  }

  async saveEntry(
    entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
  ): Promise<HistoryEntry> {
    // In static mode, "saving" a new entry typically just updates the singleton
    const now = Date.now();
    this.entry = {
      ...entry,
      id: STATIC_ID,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    return this.entry;
  }

  async cloneEntry(_sourceId: string, _targetDate?: number): Promise<HistoryEntry> {
    // Cloning in static mode returns the same entry with a new ID if needed, 
    // but for the singleton provider we'll just return the current state.
    return this.entry;
  }

  async updateEntry(
    _id: string,
    patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'targetDate' | 'clonedIds'>> & { sectionId?: string; resultId?: string }
  ): Promise<HistoryEntry> {
    const now = Date.now();
    
    // Apply most patches directly
    const nextEntry = {
      ...this.entry,
      ...patch,
      updatedAt: now,
    };

    // Special handling for results: append to history instead of overwriting
    if (patch.results) {
        const resultId = patch.resultId || uuidv4();
        const currentResults = this.entry.extendedResults || [];
        
        // Wrap raw results into the WorkoutResult storage format
        const newResult = {
            id: resultId,
            noteId: this.entry.id,
            sectionId: patch.sectionId,
            segmentId: patch.sectionId,
            data: patch.results,
            completedAt: patch.results.endTime || now
        };
        
        nextEntry.results = patch.results; // Keep latest for compat
        nextEntry.extendedResults = [...currentResults, newResult];
    }

    this.entry = nextEntry;
    return this.entry;
  }

  async deleteEntry(_id: string): Promise<void> {
    // No-op for static singleton
  }
}
