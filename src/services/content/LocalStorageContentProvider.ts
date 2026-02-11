/**
 * LocalStorageContentProvider — Read-write localStorage provider.
 *
 * Persists completed workouts to localStorage under `wodwiki:history:{id}`.
 * Supports date-based queries, tag filtering, and pagination.
 * Coexists with the legacy `LocalStorageProvider` which uses `wodwiki:results:*`.
 */

import type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';

const KEY_PREFIX = 'wodwiki:history:';
const SCHEMA_VERSION = 1;

function generateId(): string {
  return crypto.randomUUID();
}

export class LocalStorageContentProvider implements IContentProvider {
  readonly mode: ContentProviderMode = 'history';
  readonly capabilities: ProviderCapabilities = {
    canWrite: true,
    canDelete: true,
    canFilter: true,
    canMultiSelect: true,
    supportsHistory: true,
  };

  async getEntries(query?: EntryQuery): Promise<HistoryEntry[]> {
    const entries: HistoryEntry[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as HistoryEntry;
        if (!parsed.id || typeof parsed.createdAt !== 'number') continue;
        entries.push(parsed);
      } catch {
        // Skip entries with invalid JSON (graceful degradation)
      }
    }

    let filtered = entries;

    if (query) {
      // Convert daysBack to dateRange
      let dateRange = query.dateRange;
      if (!dateRange && query.daysBack != null) {
        const now = Date.now();
        dateRange = { start: now - query.daysBack * 86_400_000, end: now };
      }

      // Filter by date range (using updatedAt)
      if (dateRange) {
        filtered = filtered.filter(
          e => e.updatedAt >= dateRange!.start && e.updatedAt <= dateRange!.end
        );
      }

      // Filter by tags (entry must have ALL specified tags)
      if (query.tags && query.tags.length > 0) {
        filtered = filtered.filter(e =>
          query.tags!.every(tag => e.tags.includes(tag))
        );
      }
    }

    // Sort by updatedAt desc (newest first)
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply offset and limit
    if (query) {
      const offset = query.offset ?? 0;
      const limit = query.limit ?? filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  async getEntry(id: string): Promise<HistoryEntry | null> {
    try {
      // 1. Try direct ID lookup
      const raw = localStorage.getItem(`${KEY_PREFIX}${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry;
        if (parsed.id && typeof parsed.createdAt === 'number') return parsed;
      }

      // 2. Fallback: Search by "name" (title) matches
      // This supports friendly URLs like /note/annie/plan
      const allEntries = await this.getEntries();
      const match = allEntries.find(e =>
        e.title.toLowerCase() === id.toLowerCase() ||
        e.title.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase()
      );

      return match || null;
    } catch {
      return null;
    }
  }

  async saveEntry(
    data: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> & { id?: string }
  ): Promise<HistoryEntry> {
    const now = Date.now();
    const entry: HistoryEntry = {
      ...data,
      id: data.id || generateId(),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    };
    localStorage.setItem(`${KEY_PREFIX}${entry.id}`, JSON.stringify(entry));
    return entry;
  }

  async updateEntry(
    id: string,
    patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title'>>
  ): Promise<HistoryEntry> {
    const existing = await this.getEntry(id);
    if (!existing) {
      throw new Error(`Entry not found: ${id}`);
    }
    const updated: HistoryEntry = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };
    localStorage.setItem(`${KEY_PREFIX}${id}`, JSON.stringify(updated));
    return updated;
  }

  async deleteEntry(id: string): Promise<void> {
    localStorage.removeItem(`${KEY_PREFIX}${id}`);
  }
}
