/**
 * Dashboard Catalog seed validation (#906) — every file under
 * markdown/collections/dashboards/ must be a well-formed dashboard note in
 * the locked #899 format: dashboard frontmatter, known widget types, and
 * WQL bodies that parse (a parse error would surface as a red problem
 * badge instead of a chart or a proposed-metric placeholder).
 */
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-wql';
import { parseFrontmatter } from '@/lib/frontmatter';

import { parseDashboardNote, buildDashboardDocument, isDashboardWidgetType, resolveWidgetType, isDashboardMeta } from '@bitcobblers/wod-wiki-wql';

const SEEDS_DIR = join(import.meta.dir, '../../../../markdown/dashboards');
const seedFiles = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.md'));

describe('Dashboard Catalog seeds', () => {
  it('ships the six prebuilts from the prototype', () => {
    expect(seedFiles).toHaveLength(6);
  });
  for (const file of seedFiles) {
    it(`${file}: is valid dashboard note with parseable WQL and declared tokens`, () => {
      const raw = readFileSync(join(SEEDS_DIR, file), 'utf8');
      const { meta } = parseFrontmatter(raw);
      const { sections } = parseDashboardNote(raw);
      const doc = buildDashboardDocument(sections, meta);

      expect(doc.isDashboard).toBe(true);
      expect(doc.title).toBeDefined();

      expect(doc.widgets.length).toBeGreaterThanOrEqual(3);
      for (const widget of doc.widgets) {
        expect(widget.title).toBeDefined();
        expect(isDashboardWidgetType(resolveWidgetType(widget.type))).toBe(true);

        const parsed = parseQuery(widget.body);
        expect(parsed.error).toBeUndefined();
        expect(isFindQuery(parsed)).toBe(false);
      }

      const declared = new Set(doc.tokens.map((t) => t.name));
      for (const widget of doc.widgets) {
        for (const ref of widget.body.matchAll(/\$([A-Za-z][\w-]*)/g)) {
          expect(declared.has(ref[1])).toBe(true);
        }
        for (const value of Object.values(widget.attributes)) {
          for (const ref of value.matchAll(/\$([A-Za-z][\w-]*)/g)) {
            expect(declared.has(ref[1])).toBe(true);
          }
        }
      }
    });
  }
});
