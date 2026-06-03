import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';

import { whiteboardScript } from './whiteboard-script-language';
import { extractSyntaxFacts } from './syntax-parser';

function buildState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [whiteboardScript()],
  });
}

describe('extractSyntaxFacts', () => {
  it('extracts primitive kind/raw/meta for each grammar fragment', () => {
    const state = buildState(`+ ^5:00 [:Row] (5-3-1) 95kg hard\n- *5:00 // note\n`);
    const facts = extractSyntaxFacts(state);

    expect(facts.statements).toHaveLength(2);
    const [statement, second] = facts.statements;

    expect(statement.primitives.map((primitive) => primitive.kind)).toEqual([
      'lap',
      'duration',
      'action',
      'rounds',
      'quantity',
      'effort',
      'effort',
    ]);

    expect(second.primitives.map((primitive) => primitive.kind)).toEqual(['lap', 'duration', 'text']);

    for (const primitive of [...statement.primitives, ...second.primitives]) {
      expect(primitive.raw.length).toBeGreaterThan(0);
      expect(primitive.meta.raw).toBe(primitive.raw);
      expect(typeof primitive.meta.line).toBe('number');
      expect(typeof primitive.meta.columnStart).toBe('number');
      expect(typeof primitive.meta.columnEnd).toBe('number');
    }

    expect(statement.primitives.find((primitive) => primitive.kind === 'duration')).toMatchObject({
      hasTrend: true,
      isRequired: false,
      timerRaw: '5:00',
    });

    expect(second.primitives.find((primitive) => primitive.kind === 'duration')).toMatchObject({
      hasTrend: false,
      isRequired: true,
      timerRaw: '5:00',
    });

    expect(statement.primitives.find((primitive) => primitive.kind === 'rounds')).toMatchObject({
      sequence: [5, 3, 1],
    });

    const quantities = statement.primitives.filter((primitive) => primitive.kind === 'quantity');
    // Units are no longer parsed: "95kg" yields a bare quantity (95) plus an
    // "kg" effort that the base Units Dialect later fuses.
    expect(quantities).toHaveLength(1);
    expect(quantities[0]).toMatchObject({
      value: 95,
      hasAtSign: false,
    });
  });

  it('extracts property statements as standalone metrics', () => {
    const state = buildState(`rpe: 8\nlocation: "Sender One"\n5 Pushups\n`);
    const facts = extractSyntaxFacts(state);

    expect(facts.statements).toHaveLength(3);
    expect(facts.statements[0].primitives).toHaveLength(1);
    expect(facts.statements[0].primitives[0]).toMatchObject({
      kind: 'property',
      key: 'rpe',
      valueRaw: '8',
      value: 8,
    });
    expect(facts.statements[1].primitives[0]).toMatchObject({
      kind: 'property',
      key: 'location',
      valueRaw: '"Sender One"',
      value: 'Sender One',
    });
    expect(facts.statements[2].primitives.map((primitive) => primitive.kind)).toEqual(['quantity', 'effort']);
  });

  it('extracts inline metric objects as metric_object primitives', () => {
    const state = buildState(`10 Pushups {"intensity": 80}\n5 Back Squat 225lb {"rpe": 8, "rir": 2}\n:30 Plank {"hrZone": 4, "focus": "core"}\n`);
    const facts = extractSyntaxFacts(state);

    expect(facts.statements).toHaveLength(3);

    const [first, second, third] = facts.statements;

    expect(first.primitives.map((p) => p.kind)).toEqual(['quantity', 'effort', 'metric_object']);
    expect(second.primitives.map((p) => p.kind)).toEqual(['quantity', 'effort', 'effort', 'quantity', 'effort', 'metric_object']);
    expect(third.primitives.map((p) => p.kind)).toEqual(['duration', 'effort', 'metric_object']);

    const firstMetricObj = first.primitives.find((p) => p.kind === 'metric_object') as any;
    expect(firstMetricObj.pairs).toEqual([{ key: 'intensity', value: 80 }]);

    const secondMetricObj = second.primitives.find((p) => p.kind === 'metric_object') as any;
    expect(secondMetricObj.pairs).toEqual([
      { key: 'rpe', value: 8 },
      { key: 'rir', value: 2 },
    ]);

    const thirdMetricObj = third.primitives.find((p) => p.kind === 'metric_object') as any;
    expect(thirdMetricObj.pairs).toEqual([
      { key: 'hrZone', value: 4 },
      { key: 'focus', value: 'core' },
    ]);
  });

  it('extracts metric objects with boolean and null values', () => {
    const state = buildState(`Run 400m {"record": true, "fast": false, "notes": null}\n`);
    const facts = extractSyntaxFacts(state);

    const metricObj = facts.statements[0].primitives.find((p) => p.kind === 'metric_object') as any;
    expect(metricObj.pairs).toEqual([
      { key: 'record', value: true },
      { key: 'fast', value: false },
      { key: 'notes', value: null },
    ]);
  });

  it('handles empty metric objects', () => {
    const state = buildState(`10 Pushups {}\n`);
    const facts = extractSyntaxFacts(state);

    const metricObj = facts.statements[0].primitives.find((p) => p.kind === 'metric_object') as any;
    expect(metricObj.pairs).toEqual([]);
  });

  it('preserves indentation-based ancestry and compose grouping', () => {
    const state = buildState(`- warmup\n  - squat\n  + press\n    - run\n`);
    const facts = extractSyntaxFacts(state);
    const byId = new Map(facts.statements.map((statement) => [statement.id, statement]));

    expect(facts.statements.map((statement) => statement.id)).toEqual([1, 2, 3, 4]);

    expect(byId.get(2)?.parentId).toBe(1);
    expect(byId.get(3)?.parentId).toBe(1);
    expect(byId.get(4)?.parentId).toBe(3);

    // Current behavior keeps deep descendants in all ancestors' flat child lists.
    expect(byId.get(1)?.children).toEqual([[2, 3], [4]]);
    expect(byId.get(3)?.children).toEqual([[4]]);
    expect(byId.get(2)?.children).toEqual([]);
  });

  describe('Slash/pipe token — "/" and "|" both produce slash primitives', () => {
    it('emits a slash primitive for a bare "/" between quantities', () => {
      const state = buildState(`185/125 lb\n`);
      const facts = extractSyntaxFacts(state);
      const kinds = facts.statements[0].primitives.map((p) => p.kind);
      expect(kinds).toContain('slash');
      const slash = facts.statements[0].primitives.find((p) => p.kind === 'slash')!;
      expect(slash.raw).toBe('/');
    });

    it('does NOT emit a slash primitive for "//" (comment)', () => {
      const state = buildState(`Run // at pace\n`);
      const facts = extractSyntaxFacts(state);
      const kinds = facts.statements[0].primitives.map((p) => p.kind);
      expect(kinds).not.toContain('slash');
      expect(kinds).toContain('text');
    });

    it('emits effort primitives on both sides of "/" in "Run/Walk"', () => {
      const state = buildState(`Run/Walk\n`);
      const facts = extractSyntaxFacts(state);
      const kinds = facts.statements[0].primitives.map((p) => p.kind);
      // slash appears as its own primitive between the two effort primitives
      expect(kinds).toEqual(['effort', 'slash', 'effort']);
    });

    it('emits a slash primitive for "|" (pipe is an alias for slash)', () => {
      const state = buildState(`Run | Walk\n`);
      const facts = extractSyntaxFacts(state);
      const kinds = facts.statements[0].primitives.map((p) => p.kind);
      // pipe emits the same Slash node type as "/"
      expect(kinds).toEqual(['effort', 'slash', 'effort']);
      const slash = facts.statements[0].primitives.find((p) => p.kind === 'slash')!;
      expect(slash.raw).toBe('|');
    });

    it('emits effort primitives on both sides of "|" in "Sprint | Jog"', () => {
      const state = buildState(`Sprint | Jog\n`);
      const facts = extractSyntaxFacts(state);
      const kinds = facts.statements[0].primitives.map((p) => p.kind);
      expect(kinds).toEqual(['effort', 'slash', 'effort']);
    });
  });
});
