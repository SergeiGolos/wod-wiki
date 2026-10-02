import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { highlightTree, tags as t } from '@lezer/highlight';
import { ensureSyntaxTree } from '@codemirror/language';
import {
  wqlLanguage,
  wqlCompletionSource,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from '../src/language';

const EFFORTS = ['thruster', 'back-squat', 'rowing'];
const source = wqlCompletionSource({ effortNames: () => EFFORTS });

function complete(doc: string, pos = doc.length) {
  const state = EditorState.create({ doc, extensions: [wqlLanguage] });
  ensureSyntaxTree(state, doc.length, 200);
  const labels = source(new CompletionContext(state, pos, true))?.options.map((o) => o.label);
  return labels ?? null;
}

describe('wqlCompletionSource', () => {
  it('offers aggregators at the query start', () => {
    expect(complete('')).toEqual(['find', 'sum', 'avg', 'min', 'max', 'count', 'last', 'delta']);
    expect(complete('su')).toEqual(['find', 'sum', 'avg', 'min', 'max', 'count', 'last', 'delta']);
  });

  it('offers Canonical Metric Keys after the head colon', () => {
    const labels = complete('sum:')!;
    expect(labels).toContain('totalVolume');
    expect(labels).toContain('tis');
    expect(labels).toContain('reps');
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
    expect(complete('sum:tis{grain:')).toEqual(['summary', 'event']);
  });

  it('offers injected typed-tag values for frontmatter tag filters', async () => {
    const typedSource = wqlCompletionSource({
      effortNames: () => EFFORTS,
      tagTypeValues: async (key) =>
        ({ domain: ['crossfit', 'parkour'], equipment: ['kettlebell', 'clubs'] })[key as 'domain' | 'equipment'] ?? [],
    });
    const completeAsync = async (doc: string): Promise<string[] | null> => {
      const state = EditorState.create({ doc, extensions: [wqlLanguage] });
      ensureSyntaxTree(state, doc.length, 200);
      const result = await typedSource(new CompletionContext(state, doc.length, true));
      return result && 'options' in result ? result.options.map((o) => o.label) : null;
    };
    expect(await completeAsync('find:note{domain:')).toEqual(['crossfit', 'parkour']);
    expect(await completeAsync('find:note{equipment:kettlebell')).toEqual(['kettlebell', 'clubs']);
  });

  it('falls through to catalog discovery when no typed-tag provider is injected', () => {
    // No tagTypeValues → domain: values stay on the catalog path (free-form
    // here, since the shared source has no catalog).
    expect(complete('find:note{domain:')).toBeNull();
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
    expect(labels).toContain('2w');
    expect(labels).toContain('4w');
  });

  it('offers structural suffixes after a complete head', () => {
    const labels = complete('sum:tis b')!;
    expect(labels).toEqual(['by {}', '.rollup()']);
  });
});

describe('wqlCompletionSource — aggressive slots', () => {
  const at = (doc: string, from: number, to: number) => {
    const state = EditorState.create({ doc, selection: { anchor: from, head: to }, extensions: [wqlLanguage] });
    ensureSyntaxTree(state, doc.length, 200);
    const result = source(new CompletionContext(state, to, false)) as any;
    return result && { labels: result.options.map((o: any) => o.label), from: result.from, to: result.to, filter: result.filter };
  };

  it('offers every sibling when a slot token is selected, replacing it', () => {
    const head = at('find:note last 2w', 0, 4)!;
    expect(head.labels).toEqual(['find', 'sum', 'avg', 'min', 'max', 'count', 'last', 'delta']);
    expect([head.from, head.to, head.filter]).toEqual([0, 4, false]);

    const target = at('find:note last 2w', 5, 9)!;
    expect(target.labels).toEqual(['note', 'block', 'effort', 'session', 'segment', 'event']);
    expect([target.from, target.to, target.filter]).toEqual([5, 9, false]);
  });

  it('offers values for the selected filter value and keys for the selected key', () => {
    const doc = 'find:note{source:journal}';
    expect(at(doc, 17, 24)!.labels).toEqual(['journal', 'collections', 'feeds', 'guides', 'playground']);
    expect(at(doc, 10, 16)!.labels).toEqual([...WQL_TAG_KEYS]);
  });

  it('opens the next slot right after a separator without a keystroke', () => {
    const state = EditorState.create({ doc: 'find:note{', extensions: [wqlLanguage] });
    ensureSyntaxTree(state, 10, 200);
    const result = source(new CompletionContext(state, 10, false)) as any;
    expect(result.options.map((o: any) => o.label)).toEqual([...WQL_TAG_KEYS]);
    const valueState = EditorState.create({ doc: 'find:note{source:', extensions: [wqlLanguage] });
    ensureSyntaxTree(valueState, 17, 200);
    const values = source(new CompletionContext(valueState, 17, false)) as any;
    expect(values.options.map((o: any) => o.label)).toContain('journal');
  });

  it('prefers host-supplied values over static vocabularies', async () => {
    const hosted = wqlCompletionSource({ values: async (key) => (key === 'source' ? [{ label: 'mine' }] : []) });
    const doc = 'find:note{source:';
    const state = EditorState.create({ doc, extensions: [wqlLanguage] });
    ensureSyntaxTree(state, doc.length, 200);
    const result = (await hosted(new CompletionContext(state, doc.length, true))) as any;
    expect(result.options.map((o: any) => o.label)).toEqual(['mine']);
  });
});

describe('wqlLanguage highlighting', () => {
  it('tags the structural roles distinctly', () => {
    const doc = 'sum:totalVolume{effort:thruster} by {week}.rollup(2w)';
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

    expect(classes['sum']).toBe('keyword');
    expect(classes['totalVolume']).toBe('variable');
    expect(classes['effort']).toBe('property');
    expect(classes['thruster']).toBe('string');
    expect(classes['week']).toBe('attribute');
    expect(classes['by']).toBe('keyword');
    expect(classes['.rollup']).toBe('keyword');
    expect(classes['2']).toBe('number');
    expect(classes['w']).toBe('unit');
  });
});
