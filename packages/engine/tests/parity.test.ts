import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { runQueryCli, type QueryResult } from '../src/index';

const FIXTURE_PATH = join(__dirname, '../fixtures/golden/multi-week-journal.json');

describe('Golden IR Corpora Parity Tests (multi-week-journal.json)', () => {
  it('matches expected series for weekly volume rollup: sum:totalVolume{} by {week}', async () => {
    const ir = await runQueryCli('sum:totalVolume{} by {week}', {
      corpusPath: FIXTURE_PATH,
      preferredUnit: 'lb',
    });

    expect(ir.kind).toBe('query-result');
    const result = ir.data as QueryResult;

    expect(result.series.length).toBe(1);
    const series = result.series[0];
    expect(series.key).toBe('totalVolume');
    expect(series.unit).toBe('lb');
    expect(series.points.length).toBe(5);

    // Verify weekly points match golden scenario values
    expect(series.points.map((p) => p.value)).toEqual([2790, 8202, 8525, 8849, 5936]);
  });

  it('matches expected scalar for overall average intensity: avg:tis{}', async () => {
    const ir = await runQueryCli('avg:tis{}', {
      corpusPath: FIXTURE_PATH,
    });

    expect(ir.kind).toBe('query-result');
    const result = ir.data as QueryResult;

    expect(result.scalar).toBeCloseTo(40.75, 2);
  });

  it('matches expected breakdown for discipline session load: sum:sessionLoad{} by {discipline}', async () => {
    const ir = await runQueryCli('sum:sessionLoad{} by {discipline}', {
      corpusPath: FIXTURE_PATH,
    });

    expect(ir.kind).toBe('query-result');
    const result = ir.data as QueryResult;

    const disciplines = result.series.map((s) => ({
      key: s.key,
      total: s.points.reduce((acc, p) => acc + p.value, 0),
    }));

    const gym = disciplines.find((d) => d.key === 'gymnastics');
    const run = disciplines.find((d) => d.key === 'running');
    const kb = disciplines.find((d) => d.key === 'kettlebell');

    expect(gym).toBeDefined();
    expect(gym?.total).toBe(500);

    expect(run).toBeDefined();
    expect(run?.total).toBe(403);

    expect(kb).toBeDefined();
    expect(kb?.total).toBe(314);
  });
});
