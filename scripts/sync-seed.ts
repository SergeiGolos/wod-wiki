/**
 * sync-seed — build the bundled seed artifacts from the sibling
 * `wod-wiki-seed` checkout into apps/playground/public/seed/.
 *
 * The corpus and the compiler live in the wod-wiki-seed repo (content MRs,
 * validation, and git-based versioning all happen there); this repo only
 * supplies the playground template chunk and the output directory. See
 * ../wod-wiki-seed/README.md.
 *
 * Versioning is owned by the seed repo: every merged MR there advances the
 * manifest `version` (commit count) and `versionLabel`/`commit` identify the
 * exact source tree. This script prints a change report against the
 * previously synced manifest so "what changed / what needs syncing" is one
 * build log away.
 *
 * Layout override for non-sibling checkouts:
 *   WOD_WIKI_SEED_DIR=/path/to/wod-wiki-seed bun scripts/sync-seed.ts
 *
 * Chained before `vite build` and `vite dev` in the playground package, and
 * exposed as the root `generate:seed` script.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface ManifestChunkRef {
  id: string;
  sha256: string;
}

interface SeedManifestRef {
  version: number;
  versionLabel?: string;
  commit?: string;
  dirty?: boolean;
  chunks: ManifestChunkRef[];
}

interface SyncResult {
  manifest: SeedManifestRef;
  reportPath: string;
  passMs: { scan: number; blockIndex: number; blockEfforts: number; write: number };
}

const ROOT = resolve(import.meta.dir, '..');
const SEED_DIR = resolve(process.env.WOD_WIKI_SEED_DIR ?? join(ROOT, '..', 'wod-wiki-seed'));
const COMPILER = join(SEED_DIR, 'src', 'compiler.ts');
const TEMPLATE_FILE = join(ROOT, 'apps', 'playground', 'app', 'templates', 'new-playground.md');
const OUT_DIR = join(ROOT, 'apps', 'playground', 'public', 'seed');
/** Historical in-repo row path for the template chunk — the runtime derives the template note's id from it; must stay stable. */
const TEMPLATE_ROW_PATH = 'apps/playground/app/templates/new-playground.md';

if (!existsSync(COMPILER)) {
  console.error(
    `[sync-seed] wod-wiki-seed checkout not found at ${SEED_DIR}\n` +
    `Clone it next to this repo (git clone … wod-wiki-seed) or set WOD_WIKI_SEED_DIR.`,
  );
  process.exit(1);
}

// ts-no-dynamic-import exception: the specifier is runtime-selected
// (sibling checkout location, overridable via WOD_WIKI_SEED_DIR), so a
// static import cannot work. The guard above keeps a missing checkout a
// clear error instead of a module-resolution stack trace. Bun resolves the
// compiler's own dependencies (@bitcobblers/*, vendored in the seed repo)
// from the seed checkout's node_modules — keep them installed.
const { generateSeed } = (await import(COMPILER)) as { generateSeed: (options: Record<string, unknown>) => SyncResult };
const scaffold = process.argv.includes('--scaffold');

// Previous manifest for the change report (generateSeed wipes OUT_DIR).
let prevManifest: SeedManifestRef | undefined;
try {
  prevManifest = JSON.parse(readFileSync(join(OUT_DIR, 'manifest.json'), 'utf8')) as SeedManifestRef;
} catch {
  // First sync — everything is "added".
}

const { manifest, reportPath, passMs }: SyncResult = generateSeed({
  templateFile: TEMPLATE_FILE,
  templateRowPath: TEMPLATE_ROW_PATH,
  outDir: OUT_DIR,
  corpusRoot: SEED_DIR,
  scaffoldDiscoveredEfforts: scaffold,
});

const prevChunks = prevManifest?.chunks ?? [];
const prevById = new Map(prevChunks.map((c) => [c.id, c.sha256]));
const nextById = new Map(manifest.chunks.map((c) => [c.id, c.sha256]));
const added = manifest.chunks.filter((c) => !prevById.has(c.id)).map((c) => c.id);
const removed = prevChunks.filter((c) => !nextById.has(c.id)).map((c) => c.id);
const changed = manifest.chunks.filter((c) => prevById.has(c.id) && prevById.get(c.id) !== c.sha256).map((c) => c.id);

console.log(`[sync-seed] seed ${manifest.version} (${manifest.versionLabel ?? 'unversioned'}, commit ${(manifest.commit ?? '').slice(0, 8)})${manifest.dirty ? ' [dirty]' : ''} → ${OUT_DIR}`);
if (prevChunks.length > 0) {
  console.log(
    `[sync-seed] vs previous (${prevManifest?.versionLabel ?? prevManifest?.version}): ` +
    `${changed.length} changed, ${added.length} added, ${removed.length} removed, ` +
    `${manifest.chunks.length - changed.length - added.length} unchanged`,
  );
  for (const id of changed) console.log(`  ~ ${id}`);
  for (const id of added) console.log(`  + ${id}`);
  for (const id of removed) console.log(`  - ${id}`);
} else {
  console.log(`[sync-seed] first sync — ${manifest.chunks.length} chunks`);
}
console.log(`[sync-seed] report: ${reportPath} (scan ${passMs.scan}ms, block-index ${passMs.blockIndex}ms, block-efforts ${passMs.blockEfforts}ms, write ${passMs.write}ms)`);
