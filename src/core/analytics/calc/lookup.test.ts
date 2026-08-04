import { describe, expect, it } from 'bun:test';
import { LookupRegistry, ILookupTable } from './lookup';
import { createDisciplinesTable, createEffortTable, createProfileTable, createRpeLabelsTable } from './tables';
import { evaluate, EvalContext } from './evaluator';
import { parseExpression, parseCalcLine } from './parser';
import { checkCalcLine, StaticEnv, CalcRegistrationError } from './check';
import { ABSENT, num, Val } from './values';
import { DIM_ZERO, DIM_TIME } from './dimensions';
import type { IEffortResolver, ResolvedEffort } from '../../../effort-registry/types';
import type { IEffort } from '../../../effort-registry/types';

const THRUSTER: ResolvedEffort = {
  effort: { slug: 'thruster' } as unknown as IEffort,
  definition: { slug: 'thruster' } as unknown as IEffort,
  slug: 'thruster',
  label: 'Thruster',
  met: 8.5,
  baseAttributes: { met: 8.5 },
  discipline: 'strength',
  disciplineFactor: 1.2,
  intensityTier: 'high',
  modifiers: {},
  registrySource: 'bundled',
  resolvedFrom: 'bundled',
  isEstimated: false,
};

const UNRESOLVED: ResolvedEffort = {
  ...THRUSTER,
  slug: 'unresolved',
  label: '???',
  met: 5.0,
  discipline: undefined,
  disciplineFactor: 1.0,
  intensityTier: undefined,
  registrySource: 'synthetic-unresolved',
  resolvedFrom: 'default',
  isEstimated: true,
};

const fakeResolver: IEffortResolver = {
  resolveBySlug: (slug) => (slug === 'thruster' ? THRUSTER.effort : null),
  resolveByAlias: () => null,
  resolveFuzzy: () => UNRESOLVED.effort,
  resolveEffort: (label) => (label === 'thruster' ? THRUSTER : { ...UNRESOLVED, label }),
  resolveDefinition: () => THRUSTER,
  list: () => [THRUSTER.effort],
};

function makeRegistry(): LookupRegistry {
  const registry = new LookupRegistry();
  registry.register(createEffortTable(fakeResolver));
  registry.register(createRpeLabelsTable());
  registry.register(createProfileTable({ vo2max: 40 }));
  registry.register(createDisciplinesTable());
  return registry;
}

const run = (src: string, c: EvalContext) => evaluate(parseExpression(src), c);

const ctxFor = (registry: LookupRegistry): EvalContext => ({
  resolveRef: (name) =>
    name === 'effort' ? { kind: 'string', value: 'thruster' } : name === 'effortLabel' ? { kind: 'string', value: 'hard' } : ABSENT,
  callFunction: registry.callFunction,
});

describe('lookup adapters', () => {
  const registry = makeRegistry();

  it('effort table resolves met, disciplineFactor, discipline, resolvedFrom', () => {
    expect(registry.lookup('effort', 'thruster', 'met')).toMatchObject({ value: 8.5 });
    expect(registry.lookup('effort', 'thruster', 'disciplineFactor')).toMatchObject({ value: 1.2 });
    expect(registry.lookup('effort', 'thruster', 'discipline')).toMatchObject({ value: 'strength' });
    expect(registry.lookup('effort', 'thruster', 'resolvedFrom')).toMatchObject({ value: 'bundled' });
  });

  it('effort table default-row miss policy: unknown key → default MET 5.0, flagged estimated', () => {
    expect(registry.lookup('effort', 'underwater-basketweaving', 'met')).toMatchObject({ value: 5.0 });
    expect(registry.lookup('effort', '???', 'resolvedFrom')).toMatchObject({ value: 'default' });
    expect(registry.lookup('effort', '???', 'isEstimated')).toMatchObject({ value: 1 });
  });

  it('rpe-labels maps labels; absent on miss', () => {
    expect(registry.lookup('rpe-labels', 'easy', 'rpe')).toMatchObject({ value: 3 });
    expect(registry.lookup('rpe-labels', 'hard', 'rpe')).toMatchObject({ value: 7 });
    expect(registry.lookup('rpe-labels', 'all-out', 'rpe')).toMatchObject({ value: 10 });
    expect(registry.lookup('rpe-labels', 'bogus', 'rpe').kind).toBe('absent');
  });

  it('profile table exposes vo2max; absent when unset', () => {
    expect(registry.lookup('profile', 'me', 'vo2max')).toMatchObject({ value: 40 });
    const empty = new LookupRegistry();
    empty.register(createProfileTable(undefined));
    expect(empty.lookup('profile', 'me', 'vo2max').kind).toBe('absent');
  });

  it('disciplines table default-row 1.0 for unknown disciplines', () => {
    expect(registry.lookup('disciplines', 'strength', 'disciplineFactor')).toMatchObject({ value: 1.2 });
    expect(registry.lookup('disciplines', 'recovery', 'disciplineFactor')).toMatchObject({ value: 0.9 });
    expect(registry.lookup('disciplines', 'parkour', 'disciplineFactor')).toMatchObject({ value: 1.0 });
  });
});

