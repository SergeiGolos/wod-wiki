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

import { parseQuery, isFindQuery } from '@/services/analytics/query';
import { parseFrontmatter } from '@/lib/frontmatter';

import { parseDashboardNote } from './parser';
import { buildDashboardDocument, isDashboardWidgetType, resolveWidgetType, splitWidgetBody } from './model';

const SEEDS_DIR = join(import.meta.dir, '../../../markdown/dashboards');
const seedFiles = readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.md'));

describe('Dashboard Catalog seeds', () => {
  it('ships the six prebuilts from the prototype', () => {
    expect(seedFiles).toHaveLength(6);
  });

  for (const file of seedFiles) {
    describe(file, () => {
      const raw = readFileSync(join(SEEDS_DIR, file), 'utf8');
      const { meta } = parseFrontmatter(raw);
      const { sections } = parseDashboardNote(raw);
      const doc = buildDashboardDocument(sections, meta);

      it('is a dashboard note with a title', () => {
        expect(doc.isDashboard).toBe(true);
        expect(doc.title).toBeDefined();
      });

      it('composes at least three widgets, all with titles', () => {
        expect(doc.widgets.length).toBeGreaterThanOrEqual(3);
        for (const widget of doc.widgets) {
          expect(widget.title).toBeDefined();
        }
      });

      it('uses only known widget types', () => {
        for (const widget of doc.widgets) {
          expect(isDashboardWidgetType(resolveWidgetType(widget.type))).toBe(true);
        }
      });

      it('every widget body is parseable WQL (never a find: query)', () => {
        for (const widget of doc.widgets) {
          const { query } = splitWidgetBody(widget.body);
          const parsed = parseQuery(query);
          expect(parsed.error).toBeUndefined();
          expect(isFindQuery(parsed)).toBe(false);
        }
      });

      it('every $token referenced by a query is declared in frontmatter', () => {
        const declared = new Set(doc.tokens.map((t) => t.name));
        for (const widget of doc.widgets) {
          for (const ref of widget.query.matchAll(/\$([A-Za-z][\w-]*)/g)) {
            expect(declared.has(ref[1])).toBe(true);
          }
          for (const param of widget.params) {
            for (const ref of param.matchAll(/\$([A-Za-z][\w-]*)/g)) {
              expect(declared.has(ref[1])).toBe(true);
            }
          }
        }
      });
    });
  }
});
