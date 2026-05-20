import { describe, it, expect, beforeEach } from 'bun:test';
import { InMemoryEffortRegistry } from '../InMemoryEffortRegistry';
import { EffortResolver } from '../EffortResolver';
import {
  fixtureRunning,
  fixtureRowing,
  fixtureBackSquat,
  fixtureBurpee,
  fixturePlank,
  fixtureUserCustom,
  commonFixtureSet,
} from '../fixtures';

describe('EffortResolver', () => {
  let registry: InMemoryEffortRegistry;
  let resolver: EffortResolver;

  beforeEach(() => {
    registry = new InMemoryEffortRegistry();
    registry.seed(commonFixtureSet);
    resolver = new EffortResolver(registry);
  });

  describe('resolveBySlug', () => {
    it('returns effort for exact slug', () => {
      expect(resolver.resolveBySlug('rowing')).toEqual(fixtureRowing);
    });

    it('returns null for unknown slug', () => {
      expect(resolver.resolveBySlug('unknown')).toBeNull();
    });
  });

  describe('resolveByAlias', () => {
    it('matches exact label', () => {
      expect(resolver.resolveByAlias('Rowing')).toEqual(fixtureRowing);
    });

    it('matches alias', () => {
      expect(resolver.resolveByAlias('erg')).toEqual(fixtureRowing);
    });

    it('is case-insensitive', () => {
      expect(resolver.resolveByAlias('ROWING')).toEqual(fixtureRowing);
    });

    it('returns null for non-matching label', () => {
      expect(resolver.resolveByAlias('xyz')).toBeNull();
    });
  });

  describe('resolveFuzzy', () => {
    it('exact alias match returns effort (distance 0)', () => {
      expect(resolver.resolveFuzzy('rowing')).toEqual(fixtureRowing);
    });

    it('fuzzy match within threshold 2: "rwo" -> matches an effort (distance 2)', () => {
      const result = resolver.resolveFuzzy('rwo');
      // 'rwo' is distance 2 from both 'row' (rowing) and 'run' (running).
      // The resolver should return one of them; exact which one depends on iteration order.
      expect(result).not.toBeNull();
      expect(result!.slug === 'rowing' || result!.slug === 'running-6-mph').toBe(true);
    });

    it('fuzzy match exact alias: "row" -> "rowing"', () => {
      expect(resolver.resolveFuzzy('row')).toEqual(fixtureRowing);
    });

    it('fuzzy match for alias: "treadmil" -> "running-6-mph"', () => {
      expect(resolver.resolveFuzzy('treadmil')).toEqual(fixtureRunning);
    });

    it('creates synthetic effort when no fuzzy match within threshold', () => {
      const result = resolver.resolveFuzzy('xyz');
      expect(result).not.toBeNull();
      expect(result!.registrySource).toBe('synthetic-unresolved');
      expect(result!.slug).toBe('xyz');
    });

    it('creates synthetic effort for unmatched label', () => {
      const result = resolver.resolveFuzzy('completely-unknown-effort');
      expect(result).not.toBeNull();
      expect(result!.registrySource).toBe('synthetic-unresolved');
      expect(result!.slug).toBe('completely-unknown-effort');
      expect(result!.baseAttributes.met).toBe(5.0);
    });

    it('uses custom defaultMet from options', () => {
      const customResolver = new EffortResolver(registry, { defaultMet: 3.5 });
      const result = customResolver.resolveFuzzy('unknown');
      expect(result!.baseAttributes.met).toBe(3.5);
    });

    it('uses custom threshold from options', () => {
      // "rwoing" is distance 2 from "rowing"
      expect(resolver.resolveFuzzy('rwoing')).toEqual(fixtureRowing);
      // With threshold 1, should create synthetic
      const strictResolver = new EffortResolver(registry, { defaultThreshold: 1 });
      expect(strictResolver.resolveFuzzy('rwoing')!.registrySource).toBe('synthetic-unresolved');
    });

    it('overrides threshold per-call', () => {
      // "rwoing" is distance 2; default threshold is 2
      expect(resolver.resolveFuzzy('rwoing', { threshold: 1 })!.registrySource).toBe('synthetic-unresolved');
      expect(resolver.resolveFuzzy('rwoing', { threshold: 2 })).toEqual(fixtureRowing);
    });
  });

  describe('list', () => {
    it('returns all efforts from underlying registry', () => {
      expect(resolver.list()).toHaveLength(commonFixtureSet.length);
    });
  });

  describe('synthetic effort', () => {
    it('has deterministic slug from label', () => {
      const result = resolver.resolveFuzzy('My Weird Exercise');
      expect(result!.slug).toBe('my-weird-exercise');
    });

    it('has label in aliases', () => {
      const result = resolver.resolveFuzzy('weird');
      expect(result!.aliases).toContain('weird');
    });

    it('has no discipline or intensityTier', () => {
      const result = resolver.resolveFuzzy('weird');
      expect(result!.baseAttributes.discipline).toBeUndefined();
      expect(result!.baseAttributes.intensityTier).toBeUndefined();
    });
  });
});
