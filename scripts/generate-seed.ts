/**
 * generate-seed — Phase 1 of the seed-based data unification
 * (docs/prototypes/seed-data-unification.md).
 *
 * Compiles the bundled markdown corpora into versioned seed artifacts under
 * apps/playground/public/seed/:
 *
 *   seed/
 *   ├── manifest.json          ← schema + version + chunk index (small, no-cache)
 *   └── chunks/
 *       └── <id>.<sha256-8>.json   ← immutable, content-hashed row arrays
 *
 * A chunk is a JSON array of `{ path, content }` rows; `path` is the
 * repo-relative POSIX path of the source markdown (the same identity today's
 * `import.meta.glob` keys resolve to), `content` the raw file text. Chunk
 * granularity is one corpus part — `canvas`, `dashboards`, `efforts`,
 * `template`, one chunk per collection/feed slug — so a content edit
 * re-fetches only the chunk that changed.
 *
 * Phase 1 ships dark: nothing at runtime consumes the seed yet. The point of
 * wiring it into the build now is the PARITY GATE — every `.md` file the
 * runtime globs match must land in exactly one chunk, or the build fails.
 * Unknown top-level corpora under `markdown/` are a hard error, so a new
 * directory cannot silently bypass the seed pipeline.
 *
 * Determinism: chunk bytes depend only on corpus content (no timestamps), so
 * unchanged corpora produce byte-identical chunks across builds; the manifest
 * `version` (builtAt epoch ms) is what advances. Re-import (phase 2) compares
 * per-chunk hashes against the stored checkpoint, so a bumped version with
 * identical hashes is a no-op.
 *
 * Runs via `bun scripts/generate-seed.ts` (root `generate:seed`), chained
 * before `vite build` and `vite dev` in the playground package so `public/`
 * always carries a fresh seed. Idempotent: wipes the output dir first.
 */
import { Glob } from 'bun';
import { SEED_SCHEMA } from '@/types/seed';
import type { ManifestChunk, SeedManifest, SeedRow } from '@/types/seed';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';

// ── Layout ────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, '..');
const MARKDOWN_DIR = join(ROOT, 'markdown');
const TEMPLATE_FILE = join(ROOT, 'apps', 'playground', 'app', 'templates', 'new-playground.md');
const DEFAULT_OUT_DIR = join(ROOT, 'apps', 'playground', 'public', 'seed');


// ── Types ─────────────────────────────────────────────────────────────────

// Shared seed shapes (SeedRow / ManifestChunk / SeedManifest / SEED_SCHEMA)
// live in apps/playground/src/types/seed.ts — the single contract between
// this compiler and the runtime importer.

export interface ChunkGroup {
  id: string;
  files: string[];
}


export interface GenerateSeedOptions {
  markdownDir?: string;
  templateFile?: string;
  outDir?: string;
  /** Fixed version for tests; defaults to Date.now(). */
  version?: number;
  /**
   * Root row paths resolve against when reading files and for the template
   * row's relative path. Defaults to the repo root; tests point it at a tmp
   * corpus so generation never touches real files.
   */
  corpusRoot?: string;
}

export interface GenerateSeedResult {
  manifest: SeedManifest;
  outDir: string;
  /** Total md files consumed across all chunks (incl. template). */
  totalFiles: number;
}

// ── Corpus partition ──────────────────────────────────────────────────────

/**
 * Map one `markdown/…` path to its chunk id. Returns null for files outside
 * the known corpora — callers MUST treat that as a parity failure so new
 * content directories cannot bypass the seed.
 */
export function chunkIdFor(relPath: string): string | null {
  const parts = relPath.split('/');
  if (parts[0] !== 'markdown' || parts.length < 2) return null;
  const corpus = parts[1];
  // markdown/<corpus>/<rest…>; a file directly under markdown/ has no corpus.
  if (parts.length === 2) return null;
  const slug = parts[2]?.replace(/\.md$/, '');
  switch (corpus) {
    case 'canvas':
    case 'dashboards':
    case 'efforts':
      return corpus;
    case 'collections':
      return parts.length === 3 ? `collection._root` : `collection.${slug}`;
    case 'feeds':
      return parts.length === 3 ? `feed._root` : `feed.${slug}`;
    default:
      return null;
  }
}

