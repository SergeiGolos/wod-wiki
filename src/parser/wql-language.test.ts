/**
 * WQL language support tests — completion vocabulary and styleTags
 * highlighting for the query field (src/grammar/wql.grammar house pattern).
 *
 * Defends the observable contracts:
 *   1. Completion offers the analytics dictionary at each syntactic position:
 *      aggregators at the head, Canonical Metric Keys after the colon, tag
 *      keys inside braces, resolver-fed effort names + canonical vocabularies
 *      for tag values, virtual dims in group-by, rollup periods.
 *   2. Highlighting tags the structural nodes (aggregator, metric, tag key /
 *      value, dimension, rollup) with distinct lezer tags.
 */
import { describe, it, expect } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { highlightTree, tags as t } from '@lezer/highlight';
import { ensureSyntaxTree } from '@codemirror/language';
import {
  wqlLanguage,
  wqlCompletionSource,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from './wql-language';

const EFFORTS = ['thruster', 'back-squat', 'rowing'];
const source = wqlCompletionSource({ effortNames: () => EFFORTS });

function complete(doc: string, pos = doc.length) {
  const state = EditorState.create({ doc, extensions: [wqlLanguage] });
  // CompletionContext reads the syntax tree through state.
  ensureSyntaxTree(state, doc.length, 200);
  const labels = source(new CompletionContext(state, pos, true))?.options.map((o) => o.label);
  return labels ?? null;
}

describe('wqlCompletionSource', () => {
  it('offers aggregators at the query start', () => {
    expect(complete('')).toEqual(['sum', 'avg', 'min', 'max', 'count', 'last', 'delta']);
    expect(complete('su')).toEqual(['sum', 'avg', 'min', 'max', 'count', 'last', 'delta']);
  });

  it('offers Canonical Metric Keys after the head colon', () => {
    const labels = complete('sum:')!;
    expect(labels).toContain('totalVolume');
    expect(labels).toContain('tis');
    expect(labels).toContain('reps');
    // Effort-scoped keys from the resolver feed.
    expect(labels).toContain('thruster.reps');
    expect(labels).toContain('back-squat.resistance');
    expect(labels).toContain('calc.');
  });

  it('offers tag keys inside the filter braces', () => {
    const labels = complete('sum:tis{')!;
    expect(labels).toEqual([...WQL_TAG_KEYS]);
  });

  it('offers resolver-fed effort names for effort values', () => {
    expect(complete('sum:tis{effort:')).toEqual(EFFORTS);
    expect(complete('sum:tis{effort:th')).toEqual(EFFORTS);
  });

  it('offers the canonical discipline vocabulary for discipline values', () => {
    const labels = complete('sum:tis{discipline:')!;
    expect(labels).toContain('strength');
    expect(labels).toContain('kettlebell');
    expect(labels).toHaveLength(10);
  });

  it('offers intensity tiers and grains for their values', () => {
    expect(complete('sum:tis{intensity:')).toEqual(['low', 'moderate', 'high']);
    expect(complete('sum:tis{grain:')).toEqual(['segment', 'summary']);
  });

  it('offers nothing for free-form tag values', () => {
    expect(complete('sum:tis{note:')).toBeNull();
  });

  it('offers virtual dims and tag keys in group-by', () => {
    const labels = complete('sum:tis{} by {')!;
    for (const dim of WQL_VIRTUAL_DIMS) expect(labels).toContain(dim);
    expect(labels).toContain('effort');
  });

  it('offers rollup periods inside .rollup()', () => {
    const labels = complete('sum:tis{}.rollup(')!;
    expect(labels).toContain('1d');
    expect(labels).toContain('1w');
  });

  it('offers structural suffixes after a complete head', () => {
    const labels = complete('sum:tis b')!;
    expect(labels).toEqual(['by {}', '.rollup()']);
  });
});

describe('wqlLanguage highlighting', () => {
  it('tags the structural roles distinctly', () => {
    const doc = 'sum:totalVolume{effort:thruster} by {week}.rollup(1w)';
    const tree = wqlLanguage.parser.parse(doc);
    const classes: Record<string, string> = {};
    highlightTree(
      tree,
      {
        style: (tags) => {
          if (tags.includes(t.keyword)) return 'keyword';
          if (tags.includes(t.variableName)) return 'variable';
          if (tags.includes(t.propertyName)) return 'property';
          if (tags.includes(t.string)) return 'string';
          if (tags.includes(t.attributeName)) return 'attribute';
          if (tags.includes(t.number)) return 'number';
          if (tags.includes(t.unit)) return 'unit';
          return null;
        },
      },
      (from, to, cls) => {
        classes[doc.slice(from, to)] = cls;
      },
    );

    expect(classes['sum']).toBe('keyword'); // aggregator
    expect(classes['totalVolume']).toBe('variable'); // Canonical Metric Key
    expect(classes['effort']).toBe('property'); // tag key
    expect(classes['thruster']).toBe('string'); // tag value
    expect(classes['week']).toBe('attribute'); // dimension
    expect(classes['by']).toBe('keyword');
    expect(classes['.rollup']).toBe('keyword');
    expect(classes['1']).toBe('number');
    expect(classes['w']).toBe('unit');
  });
});
