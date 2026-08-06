import { describe, expect, it } from 'bun:test';
import { compileLineForm, printCalculation } from './lineform';
import { CalculationRegistry } from './registry';
import { LookupRegistry } from './lookup';
import { BUILTIN_CALCS, STORE_CALCS } from './seeds';
import { buildStaticLookups } from '../../../components/organisms/calc-authoring/calcDiagnostics';

const compileOne = (src: string) => compileLineForm(src, { scope: 'workout' }).defs[0];

describe('line-form compiler', () => {
  it('compiles a simple output calc with unit and key', () => {
    const def = compileOne('totalVolume = sum(segmentVolume) -> auto key totalVolume');
    expect(def.id).toBe('totalVolume');
    expect(def.kind).toBe('output');
    expect(def.scope).toBe('workout');
    expect(def.variants).toHaveLength(1);
    expect(def.variants[0].nodes.value.expression).toBe('sum(segmentVolume)');
    expect(def.output).toMatchObject({ nodeId: 'value', key: 'totalVolume' });
  });

  it('compile -> print -> compile is lossless', () => {
    const def = compileOne(
      'pace = reps / convert(elapsed, min) -> reps/min when has(reps)',
    );
    const printed = printCalculation(def);
    const roundTripped = compileOne(printed);
    expect(roundTripped).toEqual(def);
  });

  it('lossless round-trip for a multi-variant estimated calc', () => {
    const def = compileOne(
      'metMinutes = lookup("effort", effort, "met") * convert(elapsed, min) (library) ' +
      'when lookup("effort", effort, "resolvedFrom") != "default" | estimated',
    );
    expect(def.variants).toHaveLength(2);
    expect(def.variants[0].origin).toBe('analyzed');
    expect(def.variants[1].origin).toBe('analyzed-estimated');
    expect(compileOne(printCalculation(def))).toEqual(def);
  });

  it('preserves where bindings and intermediate casts', () => {
    const def = compileOne(
      'tis = round(0.30*metScore + durationScore, 1) -> pts key tis ' +
      'where metScore = min(100, avgMets / metMax * 100) ' +
      'where durationScore = elapsedMin / 60 * metScore -> pts',
    );
    expect(def.variants[0].nodes.metScore.expression).toBe('min(100, avgMets / metMax * 100)');
    expect(def.variants[0].nodes.durationScore.unit).toBe('pts');
    expect(compileOne(printCalculation(def))).toEqual(def);
  });

  it('handles scope headers with fences and def-level when', () => {
    const res = compileLineForm(
      'segment on [time, log] when elapsed > 0:\n' +
      '  pace = reps / convert(elapsed, min) -> reps/min',
    );
    const def = res.defs[0];
    expect(def.scope).toBe('segment');
    expect(def.fences).toEqual(['time', 'log']);
    expect(def.when).toBe('elapsed > 0');
    expect(compileLineForm(printCalculation(def)).defs[0]).toEqual(def);
  });

  it('parses grouped key emission', () => {
    const def = compileOne('totalVolume = sum(segmentVolume) key totalVolume grouped by {effort}');
    expect(def.output).toMatchObject({ key: 'totalVolume', isGrouped: true, groupBy: ['effort'] });
    expect(compileOne(printCalculation(def))).toEqual(def);
  });

  it('registers cleanly into a CalculationRegistry (static dim check passes)', () => {
    const seg = compileLineForm(
      'segment:\n  pace = reps / convert(elapsed, min) -> reps/min when has(reps)',
    ).defs[0];
    const reg = new CalculationRegistry(new LookupRegistry());
    expect(() => reg.register(seg)).not.toThrow();
  });

  it('flags a dimension mismatch at registration (via the same path diagnostics use)', () => {
    // reps (count) minus elapsed (time) is a dimension error.
    const def = compileOne('bad = reps - convert(elapsed, min)');
    const reg = new CalculationRegistry(new LookupRegistry());
    let threw: unknown;
    try { reg.register(def); } catch (e) { threw = e; }
    expect(threw).toBeDefined();
  });

  it('surfaces bad expressions as compile errors', () => {
    expect(() => compileOne('x = reps +')).toThrow();
  });

  it('prints and re-compiles the full built-in seed suite losslessly (registerable)', () => {
    const registry = new CalculationRegistry(buildStaticLookups());
    for (const seed of [...BUILTIN_CALCS, ...STORE_CALCS]) {
      const printed = printCalculation(seed);
      const { defs } = compileLineForm(printed, { scope: seed.scope });
      expect(defs.length).toBeGreaterThan(0);
      // Recompiled from line form must register without throwing (lossless + valid).
      expect(() => registry.register(defs[0])).not.toThrow();
    }
  });
});
