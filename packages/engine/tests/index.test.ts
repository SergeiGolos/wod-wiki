import { describe, it, expect } from 'vitest';
import { defineLanguagePack, registerLanguagePack, getRegisteredLanguagePacks, Metric, parseScript, parseQuery, isFindQuery } from '../src/index';

describe('@bitcobblers/wod-wiki-engine', () => {
  it('re-exports core, lang, and wql symbols', () => {
    const metric = new Metric('reps', 'reps', 10);
    expect(metric.value).toBe(10);

    const script = parseScript('21 pullups');
    expect(script.statements.length).toBe(1);

    const query = parseQuery('find:note');
    expect(isFindQuery(query) && query.target).toBe('note');
  });

  it('manages language packs', () => {
    const pack = defineLanguagePack({
      name: 'climb',
      dialects: ['climb'],
      version: '1.0.0',
    });

    registerLanguagePack(pack);
    const packs = getRegisteredLanguagePacks();
    expect(packs.some((p) => p.name === 'climb')).toBe(true);
  });
});
