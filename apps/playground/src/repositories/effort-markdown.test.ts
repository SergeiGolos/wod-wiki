import { describe, it, expect } from 'bun:test';
import { effortToDocument, documentToEffort } from './effort-markdown';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';

describe('effort-markdown document format', () => {
  const fullEffort: IEffort = {
    id: 'effort-user-test',
    slug: 'running',
    label: 'Running',
    aliases: ['jogging', 'sprint'],
    baseAttributes: { met: 5.0, discipline: 'running', intensityTier: 'moderate' },
    registrySource: 'user',
    derivation: {
      parentSlug: 'base-running',
      coefficients: { met: 1.1 },
      hardOverrides: { label: 'Fast Running' },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  };

  it('round-trips a full effort', () => {
    const doc = effortToDocument(fullEffort);
    const { effort, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(effort).toEqual(fullEffort);
  });

  it('round-trips a minimal effort', () => {
    const minimal: IEffort = {
      id: 'effort-user-min',
      slug: 'push-ups',
      label: 'Push-ups',
      aliases: [],
      baseAttributes: { met: 3.8 },
      registrySource: 'user',
    };
    const doc = effortToDocument(minimal);
    const { effort, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(effort).toEqual(minimal);
  });

  it('uses fallback for missing frontmatter', () => {
    const fallback: IEffort = {
      id: 'effort-user-fb',
      slug: 'fallback',
      label: 'Fallback',
      aliases: [],
      baseAttributes: { met: 4.0 },
      registrySource: 'user',
    };
    const { effort, errors } = documentToEffort('no frontmatter here', fallback);
    expect(errors.length).toBeGreaterThan(0);
    expect(effort.id).toBe(fallback.id);
  });

  it('quotes strings with special characters', () => {
    const effort: IEffort = {
      ...fullEffort,
      label: 'Run: Fast!',
      aliases: ['run: fast'],
    };
    const doc = effortToDocument(effort);
    expect(doc).toContain('label: "Run: Fast!"');
    expect(doc).toContain('- "run: fast"');
    const { effort: parsed, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(parsed.label).toBe('Run: Fast!');
    expect(parsed.aliases).toContain('run: fast');
  });

  it('normalizes empty aliases to []', () => {
    const effort: IEffort = { ...fullEffort, aliases: [] };
    const doc = effortToDocument(effort);
    expect(doc).toContain('aliases: []');
    const { effort: parsed, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(parsed.aliases).toEqual([]);
  });

  it('round-trips body text', () => {
    const effort: IEffort = { ...fullEffort, body: 'Great for cardio.\n\nStart slow and build up.' };
    const doc = effortToDocument(effort);
    expect(doc).toContain('---\n\nGreat for cardio.');
    const { effort: parsed, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(parsed.body).toBe('Great for cardio.\n\nStart slow and build up.');
  });

  it('omits body when undefined', () => {
    const doc = effortToDocument(fullEffort);
    const lines = doc.split('\n');
    const lastFmLine = lines.lastIndexOf('---');
    expect(lastFmLine).toBeGreaterThan(-1);
    expect(lines.slice(lastFmLine + 1).join('\n').trim()).toBe('');
    const { effort: parsed, errors } = documentToEffort(doc);
    expect(errors).toEqual([]);
    expect(parsed.body).toBeUndefined();
  });

  it('validates slug format', () => {
    const bad = effortToDocument({ ...fullEffort, slug: 'Bad Slug!' });
    const { errors } = documentToEffort(bad);
    expect(errors).toContain('Invalid slug: must be lowercase letters, numbers, and hyphens only');
  });

  it('rejects met values that are not finite positive numbers', () => {
    // '5x' matters: parseFloat accepted it as 5; the parser must not.
    for (const met of ['0', '-2', 'abc', '5x', '']) {
      const doc = `---\nslug: run\nlabel: Run\nbaseAttributes:\n  met: ${met}\n---\n`;
      expect(documentToEffort(doc).errors.length).toBeGreaterThan(0);
    }
  });

  it('names baseAttributes.met for missing or misplaced met', () => {
    // Create with no met anywhere: absence must not be erased by a 0 default.
    const missing = documentToEffort('---\nslug: run\nlabel: Run\n---\n');
    expect(missing.errors.join('\n')).toContain('baseAttributes.met');
    expect(missing.effort.baseAttributes.met).toBeUndefined();

    // Top-level met: 5 is misplaced, not invalid — and the edit fallback
    // must not silently rescue the misplacement.
    const misplacedDoc = '---\nslug: run\nlabel: Run\nmet: 5\n---\n';
    expect(documentToEffort(misplacedDoc).errors.join('\n')).toContain('baseAttributes.met');
    expect(documentToEffort(misplacedDoc, fullEffort).errors.join('\n')).toContain('baseAttributes.met');
  });

  it('accepts nested positive met and keeps the edit fallback for absent met', () => {
    const nested = documentToEffort('---\nslug: run\nlabel: Run\nbaseAttributes:\n  met: 5\n---\n');
    expect(nested.errors).toEqual([]);
    expect(nested.effort.baseAttributes.met).toBe(5);

    const edited = documentToEffort('---\nslug: run\nlabel: Run\n---\n', fullEffort);
    expect(edited.errors).toEqual([]);
    expect(edited.effort.baseAttributes.met).toBe(fullEffort.baseAttributes.met);
  });

  it('rejects a non-finite met arriving via the edit fallback', () => {
    const bad: IEffort = { ...fullEffort, baseAttributes: { ...fullEffort.baseAttributes, met: Infinity } };
    const { errors } = documentToEffort('---\nslug: run\nlabel: Run\n---\n', bad);
    expect(errors.join('\n')).toContain('baseAttributes.met');
  });
});
