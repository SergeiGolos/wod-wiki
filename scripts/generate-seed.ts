/**
 * generate-seed — the seed compiler (docs/prototypes/seed-data-unification.md
 * § Module 1).
 *
 * Compiles the bundled markdown corpora into versioned seed artifacts under
 * apps/playground/public/seed/:
 *
 *   seed/
 *   ├── manifest.json          ← schema + version + chunk index (small, no-cache)
 *   └── chunks/
 *       └── <id>.<sha256-8>.json   ← immutable, content-hashed row arrays
 *
 * Notes chunks are JSON arrays of `{ path, content }` rows; `path` is the
 * repo-relative POSIX path of the source markdown, `content` the raw file
 * text. Chunk granularity is one corpus part — `canvas`, `dashboards`,
 * `efforts`, `template`, one chunk per collection/feed slug — so a content
 * edit re-fetches only the chunk that changed.
 *
 * `block-index.<n>` chunks (kind `'block-index'`) carry precomputed
 * BlockIndexRow[] rows for the collections/feeds corpus — the port of the
 * retired scripts/generate-static-block-index.ts — so the runtime importer
 * can populate the `block_index` store directly and the Query Service reads
 * one store.
 *
 * The PARITY GATE: every `.md` file under `markdown/` must land in exactly
 * one notes chunk, or the build fails. Unknown top-level corpora are a hard
 * error, so a new directory cannot silently bypass the seed pipeline.
 *
 * Determinism: chunk bytes depend only on corpus content (block-index
 * created-at derives from git history, so it shifts only when history does);
 * the manifest `version` (builtAt epoch ms) is what advances. Re-import
 * compares per-chunk hashes against the stored checkpoint, so a bumped
 * version with identical hashes is a no-op.
 *
 * Runs via `bun scripts/generate-seed.ts` (root `generate:seed`), chained
 * before `vite build` and `vite dev` in the playground package so `public/`
 * always carries a fresh seed. Idempotent: wipes the output dir first.
 */
import { Glob } from 'bun';
import { BLOCK_INDEX_CHUNK_PREFIX, SEED_SCHEMA } from '@/types/seed';
import type { ChunkKind, ManifestChunk, SeedManifest, SeedRow } from '@/types/seed';
import type { BlockIndexRow, SegmentDataType } from '@/types/storage';
import { parseDocumentSections } from '@/components/Editor/utils/sectionParser';
import type { Section } from '@/components/Editor/types/section';
import { fileToDisplayName } from '@/repositories/groupings';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
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
  /** Manifest version (builtAt epoch ms); defaults to now. */
  version?: number;
  /** Repo root the corpus paths resolve against. */
  corpusRoot?: string;
}

