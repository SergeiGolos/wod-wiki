import { describe, expect, it } from 'vitest';
import { QueryDocumentRunner } from '../src/queryDocumentRunner';
import { parseQuery } from '../src/wql';

describe('ticket 19 — QueryDocumentRunner', () => {
  const runner = new QueryDocumentRunner({
    runAggregate: async (queryText) => ({
      series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1, value: 42 }] }],
      unit: undefined,
      queryText,
    }),
    runFind: async () => ({
      kind: 'find' as const,
      parsed: {} as never,
      notes: [],
      blocks: [],
      stages: { selected: 0, matched: 0 },
      table: { columns: [{ name: 'date', type: 'date' as const }], rows: [{ date: '2026-09-07' }], totalCount: 1 },
    }),
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

  it('table queries dispatch to runFind and surface the TabularResult', async () => {
    const result = await runner.run(':segment{discipline:running} | limit 5');
    expect(result.outputs[0]!.kind).toBe('find');
    expect(result.outputs[0]!.table?.totalCount).toBe(1);
  });

  it('find queries dispatch to runFind', async () => {
    const result = await runner.run(':note{tags:crossfit}');
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
    await probe.run('sum:totalVolume{effort:$effort}', { tokens: { effort: '200' } });
    expect(seen).toBe('sum:totalVolume{effort:200}');
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

  it('document default windows bound find and pipeline dispatches', async () => {
    const seen: string[] = [];
    const probe = new QueryDocumentRunner({
      runFind: async (q) => {
        seen.push(q);
        return { kind: 'find' as const, parsed: {} as never, notes: [], blocks: [] };
      },
      runPipeline: async (q) => {
        seen.push(q);
        return { parsed: { family: 'pipeline' as const, raw: q } };
      },
    });
    await probe.run('defaults last 4w\na = :note\nb = @session | :sum{metric:tis}\nshow a, b');
    expect(seen).toHaveLength(2);
    for (const text of seen) {
      const parsed = parseQuery(text);
      // The block default bounds every family: find queries carry the window
      // at top level; pipelines carry it on the transform stage.
      const window = parsed.family === 'pipeline'
        ? parsed.transforms[parsed.transforms.length - 1]?.window
        : parsed.window;
      expect(window).toEqual({ kind: 'relative', size: 4, unit: 'w' });
    }
  });

  it('overlapping document runs keep captured contexts isolated', async () => {
    const seen: Array<{ q: string; instant?: number }> = [];
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const probe = new QueryDocumentRunner({
      runAggregate: async (queryText, opts) => {
        seen.push({ q: queryText, instant: opts.context?.instant });
        if (queryText.includes('tis')) await gate;
        return { series: [{ key: 'k', label: 'k', points: [{ ts: 1, value: 1 }] }] };
      },
    });
    const first = probe.run('sum:tis{}', { context: { instant: 111, timeZone: 'UTC' } });
    const second = probe.run('sum:distance{}', { context: { instant: 222, timeZone: 'Asia/Tokyo' } });
    await Promise.resolve();
    releaseFirst();
    await Promise.all([first, second]);
    const tisRun = seen.find((s) => s.q.includes('tis'))!;
    const distanceRun = seen.find((s) => s.q.includes('distance'))!;
    expect(tisRun.instant).toBe(111);
    expect(distanceRun.instant).toBe(222);
  });
});
