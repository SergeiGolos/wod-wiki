/**
 * SeedImporter tests — ownership rules, checkpointing, idempotency, and
 * crash resume, on the InMemory adapters (no IndexedDB globals).
 * Contract: docs/prototypes/seed-data-unification.md § Ownership rules.
 */
import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import type { SeedManifest, SeedRow } from '@/types/seed';
import { EFFORTS_CHUNK_ID, SEED_SCHEMA, seedSegmentId } from '@/types/seed';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import { effortToDocument } from '@/repositories/effort-markdown';
import { CountingSeedSource, InMemorySeedSource } from './InMemorySeedSource';
import { InMemorySeedStorage } from './SeedImportStorage';
import { seedNoteId, SeedImporter } from './SeedImporter';

const shaOf = (rows: SeedRow[]): string =>
  createHash('sha256').update(JSON.stringify(rows)).digest('hex');

const row = (path: string, content = `content of ${path}`): SeedRow => ({ path, content });

const effortDoc = (slug: string): SeedRow => ({
  path: `markdown/efforts/${slug}.md`,
  content: effortToDocument({
    id: `effort-bundled-${slug}`,
    slug,
    label: slug,
    aliases: [],
    baseAttributes: { met: 5 },
    registrySource: 'bundled',
  } as IEffort),
});

function makeSource(chunks: Record<string, SeedRow[]>, version: number) {
  const manifest: SeedManifest = {
    schema: 2,
    version,
    builtAt: new Date(version).toISOString(),
    chunks: Object.keys(chunks)
      .sort()
      .map((id) => ({
        id,
        path: `chunks/${id}.json`,
        sha256: shaOf(chunks[id]!),
        bytes: JSON.stringify(chunks[id]).length,
        count: chunks[id]!.length,
      })),
  };
  const paths = Object.fromEntries(
    Object.entries(chunks).map(([id, rows]) => [`chunks/${id}.json`, rows]),
  );
  return { source: new InMemorySeedSource(manifest, paths), manifest };
}

async function importAll(storage: InMemorySeedStorage, source: InMemorySeedSource) {
  const counting = new CountingSeedSource(source);
  const result = await new SeedImporter(storage, counting).applyAll();
  return { result, counting };
}

