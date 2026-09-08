/**
 * The seed-source seam: where compiled seed artifacts come from
 * (docs/prototypes/seed-data-unification.md § Seed Import).
 *
 * Two real adapters ship — HttpSeedSource (static host) and
 * InMemorySeedSource (tests/fixtures) — which is what makes this a seam
 * rather than a hypothetical one.
 */
import type { SeedManifest, SeedRow } from '@/types/seed';

export interface ISeedSource {
  fetchManifest(): Promise<SeedManifest>;
  /** Fetch one chunk's rows by its manifest `path` (e.g. `chunks/canvas.ab12cd34.json`). */
  fetchChunk(path: string): Promise<SeedRow[]>;
}

export class SeedSourceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SeedSourceError';
  }
}

/** Structural validation — a corrupt/stale artifact must fail loudly, not poison Storage. */
export function assertManifest(value: unknown): SeedManifest {
  if (typeof value !== 'object' || value === null) {
    throw new SeedSourceError('seed manifest is not an object');
  }
  const m = value as Partial<SeedManifest>;
  if (
    typeof m.schema !== 'number' ||
    typeof m.version !== 'number' ||
    typeof m.builtAt !== 'string' ||
    !Array.isArray(m.chunks) ||
    m.chunks.some((c) => typeof c?.id !== 'string' || typeof c?.path !== 'string' || typeof c?.sha256 !== 'string')
  ) {
    throw new SeedSourceError('seed manifest failed shape validation');
  }
  return m as SeedManifest;
}

export function assertRows(value: unknown): SeedRow[] {
  if (!Array.isArray(value)) {
    throw new SeedSourceError('seed chunk is not an array');
  }
  for (const row of value) {
    if (typeof row?.path !== 'string' || typeof row?.content !== 'string') {
      throw new SeedSourceError(`seed chunk row failed shape validation: ${String(row?.path)}`);
    }
  }
  return value as SeedRow[];
}
