/**
 * InMemorySeedSource — test/fixture adapter. Serves a manifest and chunks
 * from plain objects; no network, no storage.
 */
import type { SeedManifest, SeedRow } from '@/types/seed';
import type { ISeedSource } from './ISeedSource';

export class InMemorySeedSource implements ISeedSource {
  constructor(
    private readonly manifest: SeedManifest,
    private readonly chunks: Record<string, SeedRow[]>,
  ) {}

  fetchManifest(): Promise<SeedManifest> {
    return Promise.resolve(this.manifest);
  }

  fetchChunk(path: string): Promise<SeedRow[]> {
    return Promise.resolve(this.chunks[path] ?? []);
  }
}

/** Test spy wrapper — counts chunk fetches so resume/idempotency is observable. */
export class CountingSeedSource implements ISeedSource {
  fetchChunkCalls: string[] = [];
  fetchManifestCalls = 0;

  constructor(private readonly inner: ISeedSource) {}

  fetchManifest(): Promise<SeedManifest> {
    this.fetchManifestCalls += 1;
    return this.inner.fetchManifest();
  }

  fetchChunk(path: string): Promise<SeedRow[]> {
    this.fetchChunkCalls.push(path);
    return this.inner.fetchChunk(path);
  }
}
