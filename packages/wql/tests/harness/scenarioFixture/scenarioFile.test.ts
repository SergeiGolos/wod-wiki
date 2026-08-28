import { describe, expect, it } from 'vitest';
import { parseScenarioFile } from './scenarioFile';

const SAMPLE_SCALAR = [
  '---',
  'title: "Total volume scalar"',
  'corpus: crossfit-multi-week',
  'preferredUnit: lb',
  'rangeEnd: 1783357200000',
  'match: subset',
  '---',
  '',
  '## Query',
  '',
  '```wql',
  'sum:totalVolume{}',
  '```',
  '',
  '## Expected',
  '',
  '- scalar: 53775',
  '- unit: lb',
].join('\n');

const SAMPLE_SERIES = [
  '---',
  'title: "Grouped volume"',
  '---',
  '',
  '## Query',
  '',
  '```wql',
  'sum:totalVolume{} by {discipline}',
  '```',
  '',
  '## Expected',
  '',
  '### Series gymnastics',
  '- value: 17640',
  '- unit: lb',
  '',
  '### Series kettlebell',
  '- value: 33750',
  '- unit: lb',
].join('\n');

const SAMPLE_POINTS = [
  '---',
  'title: "Weekly points"',
  '---',
  '',
  '## Query',
  '',
  '```wql',
  'sum:totalVolume{} by {week}',
  '```',
  '',
  '## Expected',
  '',
  '### Series totalVolume',
  '- point 2026-06-01: 2790',
  '- point 2026-06-08: 2850',
].join('\n');

const SAMPLE_ROWS = [
  '---',
  'title: "Rows run"',
  '---',
  '',
  '## Query',
  '',
  '```wql',
  'rows:all{result:res-fran-w0}',
  '```',
  '',
  '## Expected',
  '',
  '### Run res-fran-w0',
  '- note: note-journal-2026-06-01',
  '- event res-fran-w0:summary:totalVolume [summary/analytics] totalVolume:2790 lb',
  '- event res-fran-w0:summary:tis [summary/analytics] tis:46 pts',
].join('\n');

const SAMPLE_ERROR = [
  '---',
  'title: "Error bare rows"',
  '---',
  '',
  '## Query',
  '',
  '```wql',
  'rows:',
  '```',
  '',
  '## Errors',
  '',
  '- "Bare \\"rows:\\" is retired"',
].join('\n');

describe('parseScenarioFile', () => {
  it('parses scalar expectation scenario', () => {
    const s = parseScenarioFile(SAMPLE_SCALAR, 'scalar.md');
    expect(s.title).toBe('Total volume scalar');
    expect(s.corpus).toBe('crossfit-multi-week');
    expect(s.preferredUnit).toBe('lb');
    expect(s.rangeEnd).toBe(1783357200000);
    expect(s.match).toBe('subset');
    expect(s.query).toBe('sum:totalVolume{}');
    expect(s.expected?.scalar).toBe(53775);
    expect(s.expected?.unit).toBe('lb');
  });

  it('parses series expectation scenario with defaults', () => {
    const s = parseScenarioFile(SAMPLE_SERIES, 'series.md');
    expect(s.corpus).toBe('crossfit-multi-week');
    expect(s.match).toBe('closed');
    expect(s.query).toBe('sum:totalVolume{} by {discipline}');
    expect(s.expected?.series).toEqual([
      { key: 'gymnastics', value: 17640, unit: 'lb' },
      { key: 'kettlebell', value: 33750, unit: 'lb' },
    ]);
  });

  it('parses timeseries points expectation', () => {
    const s = parseScenarioFile(SAMPLE_POINTS, 'points.md');
    expect(s.expected?.series).toEqual([
      {
        key: 'totalVolume',
        points: [
          { dateOrTs: '2026-06-01', value: 2790 },
          { dateOrTs: '2026-06-08', value: 2850 },
        ],
      },
    ]);
  });

  it('parses rows expectation scenario', () => {
    const s = parseScenarioFile(SAMPLE_ROWS, 'rows.md');
    expect(s.expected?.runs).toEqual([
      {
        resultId: 'res-fran-w0',
        noteId: 'note-journal-2026-06-01',
        events: [
          { id: 'res-fran-w0:summary:totalVolume', grain: 'summary', outputType: 'analytics', metricsSummary: 'totalVolume:2790 lb' },
          { id: 'res-fran-w0:summary:tis', grain: 'summary', outputType: 'analytics', metricsSummary: 'tis:46 pts' },
        ],
      },
    ]);
  });

  it('parses error scenario', () => {
    const s = parseScenarioFile(SAMPLE_ERROR, 'err.md');
    expect(s.errors).toEqual(['Bare "rows:" is retired']);
  });

  it('diagnoses missing title', () => {
    const raw = SAMPLE_SCALAR.replace('title: "Total volume scalar"\n', '');
    expect(() => parseScenarioFile(raw, 'x.md')).toThrow(/x\.md.*frontmatter.*title/i);
  });

  it('diagnoses unknown frontmatter key', () => {
    const raw = SAMPLE_SCALAR.replace('preferredUnit: lb', 'bogus: true');
    expect(() => parseScenarioFile(raw, 'x.md')).toThrow(/x\.md.*frontmatter.*bogus/i);
  });

  it('diagnoses missing Query section', () => {
    const raw = SAMPLE_SCALAR.slice(0, SAMPLE_SCALAR.indexOf('## Query'))
      + SAMPLE_SCALAR.slice(SAMPLE_SCALAR.indexOf('## Expected'));
    expect(() => parseScenarioFile(raw, 'x.md')).toThrow(/x\.md.*## Query.*missing/i);
  });
});