describe('SeedImporter', () => {
  it('fresh import materializes notes + segments + checkpoint with provenance', async () => {
    const { source } = makeSource(
      {
        canvas: [row('markdown/canvas/a.md', '# A')],
        'collection.girls': [row('markdown/collections/girls/fran.md'), row('markdown/collections/girls/annie.md')],
      },
      1000,
    );
    const storage = new InMemorySeedStorage();
    const { result, counting } = await importAll(storage, source);

    expect(result.status).toBe('imported');
    expect(result.appliedChunks).toBe(2);
    expect(result.totalNotes).toBe(3);
    expect(counting.fetchChunkCalls).toHaveLength(2);

    const fran = storage.allNotes().find((n) => n.slug === 'markdown/collections/girls/fran.md');
    expect(fran).toBeDefined();
    expect(fran!.seedOrigin).toBe('seed');
    expect(fran!.seedVersion).toBe(1000);
    expect(fran!.seedChunkId).toBe('collection.girls');
    expect(fran!.catalog).toBe('girls');
    expect(fran!.id).toBe(await seedNoteId('markdown/collections/girls/fran.md'));
    expect(fran!.createdAt).toBe(1000);

    const canvasNote = storage.allNotes().find((n) => n.slug === 'markdown/canvas/a.md');
    expect(canvasNote!.catalog).toBeUndefined();

    const segment = storage.allSegments().find((s) => s.noteId === fran!.id);
    expect(segment).toMatchObject({
      id: seedSegmentId(fran!.id),
      version: 1,
      rawContent: 'content of markdown/collections/girls/fran.md',
      dataType: 'markdown',
    });

    const meta = await storage.getSeedMeta();
    expect(meta!.seedVersion).toBe(1000);
    expect(meta!.chunks['collection.girls']!.noteIds).toHaveLength(2);
  });

  it('seed note ids are deterministic for the same path', async () => {
    expect(await seedNoteId('markdown/canvas/a.md')).toBe(await seedNoteId('markdown/canvas/a.md'));
    expect(await seedNoteId('markdown/canvas/a.md')).not.toBe(await seedNoteId('markdown/canvas/b.md'));
  });

  it('re-import of an unchanged manifest is a no-op with zero chunk fetches', async () => {
    const { source } = makeSource({ canvas: [row('markdown/canvas/a.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, source);

    const { result, counting } = await importAll(storage, source);
    expect(result.status).toBe('current');
    expect(counting.fetchChunkCalls).toHaveLength(0);
    expect(storage.allNotes()).toHaveLength(1);
  });

  it('a changed chunk is refetched; unchanged chunks are left alone', async () => {
    const v1 = makeSource({ canvas: [row('markdown/canvas/a.md')], efforts: [row('markdown/efforts/e.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    const v2 = makeSource({ canvas: [row('markdown/canvas/a.md', 'edited')], efforts: [row('markdown/efforts/e.md')] }, 2000);
    const { result, counting } = await importAll(storage, v2.source);

    expect(result.status).toBe('imported');
    expect(result.appliedChunks).toBe(1);
    expect(counting.fetchChunkCalls).toEqual(['chunks/canvas.json']);
    const edited = storage.allNotes().find((n) => n.slug === 'markdown/canvas/a.md');
    const segment = storage.allSegments().find((s) => s.noteId === edited!.id);
    expect(segment!.rawContent).toBe('edited');
    expect(edited!.seedVersion).toBe(2000);
    expect(storage.allNotes()).toHaveLength(2);
  });

  it('never touches a user-owned row — not overwrite, not delete', async () => {
    const v1 = makeSource({ canvas: [row('markdown/canvas/a.md'), row('markdown/canvas/b.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    // Simulate user edits: retitle A (stays in corpus), and B (will vanish).
    const noteA = storage.allNotes().find((n) => n.slug === 'markdown/canvas/a.md')!;
    const noteB = storage.allNotes().find((n) => n.slug === 'markdown/canvas/b.md')!;
    await storage.applyChunk({
      notes: [
        { ...noteA, title: 'My A', seedOrigin: 'user' },
        { ...noteB, title: 'My B', seedOrigin: 'user' },
      ],
      segments: [],
      efforts: [],
      deleteNoteIds: [],
      deleteEffortSlugs: [],
      blocks: [],
      deleteBlockIds: [],
      meta: (await storage.getSeedMeta())!,
    });

    const v2 = makeSource({ canvas: [row('markdown/canvas/a.md', 'upstream edit')] }, 2000);
    const { result } = await importAll(storage, v2.source);

    expect(result.skippedUserOwned).toBe(1);
    const afterA = storage.allNotes().find((n) => n.id === noteA.id)!;
    expect(afterA.title).toBe('My A'); // not overwritten
    const afterB = storage.allNotes().find((n) => n.id === noteB.id)!;
    expect(afterB).toBeDefined(); // vanished from corpus, still not deleted
    expect(afterB.title).toBe('My B');
    expect(result.deleted).toBe(0);
    // The user-owned row is dropped from the checkpoint's owned set.
    expect((await storage.getSeedMeta())!.chunks['canvas']!.noteIds).toEqual([noteA.id]);
  });

  it('deletes vanished seed-origin rows (note + segment) and records it', async () => {
    const v1 = makeSource({ canvas: [row('markdown/canvas/a.md'), row('markdown/canvas/b.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);
    const noteB = storage.allNotes().find((n) => n.slug === 'markdown/canvas/b.md')!;

    const v2 = makeSource({ canvas: [row('markdown/canvas/a.md')] }, 2000);
    const { result } = await importAll(storage, v2.source);

    expect(result.deleted).toBe(1);
    expect(storage.allNotes().find((n) => n.id === noteB.id)).toBeUndefined();
    expect(storage.allSegments().find((s) => s.noteId === noteB.id)).toBeUndefined();
    expect((await storage.getSeedMeta())!.chunks['canvas']!.noteIds).toHaveLength(1);
  });

  it('resumes after a crash: already-applied chunk shas are skipped, version still advances', async () => {
    const v1 = makeSource({ a: [row('markdown/a.md')], b: [row('markdown/b.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    // Simulate a crash after chunk 'a' but before the final version bump.
    const meta = (await storage.getSeedMeta())!;
    meta.seedVersion = 0;
    await storage.putSeedMeta(meta);

    const v2 = makeSource({ a: [row('markdown/a.md')], b: [row('markdown/b.md', 'new')] }, 2000);
    const { result, counting } = await importAll(storage, v2.source);

    expect(result.status).toBe('imported');
    expect(counting.fetchChunkCalls).toEqual(['chunks/b.json']);
    expect((await storage.getSeedMeta())!.seedVersion).toBe(2000);
  });

  it('efforts chunk materializes IEffort records with seed provenance', async () => {
    const { source } = makeSource(
      { [EFFORTS_CHUNK_ID]: [effortDoc('air-squat'), effortDoc('burpee')] },
      1000,
    );
    const storage = new InMemorySeedStorage();
    const { result } = await importAll(storage, source);

    expect(result.totalEfforts).toBe(2);
    const efforts = storage.allEfforts();
    expect(efforts).toHaveLength(2);
    for (const effort of efforts) {
      expect(effort.registrySource).toBe('bundled');
      expect(effort.id).toBe(`effort-bundled-${effort.slug}`);
    }
    // Notes are still the content identity for the same rows.
    expect(storage.allNotes()).toHaveLength(2);
  });

  it('never overwrites or deletes a user effort at a seed slug', async () => {
    const v1 = makeSource({ [EFFORTS_CHUNK_ID]: [effortDoc('air-squat')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    // Simulate a user record that re-used the seed slug (hand-renamed clone).
    await storage.applyChunk({
      notes: [],
      segments: [],
      efforts: [{ id: 'effort-user-x', slug: 'air-squat', label: 'My Squat', aliases: [], baseAttributes: { met: 9 }, registrySource: 'user' }],
      deleteNoteIds: [],
      deleteEffortSlugs: [],
      blocks: [],
      deleteBlockIds: [],
      meta: (await storage.getSeedMeta())!,
    });

    const v2 = makeSource({ [EFFORTS_CHUNK_ID]: [effortDoc('air-squat')] }, 2000);
    await importAll(storage, v2.source);

    const effort = await storage.getEffort('air-squat');
    expect(effort!.registrySource).toBe('user');
    expect(effort!.label).toBe('My Squat');
  });

  it('deletes a vanished effort only when it is still seed-owned', async () => {
    const v1 = makeSource({ [EFFORTS_CHUNK_ID]: [effortDoc('air-squat'), effortDoc('burpee')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    // User-clone burpee before it vanishes upstream.
    await storage.applyChunk({
      notes: [],
      segments: [],
      efforts: [{ id: 'effort-user-b', slug: 'burpee', label: 'My Burpee', aliases: [], baseAttributes: { met: 8 }, registrySource: 'user' }],
      deleteNoteIds: [],
      deleteEffortSlugs: [],
      blocks: [],
      deleteBlockIds: [],
      meta: (await storage.getSeedMeta())!,
    });

    const v2 = makeSource({ [EFFORTS_CHUNK_ID]: [effortDoc('air-squat')] }, 2000);
    const { result } = await importAll(storage, v2.source);

    expect(result.totalEfforts).toBe(1);
    expect(await storage.getEffort('burpee')).toBeDefined(); // user-owned → kept
    expect(storage.allEfforts().map((e) => e.slug)).toEqual(['air-squat', 'burpee']);
  });

  it('re-applies every chunk when the stored checkpoint schema is older', async () => {
    const v1 = makeSource({ canvas: [row('markdown/canvas/a.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    const meta = (await storage.getSeedMeta())!;
    meta.schema = 1; // pre-v2 checkpoint
    await storage.putSeedMeta(meta);

    const { result, counting } = await importAll(storage, v1.source); // unchanged manifest
    expect(result.status).toBe('imported');
    expect(counting.fetchChunkCalls).toEqual(['chunks/canvas.json']);
    expect((await storage.getSeedMeta())!.schema).toBe(SEED_SCHEMA);
  });
});

describe('SeedImporter manual re-sync (forceAll)', () => {
  it('re-applies an unchanged manifest when forced, preserving user rows', async () => {
    const v1 = makeSource({ canvas: [row('markdown/canvas/a.md')] }, 1000);
    const storage = new InMemorySeedStorage();
    await importAll(storage, v1.source);

    // Simulate a user edit over the seed row.
    const noteA = storage.allNotes().find((n) => n.slug === 'markdown/canvas/a.md')!;
    await storage.applyChunk({
      notes: [{ ...noteA, title: 'My A', seedOrigin: 'user' }],
      segments: [],
      efforts: [],
      blocks: [],
      deleteNoteIds: [],
      deleteEffortSlugs: [],
      deleteBlockIds: [],
      meta: (await storage.getSeedMeta())!,
    });

    // Same manifest content, same version — force re-applies anyway.
    const counting = new CountingSeedSource(v1.source);
    const result = await new SeedImporter(storage, counting).applyAll({ forceAll: true });

    expect(result.status).toBe('imported');
    expect(result.appliedChunks).toBe(1);
    expect(result.skippedUserOwned).toBe(1);
    // The user-owned row survived untouched.
    const after = storage.allNotes().find((n) => n.slug === 'markdown/canvas/a.md');
    expect(after?.title).toBe('My A');
    expect(after?.seedOrigin).toBe('user');
  });
});
