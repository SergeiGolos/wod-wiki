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
      'quantity',
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
    expect(quantities[0]).toMatchObject({
      value: 95,
      unit: '',
      hasWeightUnit: false,
      hasDistanceUnit: false,
      hasAtSign: false,
    });
    expect(quantities[1]).toMatchObject({
      value: undefined,
      unit: 'kg',
      hasWeightUnit: true,
      hasDistanceUnit: false,
      hasAtSign: false,
    });
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
});
