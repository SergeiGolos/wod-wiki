/**
 * Dashboard Catalog discovery (#906) — pins the deep link the
 * /analytics/dashboard empty state offers ("Browse prebuilt dashboards").
 * The query must surface the six prebuilt seeds as cloneable Session
 * entries; the `in collections` scope is required (the default journal
 * scope excludes static catalog content).
 */
import { describe, expect, it } from 'bun:test';
import { searchEntries } from './entrySearch';

describe('dashboard catalog discovery', () => {
  it('the catalog:dashboards filter surfaces the six prebuilts as sessions', async () => {
    const entries = await searchEntries('find:note{catalog:dashboards} in collections');
    expect(entries.length).toBe(6);
    expect(entries.every((e) => e.kind === 'session')).toBe(true);
    expect(entries.map((e) => e.title).sort()).toEqual([
      'Benchmark Pr Board',
      'Finger Strength V8',
      'Polarized Base Marathon',
      'Recovery Readiness',
      'Road To 560 Total',
      'Training Block Review',
    ]);
  });
});
