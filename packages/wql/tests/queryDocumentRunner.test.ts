import { describe, expect, it } from 'vitest';
import { QueryDocumentRunner } from '../src/queryDocumentRunner';

describe('ticket 19 — QueryDocumentRunner', () => {
  const runner = new QueryDocumentRunner({
    runAggregate: async (queryText) => ({
      series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1, value: 42 }] }],
      unit: undefined,
      queryText,
    }),
    runRows: async () => ({
      parsed: {} as never,
      runs: [],
      table: { columns: [{ name: 'date', type: 'date' }], rows: [{ date: '2026-09-07' }], totalCount: 1 },
    }),
    runFind: async () => ({ parsed: {} as never, notes: [], blocks: [], stages: { selected: 0, matched: 0 } }),
    rollupEnsure: async () => { rollupEnsures += 1; },
  });
  let rollupEnsures = 0;

  it('a degenerate single-query document runs the aggregate family', async () => {
    const result = await runner.run('sum:totalVolume{}');
    expect(result.diagnostics).toEqual([]);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]!.kind).toBe('aggregate');
    expect(result.outputs[0]!.series![0]!.points[0]!.value).toBe(42);
  });

  it('rows queries dispatch to runRows and surface the TabularResult', async () => {
    const result = await runner.run('rows:segment{discipline:running} | limit 5');
    expect(result.outputs[0]!.kind).toBe('rows');
    expect(result.outputs[0]!.table?.totalCount).toBe(1);
  });

  it('find queries dispatch to runFind', async () => {
    const result = await runner.run('find:note{tags:crossfit}');
    expect(result.outputs[0]!.kind).toBe('find');
  });

  it('AST rollup inspection triggers exactly one rollup-ensure per document run (no string match)', async () => {
    const before = rollupEnsures;
    await runner.run('sum:calc.acwr{}');
    expect(rollupEnsures).toBe(before + 1);
    // A query consuming no rollup facts does not ensure.
    await runner.run('sum:totalVolume{}');
    expect(rollupEnsures).toBe(before + 1);
  });

  it('token substitution resolves $name before execution', async () => {
    let seen: string | undefined;
    const probe = new QueryDocumentRunner({
      runAggregate: async (queryText) => {
        seen = queryText;
        return { series: [] };
      },
    });
    await probe.run('sum:totalVolume{goal:$goal}', { tokens: { goal: '200' } });
    expect(seen).toBe('sum:totalVolume{goal:200}');
  });

  it('one captured execution context threads every window resolution', async () => {
    const contexts: Array<{ instant?: number; timeZone?: string } | undefined> = [];
    const probe = new QueryDocumentRunner({
      runAggregate: async (_q, opts) => {
        contexts.push(opts.context);
        return { series: [] };
      },
    }, { context: { instant: 1_234_567_890, timeZone: 'Asia/Tokyo' } });
    const text = ['a = sum:totalVolume{}', 'b = sum:distance{}', 'show a, b'].join('\n');
    await probe.run(text);
    expect(contexts).toHaveLength(2);
    for (const c of contexts) {
      expect(c?.instant).toBe(1_234_567_890);
      expect(c?.timeZone).toBe('Asia/Tokyo');
    }
  });
});