describe('layered registration', () => {
  it('user layer overrides bundled; lower layer cannot displace higher', () => {
    const registry = new LookupRegistry();
    const bundled: ILookupTable = {
      id: 'rpe-labels', missPolicy: 'absent',
      fields: { rpe: { dimension: DIM_ZERO, type: 'number' } },
      get: () => num(3),
    };
    const user: ILookupTable = { ...bundled, get: () => num(9) };
    registry.register(bundled, 'bundled');
    registry.register(user, 'user');
    expect(registry.lookup('rpe-labels', 'easy', 'rpe')).toMatchObject({ value: 9 });
    registry.register(bundled, 'bundled'); // cannot displace user layer
    expect(registry.lookup('rpe-labels', 'easy', 'rpe')).toMatchObject({ value: 9 });
  });
});

describe('lookup() in the evaluator', () => {
  const registry = makeRegistry();

  it('resolves dynamic key expressions against context nodes', () => {
    expect(run('lookup("effort", effort, "met")', ctxFor(registry))).toMatchObject({ value: 8.5 });
    expect(run('lookup("rpe-labels", effortLabel, "rpe")', ctxFor(registry))).toMatchObject({ value: 7 });
  });

  it('composes into arithmetic (metMinutes segment calc)', () => {
    const v = run('lookup("effort", effort, "met") * convert(elapsed, min)', {
      resolveRef: (name): Val =>
        name === 'effort' ? { kind: 'string', value: 'thruster' } : name === 'elapsed' ? num(120_000, DIM_TIME, 'ms') : ABSENT,
      callFunction: registry.callFunction,
    });
    expect(v).toMatchObject({ value: 17 }); // 8.5 MET × 2 min
  });

  it('absent key yields absent, not a bogus row', () => {
    expect(run('lookup("effort", missing, "met")', {
      resolveRef: () => ABSENT,
      callFunction: registry.callFunction,
    }).kind).toBe('absent');
  });
});

describe('lookup() static checking', () => {
  const registry = makeRegistry();
  const env: StaticEnv = {
    refDim: (name) => (['effort', 'effortLabel', 'elapsed'].includes(name) ? (name === 'elapsed' ? DIM_TIME : DIM_ZERO) : undefined),
    lookupDim: (table, field) => registry.fieldDim(table, field),
  };

  it('propagates field dimensions into expressions', () => {
    const dim = checkCalcLine(parseCalcLine('effortRpe = lookup("rpe-labels", effortLabel, "rpe")'), env);
    expect(dim).toEqual(DIM_ZERO);
    expect(() => checkCalcLine(parseCalcLine('metMinutes = lookup("effort", effort, "met") * convert(elapsed, min) -> MET-min'), env)).not.toThrow();
  });

  it('rejects unknown tables and fields at registration', () => {
    expect(() => checkCalcLine(parseCalcLine('x = lookup("bogus", effort, "met")'), env)).toThrow(CalcRegistrationError);
    expect(() => checkCalcLine(parseCalcLine('x = lookup("effort", effort, "bogus")'), env)).toThrow(CalcRegistrationError);
  });
});
