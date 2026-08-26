/**
 * Dashboard corpus discovery — the prebuilt seeds live in their own corpus
 * (markdown/dashboards/, NOT collections). The corpus loader
 * (dashboardCorpus) uses Vite's import.meta.glob, which isn't available under
 * bun test — so this test reads the markdown directly (the canvasRoutes.test
 * precedent) and asserts the contract the loader depends on: six seeds, each
 * a dashboard note, slugs derivable from filename.
 */
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '@/lib/frontmatter';
import { parseDashboardNote } from '@/lib/dashboard/parser';
import { buildDashboardDocument, isDashboardWidgetType, resolveWidgetType } from '@/lib/dashboard/model';

const SEEDS_DIR = join(import.meta.dir, '../../../../markdown/dashboards');
const seedFiles = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.md'));

describe('dashboard corpus', () => {
  it('ships the six prebuilt seeds, each a valid dashboard addressable by filename slug', () => {
    expect(seedFiles).toHaveLength(6);
    for (const file of seedFiles) {
      const raw = readFileSync(join(SEEDS_DIR, file), 'utf8');
      const { meta } = parseFrontmatter(raw);
      const { sections } = parseDashboardNote(raw);
      const doc = buildDashboardDocument(sections, meta);
      expect(doc.isDashboard).toBe(true);
      // Slug = frontmatter slug if declared, else the filename (the loader rule).
      const slug = typeof meta.slug === 'string' && meta.slug ? meta.slug : file.replace(/\.md$/, '');
      expect(slug).toBeTruthy();
      for (const widget of doc.widgets) {
        expect(isDashboardWidgetType(resolveWidgetType(widget.type))).toBe(true);
      }
    }
  });

  it('derives slugs from filenames (prebuilts declare no frontmatter slug)', () => {
    const slugs = seedFiles.map((f) => f.replace(/\.md$/, '')).sort();
    expect(slugs).toEqual([
      'benchmark-pr-board',
      'finger-strength-v8',
      'polarized-base-marathon',
      'recovery-readiness',
      'road-to-560-total',
      'training-block-review',
    ]);
  });
});
