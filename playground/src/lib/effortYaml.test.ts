import { describe, it, expect } from 'bun:test';
import { effortToDocument, documentToEffort } from './effortYaml';
import type { IEffort } from '@/effort-registry';

describe('effortYaml', () => {
  const fullEffort: IEffort = {
    id: 'effort-user-test',
    slug: 'running',
    label: 'Running',
    aliases: ['jogging', 'sprint'],
    baseAttributes: { met: 5.0, discipline: 'cardio', intensityTier: 'moderate' },
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

  it('validates met is positive', () => {
    const bad = effortToDocument({ ...fullEffort, baseAttributes: { ...fullEffort.baseAttributes, met: -1 } });
    const { errors } = documentToEffort(bad);
    expect(errors).toContain('Invalid met: must be a positive number');
  });
});
