import { describe, it, expect } from 'vitest';
import { parseScript, ScriptRuntime, toStoredOutputStatement, computeWorkloadRollups } from '../src/index';

describe('@wod-wiki/lang', () => {
  it('parses text into statements', () => {
    const text = '21 pullups\n15 thrusters\n9 burpees';
    const parsed = parseScript(text, { dialect: 'wod' });

    expect(parsed.statements.length).toBe(3);
    expect(parsed.statements[0].text).toBe('21 pullups');
    expect(parsed.statements[0].dialect).toBe('wod');
  });

  it('executes a parsed script and computes metrics', () => {
    const text = '21 pullups\n15 thrusters';
    const parsed = parseScript(text);
    const runtime = new ScriptRuntime(parsed);
    const result = runtime.execute();

    expect(result.outputs.length).toBe(2);
    expect(result.metrics.has('pullups')).toBe(true);
    expect(result.metrics.get('pullups')?.toNumber()).toBe(21);
  });

  it('converts to stored output statements', () => {
    const parsed = parseScript('21 pullups');
    const runtime = new ScriptRuntime(parsed);
    const result = runtime.execute();
    const stored = toStoredOutputStatement(result.outputs[0]);

    expect(stored.text).toBe('21 pullups');
    expect(stored.metrics[0].value).toBe(21);
  });

  it('computes workload rollups', () => {
    const outputs = [
      { line: 1, text: '21 pullups', metrics: [{ name: 'pullups', type: 'reps', value: 21 }] },
      { line: 2, text: '15 pullups', metrics: [{ name: 'pullups', type: 'reps', value: 15 }] },
    ];
    const totals = computeWorkloadRollups(outputs);
    expect(totals['pullups']).toBe(36);
  });
});
