import { describe, expect, it } from 'bun:test';
import {
  convert,
  getUnitFamily,
  KG_PER_LB,
  resolveDisplayUnit,
  UNIT_FAMILIES,
} from './units';

describe('analytics units', () => {
  describe('convert', () => {
    it('uses the exact kg-per-lb factor for lb → kg', () => {
      expect(convert(1, 'lb', 'kg')).toBe(KG_PER_LB);
      expect(convert(2, 'lb', 'kg')).toBe(2 * KG_PER_LB);
      expect(convert(4500, 'lb', 'kg')).toBe(4500 * KG_PER_LB);
    });

    it('converts kg → lb using the inverse of the exact factor', () => {
      expect(convert(1, 'kg', 'lb')).toBeCloseTo(1 / KG_PER_LB, 10);
      expect(convert(100, 'kg', 'lb')).toBeCloseTo(100 / KG_PER_LB, 10);
    });

    it('round-trips mass conversions', () => {
      expect(convert(convert(100, 'lb', 'kg'), 'kg', 'lb')).toBe(100);
      expect(convert(convert(50, 'kg', 'lb'), 'lb', 'kg')).toBe(50);
    });

    it('converts distance m ↔ km', () => {
      expect(convert(1000, 'm', 'km')).toBe(1);
      expect(convert(5, 'km', 'm')).toBe(5000);
    });

    it('returns the value unchanged when units are equal or unknown', () => {
      expect(convert(42, 'kg', 'kg')).toBe(42);
      expect(convert(42, 'reps', 'kg')).toBe(42);
      expect(convert(42, 'lb', 'm')).toBe(42);
      expect(convert(42, undefined, 'kg')).toBe(42);
      expect(convert(42, 'kg', undefined)).toBe(42);
    });
  });

  describe('getUnitFamily', () => {
    it('identifies mass and distance units', () => {
      expect(getUnitFamily('kg')).toBe('mass');
      expect(getUnitFamily('lb')).toBe('mass');
      expect(getUnitFamily('m')).toBe('distance');
      expect(getUnitFamily('km')).toBe('distance');
    });

    it('returns undefined for unrelated units', () => {
      expect(getUnitFamily('reps')).toBeUndefined();
      expect(getUnitFamily('pts')).toBeUndefined();
      expect(getUnitFamily(undefined)).toBeUndefined();
    });

    it('exposes every unit in a family', () => {
      expect(Object.keys(UNIT_FAMILIES.mass.units).sort()).toEqual(['kg', 'lb']);
      expect(Object.keys(UNIT_FAMILIES.distance.units).sort()).toEqual(['km', 'm']);
    });
  });

  describe('resolveDisplayUnit', () => {
    const lbFacts = [{ unit: 'lb' }, { unit: 'lb' }] as const;
    const kgFacts = [{ unit: 'kg' }] as const;
    const noUnitFacts = [{}] as const;
    const repsFacts = [{ unit: 'reps' }] as const;

    it('prefers an explicit directive when it matches the family', () => {
      expect(resolveDisplayUnit(lbFacts, { directive: 'kg' })).toEqual({ unit: 'kg', convert: true });
      expect(resolveDisplayUnit(kgFacts, { directive: 'lb' })).toEqual({ unit: 'lb', convert: true });
    });

    it('honors the directive label even when conversion is not applicable', () => {
      expect(resolveDisplayUnit(noUnitFacts, { directive: 'kg' })).toEqual({ unit: 'kg', convert: false });
      expect(resolveDisplayUnit(repsFacts, { directive: 'lb' })).toEqual({ unit: 'lb', convert: false });
    });

    it('falls back to the preferred unit for mass-family facts', () => {
      expect(resolveDisplayUnit(lbFacts, { preferred: 'kg' })).toEqual({ unit: 'kg', convert: true });
      expect(resolveDisplayUnit(kgFacts, { preferred: 'lb' })).toEqual({ unit: 'lb', convert: true });
    });

    it('ignores the preferred unit when facts are not in the same family', () => {
      expect(resolveDisplayUnit(repsFacts, { preferred: 'kg' })).toEqual({ unit: 'reps', convert: false });
      expect(resolveDisplayUnit(noUnitFacts, { preferred: 'kg' })).toEqual({ unit: undefined, convert: false });
    });

    it('returns the recorded unit when no directive or preference applies', () => {
      expect(resolveDisplayUnit(lbFacts, {})).toEqual({ unit: 'lb', convert: false });
      expect(resolveDisplayUnit(kgFacts, {})).toEqual({ unit: 'kg', convert: false });
    });
  });
});
