import { expect, it } from 'bun:test';
import { buildDashboardDocument, parseDashboardNote } from '@bitcobblers/wod-wiki-wql';
import { HOME_ANALYTICS_QUERIES, buildHomeExampleEvents, createHomeExampleQueryService } from './homeAnalyticsData';

const NOW = new Date(2026, 5, 1, 2).getTime();
const DAY = 86_400_000;
const context = { instant: NOW, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
const all = { rangeStart: NOW - 200 * DAY, rangeEnd: NOW, context };

it('generates repeatable observations before an early-morning visit', () => {
  const events = buildHomeExampleEvents(NOW);
  expect(events).toEqual(buildHomeExampleEvents(NOW));
  expect(Math.max(...events.map((event) => event.timestamp))).toBeLessThan(NOW);
});

it('answers filtered, scoped, and calendar-window queries from real example observations', async () => {
  const service = createHomeExampleQueryService(NOW);
  // Main lifts contribute 26,460 kg; six Fran thruster sets contribute 11,475 kg.
  expect((await service.runQuery('sum:totalVolume{discipline:strength}', all)).scalar).toBe(37935);
  expect((await service.runQuery('max:calc.e1rm{effort:deadlift}', all)).scalar).toBe(220);
  expect((await service.runQuery('sum:totalReps{effort:pull-up}', all)).scalar).toBe(720);
  expect((await service.runQuery('avg:calc.adherence{}', all)).scalar).toBe(0.9375);
  expect((await service.runQuery('avg:calc.ef{}', all)).scalar).toBeCloseTo(1985.8, 1);
  expect((await service.runQuery('sum:totalVolume{note:example-strength-w15}', all)).scalar).toBe(1987.5);
  expect((await service.runQuery('sum:totalVolume{note:no-such-note}', all)).scalar).toBeUndefined();
  expect((await service.runQuery('sum:totalDistance{discipline:running}', {
    ...all, rangeStart: NOW - 42 * DAY,
  })).scalar).toBe(36200);
  const recent = await service.runQuery('sum:totalVolume{effort:deadlift} last 6w', { context });
  expect(recent.error).toBeUndefined();
  expect(recent.scalar).toBe(2880);
});

it('executes the actual home board and showcase queries with complete evidence', async () => {
  const service = createHomeExampleQueryService(NOW);
  const queries = HOME_ANALYTICS_QUERIES.map((query) => query.query);
  for (const slug of ['training-block-review', 'road-to-560-total', 'polarized-base-marathon']) {
    const source = await Bun.file(new URL(`../../../../markdown/dashboards/${slug}.md`, import.meta.url)).text();
    const { meta, sections } = parseDashboardNote(source);
    queries.push(...buildDashboardDocument(sections, meta).widgets.map((widget) => widget.body));
  }
  for (const query of queries) {
    const result = await service.runQuery(query, all);
    expect(result.error, query).toBeUndefined();
    expect(result.parsed.error, query).toBeUndefined();
    expect(result.coverage?.insufficientScopes, query).toEqual([]);
  }
});
