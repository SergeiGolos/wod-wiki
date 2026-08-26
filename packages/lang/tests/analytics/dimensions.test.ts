import { describe, expect, it } from 'vitest';
import { addDim, subDim, formatDim, compoundName, DIM_TIME, DIM_LENGTH, DIM_MASS, DIM_COUNT, DIM_ZERO } from '../../src/analytics/calc/dimensions';
import { convertScalar, getUnit, CalcUnitError } from '../../src/analytics/calc/units';

describe('dimension algebra', () => {
  it('multiplication adds vectors, division subtracts', () => {
    expect(addDim(DIM_MASS, DIM_COUNT)).toEqual([0, 1, 0, 1, 0]); // volume
    expect(subDim(DIM_TIME, DIM_LENGTH)).toEqual([-1, 0, 1, 0, 0]); // pace
    expect(subDim([0, 1, 0, 1, 0], DIM_TIME)).toEqual([0, 1, -1, 1, 0]); // power
  });

  it('names compound vectors', () => {
    expect(compoundName([-1, 0, 1, 0, 0])).toBe('pace');
    expect(compoundName([0, 1, 0, 1, 0])).toBe('volume');
    expect(compoundName(DIM_ZERO)).toBe('dimensionless');
    expect(formatDim([1, 0, -1, 0, 0])).toBe('L·T^-1');
  });
});

describe('unit registry', () => {
  it('converts time across units', () => {
    expect(convertScalar(90, 's', 'min')).toBeCloseTo(1.5);
    expect(convertScalar(2, 'min', 'ms')).toBe(120_000);
    expect(convertScalar(1, 'h', 's')).toBe(3600);
  });

  it('converts mass kg ↔ lb exactly', () => {
    expect(convertScalar(1, 'lb', 'kg')).toBeCloseTo(0.45359237);
    expect(convertScalar(100, 'kg', 'lb')).toBeCloseTo(220.462, 2);
  });

  it('converts pace and speed compounds', () => {
    // 5 min/km ≡ 300 s per 1000 m → base 300 ms/m; back to sec/km = 300
    expect(convertScalar(5, 'min/km', 'sec/km')).toBeCloseTo(300);
    // 2 m/s in km/h = 7.2
    expect(convertScalar(2, 'm/s', 'km/h')).toBeCloseTo(7.2);
  });

  it('treats unitless values as base unit', () => {
    expect(convertScalar(60_000, undefined, 'min')).toBe(1);
  });

  it('rejects cross-dimension and unknown-unit conversions', () => {
    expect(() => convertScalar(1, 'kg', 'min')).toThrow(CalcUnitError);
    expect(() => convertScalar(1, 'kg', 'furlong')).toThrow(CalcUnitError);
  });

  it('recognizes authoritative casts as zero-vector units', () => {
    for (const cast of ['AU', 'pts', 'MET-min', 'ratio']) {
      expect(getUnit(cast)?.dim).toEqual([0, 0, 0, 0, 0]);
    }
    expect(getUnit('bogus')).toBeUndefined();
  });
});
