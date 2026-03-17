import { describe, it, expect } from 'bun:test';
import { StaticContentProvider } from '../StaticContentProvider';

describe('StaticContentProvider', () => {
  const content = '# Test Workout\n\n```wod\n10:00 Run\n```';

  it('should have mode "static"', () => {
    const provider = new StaticContentProvider(content);
    expect(provider.mode).toBe('static');
  });

  it('should have mutable in-memory capabilities', () => {
    const provider = new StaticContentProvider(content);
    expect(provider.capabilities.canWrite).toBe(true);
    expect(provider.capabilities.canDelete).toBe(false);
    expect(provider.capabilities.canFilter).toBe(false);
    expect(provider.capabilities.canMultiSelect).toBe(false);
    expect(provider.capabilities.supportsHistory).toBe(true);
  });

  it('getEntries should return a single entry', async () => {
    const provider = new StaticContentProvider(content);
    const entries = await provider.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('static');
    expect(entries[0].rawContent).toBe(content);
    expect(entries[0].schemaVersion).toBe(1);
  });

  it('getEntry should return entry for id "static"', async () => {
    const provider = new StaticContentProvider(content);
    const entry = await provider.getEntry('static');
    expect(entry).not.toBeNull();
    expect(entry!.rawContent).toBe(content);
  });

  it('getEntry should return the singleton entry for any id', async () => {
    const provider = new StaticContentProvider(content);
    const entry = await provider.getEntry('unknown-id');
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('static');
  });

  it('saveEntry should update the singleton entry', async () => {
    const provider = new StaticContentProvider(content);
    const saved = await provider.saveEntry({ title: 'X', rawContent: 'new content', tags: [] } as any);
    expect(saved.id).toBe('static');
    expect(saved.rawContent).toBe('new content');
    const fetched = await provider.getEntry('static');
    expect(fetched!.rawContent).toBe('new content');
  });

  it('updateEntry should patch the singleton entry', async () => {
    const provider = new StaticContentProvider(content);
    const updated = await provider.updateEntry('static', { title: 'New' });
    expect(updated.title).toBe('New');
    expect(updated.rawContent).toBe(content);
  });

  it('deleteEntry should be a no-op', async () => {
    const provider = new StaticContentProvider(content);
    await provider.deleteEntry('static');
    const entry = await provider.getEntry('static');
    expect(entry).not.toBeNull();
  });
});
