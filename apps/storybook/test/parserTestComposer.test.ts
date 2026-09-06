import { describe, expect, it } from 'vitest';
import { parseScript } from '@bitcobblers/wod-wiki-engine';

import {
  collectOriginSuggestions,
  collectTypeSuggestions,
  composeDsl,
  decomposeDsl,
  metricToComposer,
  toTimeText,
  type ComposerMetric,
} from '../src/parser-tests/dslComposer';
import { validateMetricDsl } from '../src/parser-tests/runnerCore';

const compose = (partial: Partial<ComposerMetric> & { type: string }): string =>
  composeDsl({ kind: 'undefined', ...partial });

describe('composeDsl', () => {
  it('renders every value kind into parseable DSL', () => {
    expect(compose({ type: 'Rep', kind: 'number', number: '10', origin: 'parser' })).toBe('Rep 10 @parser');
    expect(compose({ type: 'Duration', kind: 'number', number: '0:30' })).toBe('Duration 0:30');
    expect(compose({ type: 'Effort', kind: 'text', text: 'Burpees' })).toBe('Effort Burpees');
    expect(compose({ type: 'Effort', kind: 'text', text: 'Burpee broad jumps' })).toBe(
      'Effort "Burpee broad jumps"',
    );
    expect(compose({ type: 'Resistance', kind: 'amount-unit', amount: '225', unit: 'lb' })).toBe(
      'Resistance 225 lb',
    );
    expect(
      compose({
        type: 'ClimbGrade',
        kind: 'fields',
        fields: [
          { key: 'raw', value: 'V5' },
          { key: 'system', value: 'v-scale' },
        ],
        origin: 'dialect',
      }),
    ).toBe('ClimbGrade raw:V5 system:v-scale @dialect');
    expect(compose({ type: 'Reps', kind: 'undefined' })).toBe('Reps ?');
  });

  it('rejects malformed drafts with readable errors', () => {
    expect(() => compose({ type: '', kind: 'undefined' })).toThrow(/type is required/i);
    expect(() => compose({ type: 'Two Words', kind: 'undefined' })).toThrow(/cannot contain spaces/i);
    expect(() => compose({ type: 'Rep', kind: 'number', number: 'ten' })).toThrow(/plain number|clock/i);
    expect(() => compose({ type: 'Resistance', kind: 'amount-unit', amount: '225', unit: '' })).toThrow(/unit/i);
    expect(() =>
      compose({ type: 'Grade', kind: 'fields', fields: [{ key: 'bad key', value: 'x' }] }),
    ).toThrow(/field key/i);
    expect(() => compose({ type: 'Grade', kind: 'fields', fields: [] })).toThrow(/at least one/i);
  });

  it('every composed line passes the runner-side DSL validator', () => {
    const lines = [
      compose({ type: 'Rep', kind: 'number', number: '21', origin: 'parser' }),
      compose({ type: 'Duration', kind: 'number', number: '1:30', origin: 'hinted' }),
      compose({ type: 'Text', kind: 'text', text: 'has  spaces inside quotes' }),
      compose({ type: 'Distance', kind: 'amount-unit', amount: '5', unit: 'km' }),
      compose({ type: 'TIS', kind: 'fields', fields: [{ key: 'score', value: '42' }] }),
      compose({ type: 'Calories', kind: 'undefined' }),
    ];
    for (const line of lines) expect(validateMetricDsl(line)).toBeNull();
  });
});

describe('decomposeDsl', () => {
  it('splits DSL lines into editable drafts', () => {
    expect(decomposeDsl('Duration 0:30 @parser')).toMatchObject({
      type: 'Duration',
      kind: 'number',
      number: '0:30',
      origin: 'parser',
    });
    const effort = decomposeDsl('Effort "Burpee broad jumps"');
    expect(effort).toMatchObject({ type: 'Effort', kind: 'text', text: 'Burpee broad jumps' });
    expect(effort.origin).toBeUndefined();
    expect(decomposeDsl('Resistance 225 lb')).toMatchObject({
      type: 'Resistance',
      kind: 'amount-unit',
      amount: '225',
      unit: 'lb',
    });
    expect(decomposeDsl('ClimbGrade raw:V5 system:v-scale @dialect')).toMatchObject({
      type: 'Climb-grade',
      kind: 'fields',
      fields: [
        { key: 'raw', value: 'V5' },
        { key: 'system', value: 'v-scale' },
      ],
    });
    expect(decomposeDsl('Reps ? @hinted')).toMatchObject({ type: 'Reps', kind: 'undefined', origin: 'hinted' });
  });

  it('compose(decompose(x)) is stable for display-form lines', () => {
    const lines = [
      'Resistance 225 lb @parser',
      'Climb-grade raw:V5 system:v-scale @dialect',
      'Rep 5.12',
      'Reps ? @hinted',
      'Hint workout.amrap @dialect',
    ];
    for (const line of lines) {
      expect(composeDsl(decomposeDsl(line))).toBe(line);
    }
    // Quoting is optional for single-token strings — the DSL normalizes it away.
    expect(composeDsl(decomposeDsl('Effort "Burpees" @parser'))).toBe('Effort Burpees @parser');
    expect(decomposeDsl('Effort "Burpees" @parser')).toEqual(decomposeDsl('Effort Burpees @parser'));
  });

  it('canonicalizes but preserves meaning of non-display forms', () => {
    const roundTripped = composeDsl(decomposeDsl('ClimbGrade raw:V5 system:v-scale @dialect'));
    expect(roundTripped).toBe('Climb-grade raw:V5 system:v-scale @dialect');
    expect(decomposeDsl(roundTripped)).toEqual(decomposeDsl('ClimbGrade raw:V5 system:v-scale @dialect'));
  });
});

describe('metricToComposer', () => {
  it('prefills from real parser output so composed DSL matches the actual', () => {
    const script = parseScript('10 Burpees\nThrusters 95lb\n*:30 Rest');
    const [reps, resistance, rest] = script.statements;
    const repMetric = reps!.metrics.getAll().find((m) => String(m.type) === 'rep')!;
    expect(composeDsl(metricToComposer(repMetric))).toBe('Rep 10 @parser');

    const resistanceMetric = resistance!.metrics.getAll().find((m) => String(m.type) === 'resistance')!;
    const resistanceDraft = metricToComposer(resistanceMetric);
    expect(resistanceDraft.kind).toBe('amount-unit');
    expect(composeDsl(resistanceDraft)).toBe('Resistance 95 lb @parser');

    const durationMetric = rest!.metrics.getAll().find((m) => String(m.type) === 'duration')!;
    expect(composeDsl(metricToComposer(durationMetric))).toBe('Duration 0:30 @parser');
  });
});

describe('toTimeText', () => {
  it('renders whole-second durations as clock literals and rejects the rest', () => {
    expect(toTimeText(30_000)).toBe('0:30');
    expect(toTimeText(3_660_000)).toBe('1:01:00');
    expect(toTimeText(1500)).toBeNull();
    expect(toTimeText(-1)).toBeNull();
  });
});

describe('collectSuggestions', () => {
  it('derives type and origin vocabulary from the current structure', () => {
    const script = parseScript('10 Burpees\nThrusters 95lb');
    const types = collectTypeSuggestions(script.statements);
    const origins = collectOriginSuggestions(script.statements);
    expect(types).toContain('rep');
    expect(types).toContain('effort');
    expect(types).toContain('resistance');
    expect(new Set(types).size).toBe(types.length);
    expect(origins).toEqual(['parser']);
  });
});
