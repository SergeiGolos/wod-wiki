import { describe, expect, it } from 'vitest';
import { parseQuery } from '../src/wql';

describe('aggregate filter-key validation', () => {
  it('rejects keys the fact rows cannot resolve, naming the supported set', () => {
    const r = parseQuery('sum:totalVolume{text:fran}');
    expect(r.error).toContain('Unsupported filter key(s) "text"');
    expect(r.error).toContain('effort, discipline, intensity, grade');
  });

  it('rejects unknown keys on the metric half of a cross-store join', () => {
    const r = parseQuery('find:note{tags:pr} last 8w where sum:totalVolume{text:x} > 5');
    expect(r.error).toContain('Unsupported filter key(s) "text"');
  });

  it('accepts every resolvable tag key, including grade', () => {
    expect(parseQuery('sum:totalVolume{grade:V8,effort:back-squat,tags:pr}').error).toBeUndefined();
  });
});

describe('find:effort advisories', () => {
  it('advises that the window is ignored — the registry has no time dimension', () => {
    const r = parseQuery('find:effort{text:hangboard} last 4w');
    expect(r.error).toBeUndefined();
    expect(r.advisories?.join(' ')).toContain('ignores the window');
  });

  it('advises that unsupported filter keys are ignored', () => {
    const r = parseQuery('find:effort{text:hangboard,source:journal,tags:climbing}');
    expect(r.error).toBeUndefined();
    const advisories = r.advisories?.join(' ') ?? '';
    expect(advisories).toContain("'source:'");
    expect(advisories).toContain("'tags:'");
  });

  it('stays silent for fully supported effort queries', () => {
    const r = parseQuery('find:effort{text:hangboard}');
    expect(r.error).toBeUndefined();
    expect(r.advisories).toBeUndefined();
  });
});
