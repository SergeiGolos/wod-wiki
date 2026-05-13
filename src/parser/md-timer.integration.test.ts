import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';

import { extractStatements } from './lezer-mapper';
import { MdTimerRuntime } from './md-timer';
import { whiteboardScript } from './whiteboard-script-language';

function snapshotStatement(statement: any) {
  return {
    id: statement.id,
    parent: statement.parent,
    children: statement.children,
    isLeaf: statement.isLeaf,
    meta: statement.meta,
    metrics: statement.rawMetrics.map((metric: any) => ({
      type: metric.type,
      value: metric.value,
      action: metric.action,
      unit: metric.unit,
      origin: metric.origin,
      meta: statement.metricMeta.get(metric),
    })),
    hints: statement.hints ? Array.from(statement.hints).sort() : [],
  };
}

describe('MdTimerRuntime.read integration', () => {
  const sampleInput = `- warmup\n  + ^5:00 [:Row] 500 m hard\n  - *3:00 [:Bike] @20\n`;

  it('matches extractStatements() pipeline output byte-for-byte for normalized statements', () => {
    const runtime = new MdTimerRuntime();
    const script = runtime.read(sampleInput);

    const state = EditorState.create({
      doc: sampleInput,
      extensions: [whiteboardScript()],
    });

    const baseline = extractStatements(state);

    expect(script.statements.map(snapshotStatement)).toEqual(baseline.map(snapshotStatement));
  });

  it('round-trips representative input without parse errors', () => {
    const runtime = new MdTimerRuntime();
    const script = runtime.read(sampleInput);

    expect(script.source).toBe(sampleInput);
    expect(script.errors).toEqual([]);
    expect(script.statements.length).toBeGreaterThan(0);
  });
});