const TEMPLATE_CHUNK_ID = 'template';

// ── Collection ────────────────────────────────────────────────────────────

/** Scan the markdown corpus; returns repo-relative POSIX paths of all .md files. */
export function collectCorpusMarkdown(markdownDir: string): string[] {
  return [...new Glob('**/*.md').scanSync({ cwd: markdownDir, onlyFiles: true })]
    .map((p) => `markdown/${p}`)
    .sort();
}

/** Group markdown corpus paths into chunk groups; throws on paths outside the known corpora. */
export function partitionIntoChunks(paths: string[]): ChunkGroup[] {
  const byId = new Map<string, string[]>();
  for (const p of paths) {
    const id = chunkIdFor(p);
    if (id === null) {
      throw new Error(
        `[generate-seed] Parity failure: '${p}' is not part of any known corpus ` +
        `(canvas | dashboards | efforts | collections | feeds). ` +
        `Extend chunkIdFor() in scripts/generate-seed.ts if this is a new corpus.`,
      );
    }
    const list = byId.get(id);
    if (list) list.push(p);
    else byId.set(id, [p]);
  }
  return [...byId.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, files]) => ({ id, files }));
}

// ── Generation ────────────────────────────────────────────────────────────

function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateSeed(options: GenerateSeedOptions = {}): GenerateSeedResult {
  const markdownDir = options.markdownDir ?? MARKDOWN_DIR;
  const templateFile = options.templateFile ?? TEMPLATE_FILE;
  const outDir = options.outDir ?? DEFAULT_OUT_DIR;
  const version = options.version ?? Date.now();
  const corpusRoot = options.corpusRoot ?? ROOT;
  const paths = collectCorpusMarkdown(markdownDir);
  const groups = partitionIntoChunks(paths);
  if (existsSync(templateFile)) {
    groups.push({
      id: TEMPLATE_CHUNK_ID,
      files: [relative(corpusRoot, templateFile).split('\\').join('/')],
    });
  }
  const chunksDir = join(outDir, 'chunks');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(chunksDir, { recursive: true });

  const manifestChunks: ManifestChunk[] = [];
  let totalFiles = 0;

  for (const { id, files } of groups) {
    const rows: SeedRow[] = files.map((p) => ({
      path: p,
      content: readFileSync(join(corpusRoot, p), 'utf8'),
    }));
    const bytes = Buffer.from(JSON.stringify(rows), 'utf8');
    const sha = sha256Hex(bytes);
    const file = `chunks/${id}.${sha.slice(0, 8)}.json`;
    writeFileSync(join(outDir, file), bytes);
    manifestChunks.push({ id, path: file, sha256: sha, bytes: bytes.length, count: rows.length });
    totalFiles += rows.length;
  }

  const manifest: SeedManifest = {
    schema: SEED_SCHEMA,
    version,
    builtAt: new Date(version).toISOString(),
    chunks: manifestChunks,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  return { manifest, outDir, totalFiles };
}

// ── CLI ───────────────────────────────────────────────────────────────────

function main(): void {
  const started = Date.now();
  const { manifest, outDir, totalFiles } = generateSeed();
  const kb = (n: number): string => `${(n / 1024).toFixed(0)} KB`;
  const totalBytes = manifest.chunks.reduce((s, c) => s + c.bytes, 0);
  console.log(`[generate-seed] schema v${manifest.schema} version ${manifest.version} → ${outDir}`);
  for (const c of manifest.chunks) {
    console.log(`  ${c.id.padEnd(48)} ${String(c.count).padStart(4)} files  ${kb(c.bytes).padStart(8)}`);
  }
  console.log(`[generate-seed] ${manifest.chunks.length} chunks, ${totalFiles} files, ${kb(totalBytes)} total in ${Date.now() - started} ms`);
}

if (import.meta.main) main();
