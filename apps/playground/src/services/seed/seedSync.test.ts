/** seedSync orchestrator: flag gate, fast path, claim, decision, broadcast. */
import { describe, expect, it } from 'bun:test';
import type { SeedMetaRecord, SeedRow } from '@/types/seed';
import { emptySeedMeta } from '@/types/seed';
import { CountingSeedSource, InMemorySeedSource } from './InMemorySeedSource';
import { InMemorySeedStorage } from './SeedImportStorage';
import { isSeedImportEnabled, runSeedSync, SEED_BROADCAST_CHANNEL, SEED_IMPORT_FLAG } from './seedSync';

const row = (path: string): SeedRow => ({ path, content: `content of ${path}` });

function source(version: number): InMemorySeedSource {
  return new InMemorySeedSource(
    {
      schema: 1,
      version,
      builtAt: new Date(version).toISOString(),
      chunks: [{ id: 'canvas', path: 'chunks/canvas.json', sha256: 'cafe'.repeat(16), bytes: 1, count: 1 }],
    },
    { 'chunks/canvas.json': [row('markdown/canvas/a.md')] },
  );
}

const stored = (patch: Partial<SeedMetaRecord>): SeedMetaRecord => ({ ...emptySeedMeta(), ...patch });

describe('runSeedSync', () => {
  it('is disabled unless the flag is on', async () => {
    const counting = new CountingSeedSource(source(1000));
    const outcome = await runSeedSync({
      source: counting,
      storage: new InMemorySeedStorage(),
      isEnabled: () => false,
    });
    expect(outcome).toBe('disabled');
    expect(counting.fetchManifestCalls).toBe(0);
  });

  it('takes the skip-fetch fast path when stored === embedded', async () => {
    const counting = new CountingSeedSource(source(1000));
    const storage = new InMemorySeedStorage();
    await storage.putSeedMeta(stored({ seedVersion: 1000 }));
    const outcome = await runSeedSync({
      source: counting,
      storage,
      embeddedVersion: 1000,
      isEnabled: () => true,
    });
    expect(outcome).toBe('current');
    expect(counting.fetchManifestCalls).toBe(0);
  });

  it('reports busy while another tab holds a fresh claim', async () => {
    const storage = new InMemorySeedStorage();
    await storage.putSeedMeta(stored({ claim: { owner: 'other-tab', at: Date.now() } }));
    const outcome = await runSeedSync({
      source: source(2000),
      storage,
      embeddedVersion: 1000,
      owner: 'this-tab',
      now: () => 1000,
      isEnabled: () => true,
    });
    expect(outcome).toBe('busy');
  });

  it('refuses a server rollback without importing', async () => {
    const storage = new InMemorySeedStorage();
    await storage.putSeedMeta(stored({ seedVersion: 5000 }));
    const outcome = await runSeedSync({
      source: source(1000),
      storage,
      embeddedVersion: 1000,
      isEnabled: () => true,
    });
    expect(outcome).toBe('server-stale');
    expect(storage.allNotes()).toHaveLength(0);
  });

  it('imports, releases its claim, and broadcasts the new version', async () => {
    const storage = new InMemorySeedStorage();
    const broadcasts: unknown[] = [];
    const outcome = await runSeedSync({
      source: source(1000),
      storage,
      embeddedVersion: 0,
      owner: 'tab-1',
      isEnabled: () => true,
      broadcast: (m) => broadcasts.push(m),
    });
    expect(outcome).toBe('imported');
    expect(storage.allNotes()).toHaveLength(1);
    const meta = await storage.getSeedMeta();
    expect(meta!.seedVersion).toBe(1000);
    expect(meta!.claim).toBeNull();
    expect(broadcasts).toEqual([{ kind: 'seed-imported', version: 1000 }]);
  });

  it('releases the claim even when the import throws', async () => {
    const storage = new InMemorySeedStorage();
    const outcome = await runSeedSync({
      source: {
        fetchManifest: () =>
          Promise.resolve({
            schema: 1,
            version: 1000,
            builtAt: '',
            chunks: [{ id: 'canvas', path: 'chunks/canvas.json', sha256: 'a', bytes: 1, count: 1 }],
          }),
        fetchChunk: () => Promise.reject(new Error('chunk fetch blew up')),
      },
      storage,
      embeddedVersion: 0,
      isEnabled: () => true,
    });
    expect(outcome).toBe('error');
    expect((await storage.getSeedMeta())!.claim).toBeNull();
    expect(SEED_BROADCAST_CHANNEL).toBe('wodwiki.seed');
  });
});

describe('isSeedImportEnabled (default-on with opt-out)', () => {
  it('runs unless localStorage flag is explicitly 0', () => {
    localStorage.removeItem(SEED_IMPORT_FLAG);
    expect(isSeedImportEnabled()).toBe(true);
    localStorage.setItem(SEED_IMPORT_FLAG, '0');
    expect(isSeedImportEnabled()).toBe(false);
    localStorage.setItem(SEED_IMPORT_FLAG, '1');
    expect(isSeedImportEnabled()).toBe(true);
    localStorage.removeItem(SEED_IMPORT_FLAG);
  });
});
