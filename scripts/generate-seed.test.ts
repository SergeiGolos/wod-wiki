/**
 * generate-seed.test — parity + determinism guards for the seed compiler.
 *
 * The compiler's own parity gate (unknown corpus → hard error) is the
 * load-bearing check wired into the build; these tests pin its contract:
 * partition rules, chunk byte determinism, manifest shape, and that the real
 * `markdown/` corpus partitions completely (every globbed file lands in
 * exactly one chunk).
 *
 * Run: bun test scripts/generate-seed.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  collectCorpusMarkdown,
  generateSeed,
  partitionIntoChunks,
  SEED_SCHEMA,
  chunkIdFor,
} from './generate-seed';

const sha256 = (data: string | Buffer): string =>
  createHash('sha256').update(data).digest('hex');

describe('chunkIdFor partition rules', () => {
  it('maps each corpus to its chunk id', () => {
    expect(chunkIdFor('markdown/canvas/syntax/x.md')).toBe('canvas');
    expect(chunkIdFor('markdown/dashboards/a.md')).toBe('dashboards');
    expect(chunkIdFor('markdown/efforts/e.md')).toBe('efforts');
    expect(chunkIdFor('markdown/collections/girls/fran.md')).toBe('collection.girls');
    expect(chunkIdFor('markdown/feeds/programming/2026-01.md')).toBe('feed.programming');
  });

  it('routes top-level collection/feed files to the _root chunk', () => {
    expect(chunkIdFor('markdown/collections/README.md')).toBe('collection._root');
    expect(chunkIdFor('markdown/feeds/README.md')).toBe('feed._root');
  });

  it('rejects unknown corpora, bare markdown files, and non-markdown trees', () => {
    expect(chunkIdFor('markdown/weird/x.md')).toBeNull();
    expect(chunkIdFor('markdown/README.md')).toBeNull();
    expect(chunkIdFor('apps/playground/x.md')).toBeNull();
  });
});

describe('partitionIntoChunks', () => {
  it('throws on files outside the known corpora (the parity gate)', () => {
    expect(() => partitionIntoChunks(['markdown/canvas/a.md', 'markdown/newcorpus/b.md']))
      .toThrow(/Parity failure.*markdown\/newcorpus\/b\.md/);
  });

  it('partitions the real markdown corpus completely — no file dropped or duplicated', () => {
    const files = collectCorpusMarkdown(join(import.meta.dir, '..', 'markdown'));
    expect(files.length).toBeGreaterThan(0);
    const groups = partitionIntoChunks(files);
    const grouped = groups.flatMap((g) => g.files);
    expect(grouped).toHaveLength(files.length);
    expect(new Set(grouped).size).toBe(files.length);
    for (const f of files) expect(grouped).toContain(f);
  });
});

describe('generateSeed', () => {
  function makeTmpCorpus(): string {
    const tmp = mkdtempSync(join(tmpdir(), 'seed-test-'));
    mkdirSync(join(tmp, 'markdown/canvas/sub'), { recursive: true });
    mkdirSync(join(tmp, 'markdown/collections/cat1'), { recursive: true });
    mkdirSync(join(tmp, 'markdown/feeds/f'), { recursive: true });
    writeFileSync(join(tmp, 'markdown/canvas/a.md'), '# A');
    writeFileSync(join(tmp, 'markdown/canvas/sub/b.md'), '# B');
    writeFileSync(join(tmp, 'markdown/collections/cat1/c.md'), '# C');
    writeFileSync(join(tmp, 'markdown/feeds/f/d.md'), '# D');
    writeFileSync(join(tmp, 'template.md'), 'new page: {{title}}');
    return tmp;
  }

  it('emits manifest + content-hashed chunks matching the corpus', () => {
    const tmp = makeTmpCorpus();
    try {
      const { manifest, outDir, totalFiles } = generateSeed({
        markdownDir: join(tmp, 'markdown'),
        templateFile: join(tmp, 'template.md'),
        outDir: join(tmp, 'out'),
        corpusRoot: tmp,
        version: 12345,
      });

      expect(manifest.schema).toBe(SEED_SCHEMA);
      expect(manifest.version).toBe(12345);
      expect(manifest.builtAt).toBe(new Date(12345).toISOString());
      expect(totalFiles).toBe(5); // 4 corpus + 1 template
      expect(manifest.chunks.map((c) => c.id)).toEqual([
        'canvas', 'collection.cat1', 'feed.f', 'template',
      ]);

      for (const c of manifest.chunks) {
        const bytes = readFileSync(join(outDir, c.path));
        expect(existsSync(join(outDir, c.path))).toBe(true);
        expect(c.path).toMatch(new RegExp(`^chunks/${c.id}\\.[0-9a-f]{8}\\.json$`));
        expect(c.path).toContain(c.sha256.slice(0, 8));
        expect(sha256(bytes)).toBe(c.sha256);
        expect(c.bytes).toBe(bytes.length);
        const rows = JSON.parse(bytes.toString('utf8')) as Array<{ path: string; content: string }>;
        expect(rows).toHaveLength(c.count);
        for (const row of rows) {
          expect(row.content).toBe(readFileSync(join(tmp, row.path), 'utf8'));
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('is deterministic: identical corpus → identical chunk bytes, only version advances', () => {
    const tmp = makeTmpCorpus();
    try {
      const opts = {
        markdownDir: join(tmp, 'markdown'),
        templateFile: join(tmp, 'template.md'),
        outDir: join(tmp, 'out'),
        corpusRoot: tmp,
      };
      const first = generateSeed({ ...opts, version: 1000 });
      const second = generateSeed({ ...opts, version: 2000 });

      expect(second.manifest.chunks.map((c) => c.path))
        .toEqual(first.manifest.chunks.map((c) => c.path));
      expect(second.manifest.chunks.map((c) => c.sha256))
        .toEqual(first.manifest.chunks.map((c) => c.sha256));
      expect(second.manifest.version).toBe(2000);
      // Manifest bytes differ ONLY through version/builtAt.
      expect(JSON.stringify(second.manifest.chunks))
        .toBe(JSON.stringify(first.manifest.chunks));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
