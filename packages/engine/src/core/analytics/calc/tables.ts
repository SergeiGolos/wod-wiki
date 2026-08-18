/**
 * Built-in lookup table adapters (spec §4.1).
 *
 * - `effort` — IEffortResolver-backed; preserves fuzzy matching, aliases,
 *   derivations, modifiers. Miss policy `default-row`: the resolver's
 *   synthetic unresolved effort (default MET 5.0, flagged isEstimated)
 *   guarantees a row for any key.
 * - `rpe-labels` — effort label → RPE map shared by SessionLoad and TIS
 *   (replaces the duplicated effortToRpe maps, review doc §7 note b).
 * - `profile` — user profile attributes (vo2max). Miss policy `absent`.
 * - `disciplines` — canonical discipline factor table. Miss policy
 *   `default-row` (1.0).
 */

import type { IEffortResolver } from '../../../effort-registry/types';
import { DEFAULT_RESOLVER_OPTIONS } from '../../../effort-registry/types';
import { disciplineFactorFor, isEffortDiscipline } from '../../../effort-registry/disciplines';
import { DIM_ZERO } from './dimensions';
import { ILookupTable } from './lookup';
import { num, str, Val } from './values';

/** Label → RPE. Canonical map (SessionLoadProjectionEngine / TISProcessor). */
export const RPE_LABELS: Record<string, number> = {
  easy: 3,
  moderate: 5,
  hard: 7,
  'all-out': 10,
  max: 10,
};

export function createEffortTable(resolver: IEffortResolver): ILookupTable {
  return {
    id: 'effort',
    missPolicy: 'default-row',
    fields: {
      met: { dimension: DIM_ZERO, type: 'number' },
      disciplineFactor: { dimension: DIM_ZERO, type: 'number' },
      discipline: { dimension: DIM_ZERO, type: 'string' },
      intensityTier: { dimension: DIM_ZERO, type: 'string' },
      resolvedFrom: { dimension: DIM_ZERO, type: 'string' },
      isEstimated: { dimension: DIM_ZERO, type: 'number' },
    },
    get(key, field): Val | undefined {
      // Empty key (no effort seen yet in the stream) is the historical
      // DEFAULT_UNRESOLVED_EFFORT_MET path: synthetic default row, estimated.
      if (!key) {
        switch (field) {
          case 'met': return num(DEFAULT_RESOLVER_OPTIONS.defaultMet);
          case 'disciplineFactor': return num(1.0);
          case 'resolvedFrom': return str('default');
          case 'isEstimated': return num(1);
          default: return undefined;
        }
      }
      // resolveEffort never misses: unknown keys resolve to the synthetic
      // unresolved effort (default MET, isEstimated) — the default row.
      const resolved = resolver.resolveEffort(key);
      switch (field) {
        case 'met': return num(resolved.met);
        case 'disciplineFactor': return num(resolved.disciplineFactor);
        case 'discipline': return resolved.discipline ? str(resolved.discipline) : undefined;
        case 'intensityTier': return resolved.intensityTier ? str(resolved.intensityTier) : undefined;
        case 'resolvedFrom': return str(resolved.resolvedFrom);
        case 'isEstimated': return num(resolved.isEstimated ? 1 : 0);
        default: return undefined;
      }
    },
  };
}

export function createRpeLabelsTable(): ILookupTable {
  return {
    id: 'rpe-labels',
    missPolicy: 'absent',
    fields: { rpe: { dimension: DIM_ZERO, type: 'number' } },
    get(key, field): Val | undefined {
      if (field !== 'rpe') return undefined;
      const rpe = RPE_LABELS[key.toLowerCase()];
      return rpe === undefined ? undefined : num(rpe);
    },
  };
}

export interface IProfileSource {
  readonly vo2max?: number;
}

export function createProfileTable(profile: IProfileSource | undefined): ILookupTable {
  return {
    id: 'profile',
    missPolicy: 'absent',
    fields: { vo2max: { dimension: DIM_ZERO, type: 'number' } },
    get(_key, field): Val | undefined {
      if (field !== 'vo2max') return undefined;
      return profile?.vo2max === undefined ? undefined : num(profile.vo2max);
    },
  };
}

export function createDisciplinesTable(): ILookupTable {
  return {
    id: 'disciplines',
    missPolicy: 'default-row',
    fields: { disciplineFactor: { dimension: DIM_ZERO, type: 'number' } },
    get(key, field): Val | undefined {
      if (field !== 'disciplineFactor') return undefined;
      return num(isEffortDiscipline(key) ? disciplineFactorFor(key) : 1.0);
    },
  };
}
