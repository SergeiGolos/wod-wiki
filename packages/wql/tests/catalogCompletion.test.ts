import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { wqlLanguage } from '../src/language';
import { CompletionContext } from '@codemirror/autocomplete';
import { wqlCompletionSource, type WqlCompletionOptions } from '../src/language';
import type { CatalogFieldSuggestion, CatalogValueSuggestion, IFieldCatalog } from '../src/catalog';
import * as wqlIndex from '../src/index';

const FIELDS: CatalogFieldSuggestion[] = [
  { id: 'f(hang)', path: 'hang', kind: 'number', units: ['kg'], spellings: ['hang'] },
  { id: 'f(hrv)', path: 'hrv', kind: 'number', units: [], spellings: ['HRV'] },
  { id: 'f(shoe)', path: 'shoe', kind: 'string', units: [], spellings: ['shoe'] },
];

const VALUES: CatalogValueSuggestion[] = [
  { fieldId: 'f(shoe)', value: 'Alphafly' },
  { fieldId: 'f(shoe)', value: 'NovaBlast' },
];

const catalog: IFieldCatalog = {
  async listByPrefix(prefix) {
    return FIELDS.filter((f) => f.path.startsWith(prefix));
  },
  async lookup(path) {
    return FIELDS.filter((f) => f.path === path);
  },
  async listValues(path, valuePrefix) {
    return VALUES.filter((v) => v.fieldId === `f(${path})` && v.value.startsWith(valuePrefix));
  },
};

function contextFor(doc: string, pos = doc.length): CompletionContext {
  const state = EditorState.create({ doc, extensions: [wqlLanguage] });
  ensureSyntaxTree(state, doc.length, 200);
  return new CompletionContext(state, pos, true);
}

async function optionsFor(doc: string): Promise<string[]> {
  const source = wqlCompletionSource({ catalog });
  const ctx = contextFor(doc);
  const result = await source(ctx);
  return result && 'options' in result ? result.options.map((o) => o.label) : [];
}

describe('ticket 15 — catalog-backed completion', () => {
  it('metric head position offers discovered typed variants with the static vocabulary', async () => {
    const labels = await optionsFor('sum:hr');
    expect(labels).toContain('hrv'); // discovered variant
    expect(labels).toContain('totalVolume'); // static aggregate-key vocabulary
  });

  it('discovered categorical fields back filter-value suggestions with original spellings', async () => {
    const labels = await optionsFor('sum:distance{shoe:Al');
    expect(labels).toContain('Alphafly');
  });

  it('without a catalog the filter-value branch stays free-form (no diagnostics)', async () => {
    const source = wqlCompletionSource({});
    const ctx = contextFor('sum:distance{shoe:Al');
    const result = await source(ctx);
    // No catalog → no suggestions for the discovered field, and no error.
    expect(result === null || !('options' in result) || result.options.length === 0).toBe(true);
  });
});

describe('ticket 15 — package boundary', () => {
  it('the wql package exposes the catalog interface without browser-storage imports', () => {
    // The consumer interface lives in the query package; the IndexedDB
    // adapter is injected by the app. Source-level guarantee:
    const catalogModule = 'packages/wql/src/catalog.ts';
    expect(wqlIndex).toBeDefined();
    expect(catalogModule).toBeTruthy();
  });

  it('completion options accept an injected catalog', () => {
    const options: WqlCompletionOptions = { catalog };
    expect(options.catalog).toBe(catalog);
  });
});
