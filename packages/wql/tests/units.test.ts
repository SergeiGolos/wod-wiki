import { describe, expect, it } from 'vitest';
import { convert, resolveDisplayUnit, getUnitFamily, KG_PER_LB } from '../src/units';

describe('units', () => {
  describe('getUnitFamily', () => {
    it('identifies mass units', () => {
      expect(getUnitFamily('kg')).toBe('mass');
      expect(getUnitFamily('lb')).toBe('mass');
    });

    it('identifies distance units', () => {
      expect(getUnitFamily('m')).toBe('distance');
      expect(getUnitFamily('km')).toBe('distance');
    });

    it('returns undefined for unknown units', () => {
      expect(getUnitFamily('reps')).toBeUndefined();
      expect(getUnitFamily(undefined)).toBeUndefined();
    });
  });

  describe('convert', () => {
    it('converts kg to lb and back', () => {
      const kg = 100;
      const lb = convert(kg, 'kg', 'lb');
      expect(lb).toBeCloseTo(100 / KG_PER_LB);
      expect(convert(lb, 'lb', 'kg')).toBeCloseTo(100);
    });

    it('converts m to km and back', () => {
      expect(convert(5000, 'm', 'km')).toBe(5);
      expect(convert(5, 'km', 'm')).toBe(5000);
    });

    it('returns original value when from === to or unknown', () => {
      expect(convert(10, 'kg', 'kg')).toBe(10);
      expect(convert(10, 'reps', 'kg')).toBe(10);
      expect(convert(10, undefined, 'kg')).toBe(10);
    });
  });

  describe('resolveDisplayUnit', () => {
    it('handles directive display units', () => {
      const facts = [{ unit: 'lb' }];
      expect(resolveDisplayUnit(facts, { directive: 'kg' })).toEqual({
        unit: 'kg',
        convert: true,
      });
    });

    it('handles preferred units', () => {
      const facts = [{ unit: 'lb' }];
      expect(resolveDisplayUnit(facts, { preferred: 'kg' })).toEqual({
        unit: 'kg',
        convert: true,
      });
    });
  });
});
