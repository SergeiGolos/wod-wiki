import { describe, it, expect } from 'bun:test';
import { UnitRegistry } from '../UnitRegistry';

describe('UnitRegistry', () => {
  const std = UnitRegistry.standard();

  describe('lookup', () => {
    it('resolves canonical spellings', () => {
      expect(std.get('m')?.dimension).toBe('length');
      expect(std.get('kg')?.dimension).toBe('mass');
      expect(std.get('cal')?.dimension).toBe('energy');
    });

    it('resolves aliases to the canonical unit', () => {
      expect(std.get('miles')?.canonical).toBe('mi');
      expect(std.get('lbs')?.canonical).toBe('lb');
      expect(std.get('pound')?.canonical).toBe('lb');
      expect(std.get('inches')?.canonical).toBe('in');
      expect(std.get('calories')?.canonical).toBe('cal');
    });

    it('is case-insensitive', () => {
      expect(std.get('KG')?.canonical).toBe('kg');
      expect(std.get('Miles')?.canonical).toBe('mi');
    });

    it('trims whitespace', () => {
      expect(std.get('  kg  ')?.canonical).toBe('kg');
    });

    it('returns undefined for non-units', () => {
      expect(std.get('Burpees')).toBeUndefined();
      expect(std.has('Run')).toBe(false);
    });
  });

  describe('consumeLeading', () => {
    it('peels a contiguous unit (no residual)', () => {
      const m = std.consumeLeading('kg');
      expect(m?.unit.canonical).toBe('kg');
      expect(m?.token).toBe('kg');
      expect(m?.rest).toBe('');
    });

    it('peels a leading unit and keeps the residual text', () => {
      const m = std.consumeLeading('m Run');
      expect(m?.unit.canonical).toBe('m');
      expect(m?.rest).toBe('Run');
    });

    it('peels an aliased unit', () => {
      const m = std.consumeLeading('mile Run');
      expect(m?.unit.canonical).toBe('mi');
      expect(m?.token).toBe('mile');
      expect(m?.rest).toBe('Run');
    });

    it('returns null when the leading word is not a unit', () => {
      expect(std.consumeLeading('Burpees')).toBeNull();
      expect(std.consumeLeading('Wall Balls')).toBeNull();
    });

    it('does not fuse a number-only string', () => {
      expect(std.consumeLeading('100')).toBeNull();
    });
  });

  describe('extend / override', () => {
    it('adds a new unit without disturbing the base', () => {
      const set = std.extend({ canonical: 'pood', dimension: 'mass', aliases: ['poods'] });
      expect(set.get('pood')?.canonical).toBe('pood');
      expect(set.get('poods')?.canonical).toBe('pood');
      // base still intact
      expect(set.get('kg')?.canonical).toBe('kg');
    });

    it('later definition wins on token collision (override)', () => {
      const overridden = std.extend({ canonical: 'm', dimension: 'length', aliases: ['mile', 'miles'] });
      // "mile" now resolves to canonical "m" instead of "mi"
      expect(overridden.get('mile')?.canonical).toBe('m');
    });

    it('does not mutate the original set', () => {
      std.extend({ canonical: 'pood', dimension: 'mass', aliases: [] });
      expect(std.has('pood')).toBe(false);
    });
  });

  describe('UnitRegistry.of', () => {
    it('builds an isolated set', () => {
      const set = UnitRegistry.of([{ canonical: 'rep', dimension: 'count', aliases: ['reps'] }]);
      expect(set.get('reps')?.canonical).toBe('rep');
      expect(set.has('kg')).toBe(false);
    });
  });
});
