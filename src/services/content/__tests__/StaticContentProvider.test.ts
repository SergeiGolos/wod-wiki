import { describe, it, expect } from 'bun:test';
import { StaticContentProvider } from '../StaticContentProvider';

describe('StaticContentProvider', () => {
  const content = '# Test Workout\n\n```wod\n10:00 Run\n```';

  it('should have mode "static"', () => {
    const provider = new StaticContentProvider(content);
    expect(provider.mode).toBe('static');
  });

  it('should have read-only capabilities', () => {
    const provider = new StaticContentProvider(content);
    expect(provider.capabilities.canWrite).toBe(false);
    expect(provider.capabilities.canDelete).toBe(false);
    expect(provider.capabilities.canFilter).toBe(false);
    expect(provider.capabilities.canMultiSelect).toBe(false);
    expect(provider.capabilities.supportsHistory).toBe(false);
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

  it('getEntry should return null for unknown id', async () => {
    const provider = new StaticContentProvider(content);
    const entry = await provider.getEntry('unknown-id');
    expect(entry).toBeNull();
  });

  it('saveEntry should throw read-only error', async () => {
    const provider = new StaticContentProvider(content);
    await expect(
      provider.saveEntry({ title: 'X', rawContent: '', tags: [] })
    ).rejects.toThrow('Static provider is read-only');
  });

  it('updateEntry should throw read-only error', async () => {
    const provider = new StaticContentProvider(content);
    await expect(
      provider.updateEntry('static', { title: 'New' })
    ).rejects.toThrow('Static provider is read-only');
  });

  it('deleteEntry should throw read-only error', async () => {
    const provider = new StaticContentProvider(content);
    await expect(
      provider.deleteEntry('static')
    ).rejects.toThrow('Static provider is read-only');
  });
});