export interface GenerateSeedResult {
  manifest: SeedManifest;
  outDir: string;
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

// ── Block index derivation ────────────────────────────────────────────────

/**
 * Port of the retired scripts/generate-static-block-index.ts: precompute the
 * collections/feeds corpus into BlockIndexRow[] at build time so the runtime
 * importer can populate the `block_index` store directly. Row identity
 * (`static:<noteId>:<sectionId>:1`) matches what analytics joins expect.
 */
function toSegmentDataType(section: Pick<Section, 'type' | 'level'>): SegmentDataType {
  switch (section.type) {
    case 'wod': return 'wod';
    case 'title': {
      const l = section.level ?? 1;
      return `h${Math.min(Math.max(l, 1), 6)}` as SegmentDataType;
    }
    case 'frontmatter': return 'frontmatter';
    case 'markdown':
    case 'widget':
    case 'embed':
    case 'code':
      return 'markdown';
    default:
      return 'markdown';
  }
}

/** Created-at from git history (collections), 0 fallback when unknown. */
function getFileCreatedAt(file: string): number {
  try {
    const out = execSync(`git log -1 --format=%ct -- '${file}'`, { encoding: 'utf8' }).trim();
    const ts = Number(out) * 1000;
    return Number.isFinite(ts) && ts > 0 ? ts : 0;
  } catch {
    return 0;
  }
}

/** Created-at timestamp for a feed entry's date key (`yyyy-mm-dd` from the path). */
export function feedDateToCreatedAt(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 0;
  const ts = Date.parse(`${dateKey}T00:00:00Z`);
  return Number.isNaN(ts) ? 0 : ts;
}

/** Rows per block-index chunk (~4k rows keeps fetch + transaction sizes sane). */
const BLOCK_INDEX_ROWS_PER_CHUNK = 4000;

export function buildBlockIndexRows(markdownDir: string, corpusRoot: string): BlockIndexRow[] {
  const index: BlockIndexRow[] = [];

  // Collections: collections/{dir}/{file}.md (READMEs excluded).
  const collectionsGlob = new Glob('collections/**/*.md');
  for (const file of collectionsGlob.scanSync({ cwd: markdownDir, onlyFiles: true })) {
    const rel = `markdown/${file}`;
    const parts = rel.split('/');
    if (parts.length < 4) continue;
    const dirName = parts[parts.length - 2];
    const fileNameExt = parts[parts.length - 1];
    if (fileNameExt.toLowerCase() === 'readme.md') continue;

    const fileName = fileNameExt.replace(/\.md$/, '');
    const noteId = `${dirName}/${fileName}`;
    const noteTitle = fileToDisplayName(fileNameExt);
    const content = readFileSync(join(corpusRoot, rel), 'utf8');
    const createdAt = getFileCreatedAt(rel);

    const sections = parseDocumentSections(content);
    let position = 0;
    for (const section of sections) {
      const blockContentId = section.scriptBlock?.contentId ?? undefined;
      index.push({
        id: `static:${noteId}:${section.id}:1`,
        noteId,
        segmentId: section.id,
        segmentVersion: 1,
        position: position++,
        dataType: toSegmentDataType(section),
        blockContentId,
        rawContent: section.displayContent,
        noteTitle,
        createdAt,
        isStatic: true,
        sourceId: `collection:${noteId}`,
      });
    }
  }

  // Feeds: feeds/{dir}/{date}/{file}.md (READMEs excluded).
  const feedsGlob = new Glob('feeds/**/*.md');
  for (const file of feedsGlob.scanSync({ cwd: markdownDir, onlyFiles: true })) {
    const rel = `markdown/${file}`;
    const parts = rel.split('/');
    if (parts.length < 5) continue;
    const dirName = parts[parts.length - 3];
    const dateKey = parts[parts.length - 2];
    const fileNameExt = parts[parts.length - 1];
    if (fileNameExt.toLowerCase() === 'readme.md') continue;

    const fileName = fileNameExt.replace(/\.md$/, '');
    const noteId = `feeds/${dirName}/${dateKey}/${fileName}`;
    const noteTitle = fileToDisplayName(fileNameExt);
    const content = readFileSync(join(corpusRoot, rel), 'utf8');

    const sections = parseDocumentSections(content);
    let position = 0;
    for (const section of sections) {
      const blockContentId = section.scriptBlock?.contentId ?? undefined;
      index.push({
        id: `static:${noteId}:${section.id}:1`,
        noteId,
        segmentId: section.id,
        segmentVersion: 1,
        position: position++,
        dataType: toSegmentDataType(section),
        blockContentId,
        rawContent: section.displayContent,
        noteTitle,
        createdAt: feedDateToCreatedAt(dateKey),
        isStatic: true,
        sourceId: `feed:${noteId}`,
      });
    }
  }

  return index;
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

  // ── Block-index chunks: precomputed corpus rows for the `block_index` store ──
  const blockRows = buildBlockIndexRows(markdownDir, corpusRoot);
  for (let i = 0; blockRows.length > 0 && i * BLOCK_INDEX_ROWS_PER_CHUNK < blockRows.length; i++) {
    const part = blockRows.slice(i * BLOCK_INDEX_ROWS_PER_CHUNK, (i + 1) * BLOCK_INDEX_ROWS_PER_CHUNK);
    if (part.length === 0) break;
    const id = `${BLOCK_INDEX_CHUNK_PREFIX}${i}`;
    const bytes = Buffer.from(JSON.stringify(part), 'utf8');
    const sha = sha256Hex(bytes);
    const file = `chunks/${id}.${sha.slice(0, 8)}.json`;
    writeFileSync(join(outDir, file), bytes);
    manifestChunks.push({ id, path: file, sha256: sha, bytes: bytes.length, count: part.length, kind: 'block-index' satisfies ChunkKind });
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
    console.log(`  ${c.id.padEnd(48)} ${String(c.count).padStart(4)} ${c.kind === 'block-index' ? 'rows ' : 'files'}  ${kb(c.bytes).padStart(8)}`);
  }
  console.log(`[generate-seed] ${manifest.chunks.length} chunks, ${totalFiles} files, ${kb(totalBytes)} total in ${Date.now() - started} ms`);
}

if (import.meta.main) main();
