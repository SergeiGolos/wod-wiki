import { describe, expect, it } from 'bun:test';

import { buildDashboardScaffold } from './scaffold';
import { parseFrontmatter } from '@/lib/frontmatter';
import { parseDashboardNote } from './parser';
import { buildDashboardDocument } from './model';

describe('buildDashboardScaffold', () => {
  it('produces a dashboard note (dashboard: true) marked active', () => {
    const { meta } = parseFrontmatter(buildDashboardScaffold());
    expect(meta['dashboard']).toBe('true');
    expect(meta['dashboard.active']).toBe('true');
  });

  it('carries the requested title in frontmatter', () => {
    const { meta } = parseFrontmatter(buildDashboardScaffold('Road to Regionals'));
    expect(meta['title']).toBe('Road to Regionals');
  });

  it('defaults the title', () => {
    const { meta } = parseFrontmatter(buildDashboardScaffold());
    expect(meta['title']).toBe('New Dashboard');
  });

  it('ships a starter token set', () => {
    const { meta } = parseFrontmatter(buildDashboardScaffold());
    const tokenKeys = Object.keys(meta).filter((k) => k.startsWith('dashboard.') && k !== 'dashboard.active');
    expect(tokenKeys.length).toBeGreaterThan(0);
  });

  it('round-trips into a one-widget dashboard document', () => {
    const raw = buildDashboardScaffold();
    const { meta, sections } = parseDashboardNote(raw);
    const doc = buildDashboardDocument(sections, meta);
    expect(doc.isDashboard).toBe(true);
    expect(doc.widgets.length).toBe(1);
    expect(doc.widgets[0].title).toBeDefined();
    // The scaffold widget references a declared token, so token controls and
    // substitution both have something to work with out of the box.
    expect(doc.widgets[0].query).toContain('$');
    expect(doc.tokens.some((t) => doc.widgets[0].query.includes(`$${t.name}`))).toBe(true);
  });
});
