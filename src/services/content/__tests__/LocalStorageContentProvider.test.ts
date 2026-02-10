import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalStorageContentProvider } from '../LocalStorageContentProvider';

// Mock localStorage
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('LocalStorageContentProvider', () => {
  let provider: LocalStorageContentProvider;
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    // Replace global localStorage with mock
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    provider = new LocalStorageContentProvider();
  });

  it('should have mode "history"', () => {
    expect(provider.mode).toBe('history');
  });

  it('should have full capabilities', () => {
    expect(provider.capabilities.canWrite).toBe(true);
    expect(provider.capabilities.canDelete).toBe(true);
    expect(provider.capabilities.canFilter).toBe(true);
    expect(provider.capabilities.canMultiSelect).toBe(true);
    expect(provider.capabilities.supportsHistory).toBe(true);
  });

  describe('saveEntry', () => {
    it('should save an entry and return it with id, timestamps, and schemaVersion', async () => {
      const before = Date.now();
      const entry = await provider.saveEntry({
        title: 'Fran',
        rawContent: '# Fran\n21-15-9',
        tags: ['benchmark'],
      });
      const after = Date.now();

      expect(entry.id).toBeTruthy();
      expect(entry.title).toBe('Fran');
      expect(entry.rawContent).toBe('# Fran\n21-15-9');
      expect(entry.tags).toEqual(['benchmark']);
      expect(entry.schemaVersion).toBe(1);
      expect(entry.createdAt).toBeGreaterThanOrEqual(before);
      expect(entry.createdAt).toBeLessThanOrEqual(after);
      expect(entry.updatedAt).toBe(entry.createdAt);
    });
  });

  describe('getEntry', () => {
    it('should retrieve a saved entry', async () => {
      const saved = await provider.saveEntry({
        title: 'Fran',
        rawContent: '# Fran',
        tags: [],
      });

      const retrieved = await provider.getEntry(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.title).toBe('Fran');
    });

    it('should return null for non-existent entry', async () => {
      const entry = await provider.getEntry('non-existent');
      expect(entry).toBeNull();
    });
  });

  describe('getEntries', () => {
    it('should return all entries sorted by updatedAt desc', async () => {
      const e1 = await provider.saveEntry({ title: 'A', rawContent: '', tags: [] });
      const e2 = await provider.saveEntry({ title: 'B', rawContent: '', tags: [] });
      const e3 = await provider.saveEntry({ title: 'C', rawContent: '', tags: [] });

      const entries = await provider.getEntries();
      expect(entries).toHaveLength(3);
      // Newest first
      expect(entries[0].updatedAt).toBeGreaterThanOrEqual(entries[1].updatedAt);
      expect(entries[1].updatedAt).toBeGreaterThanOrEqual(entries[2].updatedAt);
    });

    it('should filter by dateRange', async () => {
      const now = Date.now();
      // Save entries at different "times" by manually setting updatedAt
      const old = await provider.saveEntry({ title: 'Old', rawContent: '', tags: [] });
      const recent = await provider.saveEntry({ title: 'Recent', rawContent: '', tags: [] });

      // Manually set old entry's updatedAt to 10 days ago
      const oldEntry = await provider.getEntry(old.id);
      if (oldEntry) {
        const modified = { ...oldEntry, updatedAt: now - 10 * 86_400_000 };
        mockStorage.setItem(`wodwiki:history:${old.id}`, JSON.stringify(modified));
      }

      const entries = await provider.getEntries({
        dateRange: { start: now - 86_400_000, end: now + 86_400_000 },
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Recent');
    });

    it('should filter by daysBack', async () => {
      const now = Date.now();
      const e1 = await provider.saveEntry({ title: 'Today', rawContent: '', tags: [] });
      const e2 = await provider.saveEntry({ title: 'Old', rawContent: '', tags: [] });

      // Set e2 to 30 days ago
      const entry2 = await provider.getEntry(e2.id);
      if (entry2) {
        const modified = { ...entry2, updatedAt: now - 30 * 86_400_000 };
        mockStorage.setItem(`wodwiki:history:${e2.id}`, JSON.stringify(modified));
      }

      const entries = await provider.getEntries({ daysBack: 7 });
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Today');
    });

    it('should filter by tags (entry must have ALL specified tags)', async () => {
      await provider.saveEntry({ title: 'A', rawContent: '', tags: ['benchmark', 'couplet'] });
      await provider.saveEntry({ title: 'B', rawContent: '', tags: ['benchmark'] });
      await provider.saveEntry({ title: 'C', rawContent: '', tags: ['chipper'] });

      const entries = await provider.getEntries({ tags: ['benchmark'] });
      expect(entries).toHaveLength(2);

      const both = await provider.getEntries({ tags: ['benchmark', 'couplet'] });
      expect(both).toHaveLength(1);
      expect(both[0].title).toBe('A');
    });

    it('should apply limit and offset for pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await provider.saveEntry({ title: `Entry ${i}`, rawContent: '', tags: [] });
      }

      const page1 = await provider.getEntries({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await provider.getEntries({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await provider.getEntries({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
    });

    it('should skip entries with invalid JSON gracefully', async () => {
      await provider.saveEntry({ title: 'Valid', rawContent: '', tags: [] });
      mockStorage.setItem('wodwiki:history:bad', '{invalid json}');

      const entries = await provider.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Valid');
    });
  });

  describe('updateEntry', () => {
    it('should update fields and bump updatedAt', async () => {
      const saved = await provider.saveEntry({
        title: 'Original',
        rawContent: '# Original',
        tags: ['old'],
      });
      const originalCreatedAt = saved.createdAt;

      // Small delay to ensure updatedAt differs
      await new Promise(r => setTimeout(r, 5));

      const updated = await provider.updateEntry(saved.id, {
        title: 'Updated',
        tags: ['new'],
      });

      expect(updated.title).toBe('Updated');
      expect(updated.tags).toEqual(['new']);
      expect(updated.rawContent).toBe('# Original'); // unchanged
      expect(updated.createdAt).toBe(originalCreatedAt); // preserved
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalCreatedAt);
    });

    it('should throw for non-existent entry', async () => {
      await expect(
        provider.updateEntry('non-existent', { title: 'X' })
      ).rejects.toThrow('Entry not found: non-existent');
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      const saved = await provider.saveEntry({
        title: 'ToDelete',
        rawContent: '',
        tags: [],
      });

      await provider.deleteEntry(saved.id);

      const entry = await provider.getEntry(saved.id);
      expect(entry).toBeNull();
    });

    it('should not throw for non-existent entry', async () => {
      await expect(provider.deleteEntry('non-existent')).resolves.toBeUndefined();
    });
  });
});
