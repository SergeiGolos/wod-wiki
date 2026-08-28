import { describe, expect, it } from 'vitest';
import { compareScenarioResult } from './compare';
import type { ParsedScenario } from './scenarioFile';
import type { QueryResult, RowsQueryResult } from '../../../src/QueryService';

const mockAggregate = (partial: Partial<QueryResult>): QueryResult => ({
  parsed: {} as any,
  series: [],
  stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
  matched: [],
  ...partial,
});

const mockRows = (partial: Partial<RowsQueryResult>): RowsQueryResult => ({
  parsed: {} as any,
  runs: [],
  ...partial,
});

describe('compareScenarioResult', () => {
  it('passes on matching scalar and unit', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'sum:v{}',
      expected: { scalar: 100, unit: 'lb' },
    };
    const actual = mockAggregate({ scalar: 100, unit: 'lb' });
    expect(compareScenarioResult(scenario, actual)).toEqual([]);
  });

  it('fails on scalar mismatch with readable diff', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'sum:v{}',
      expected: { scalar: 100 },
    };
    const actual = mockAggregate({ scalar: 90 });
    const diffs = compareScenarioResult(scenario, actual);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatch(/scalar.*expected 100.*got 90/i);
  });

  it('matches grouped series by key and value', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'sum:v{} by {discipline}',
      expected: {
        series: [
          { key: 'gymnastics', value: 17640, unit: 'lb' },
          { key: 'kettlebell', value: 33750, unit: 'lb' },
        ],
      },
    };
    const actual = mockAggregate({
      series: [
        { key: 'gymnastics', label: 'gymnastics', unit: 'lb', points: [{ ts: 1, value: 17640 }] },
        { key: 'kettlebell', label: 'kettlebell', unit: 'lb', points: [{ ts: 1, value: 33750 }] },
      ],
    });
    expect(compareScenarioResult(scenario, actual)).toEqual([]);
  });

  it('closed mode fails on extra series', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'sum:v{} by {discipline}',
      expected: {
        series: [{ key: 'gymnastics', value: 17640 }],
      },
    };
    const actual = mockAggregate({
      series: [
        { key: 'gymnastics', label: 'gymnastics', points: [{ ts: 1, value: 17640 }] },
        { key: 'extra', label: 'extra', points: [{ ts: 1, value: 999 }] },
      ],
    });
    const diffs = compareScenarioResult(scenario, actual);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatch(/unexpected series "extra"/i);
  });

  it('matches timeseries points by date or ts', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'sum:v{} by {week}',
      expected: {
        series: [
          {
            key: 'totalVolume',
            points: [
              { dateOrTs: 1780329600000, value: 2790 },
              { dateOrTs: 1780934400000, value: 2850 },
            ],
          },
        ],
      },
    };
    const actual = mockAggregate({
      series: [
        {
          key: 'totalVolume',
          label: 'totalVolume',
          points: [
            { ts: 1780329600000, value: 2790 },
            { ts: 1780934400000, value: 2850 },
          ],
        },
      ],
    });
    expect(compareScenarioResult(scenario, actual)).toEqual([]);
  });

  it('matches rows query runs and events', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'rows:all{result:res-1}',
      expected: {
        runs: [
          {
            resultId: 'res-1',
            noteId: 'note-1',
            events: [
              { id: 'res-1:summary:totalVolume', grain: 'summary', outputType: 'analytics', metricsSummary: 'totalVolume:2790 lb' },
            ],
          },
        ],
      },
    };
    const actual = mockRows({
      runs: [
        {
          resultId: 'res-1',
          noteId: 'note-1',
          timestamp: 1000,
          events: [
            {
              id: 'res-1:summary:totalVolume',
              resultId: 'res-1',
              noteId: 'note-1',
              grain: 'summary',
              outputType: 'analytics',
              timestamp: 1000,
              metrics: [{ type: 'totalVolume', value: 2790, unit: 'lb' }] as any,
            },
          ],
        },
      ],
    });
    expect(compareScenarioResult(scenario, actual)).toEqual([]);
  });

  it('verifies expected error messages', () => {
    const scenario: ParsedScenario = {
      title: 's1',
      corpus: 'c',
      match: 'closed',
      query: 'rows:',
      errors: ['Bare "rows:" is retired'],
    };
    expect(compareScenarioResult(scenario, { error: 'Bare "rows:" is retired — name a target' })).toEqual([]);
    expect(compareScenarioResult(scenario, mockAggregate({ scalar: 10 }))).toHaveLength(1);
  });
});
