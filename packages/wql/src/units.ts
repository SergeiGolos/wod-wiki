/**
 * Analytics unit conversion seam — narrow, fake-free, pure.
 *
 * Supports exactly the unit families analytics currently needs:
 *   - mass: kg ↔ lb (exact 0.45359237 kg per lb)
 *   - distance: m ↔ km
 *
 * Any unknown or incompatible units pass through unchanged.
 */

export const KG_PER_LB = 0.45359237;

export type UnitFamily = 'mass' | 'distance';

export interface UnitFamilyDef {
  /** Base unit for the family (used for documentation, not conversion). */
  base: string;
  /** Factor to convert FROM this unit TO the base unit. */
  units: Record<string, number>;
}

export const UNIT_FAMILIES: Record<UnitFamily, UnitFamilyDef> = {
  mass: {
    base: 'kg',
    units: {
      kg: 1,
      lb: KG_PER_LB,
    },
  },
  distance: {
    base: 'm',
    units: {
      m: 1,
      km: 1000,
    },
  },
};

export function getUnitFamily(unit: string | undefined): UnitFamily | undefined {
  if (!unit) return undefined;
  for (const [family, def] of Object.entries(UNIT_FAMILIES) as [UnitFamily, UnitFamilyDef][]) {
    if (def.units[unit] !== undefined) return family;
  }
  return undefined;
}

/**
 * Convert a value between known units.
 *
 * Returns the input unchanged when:
 *   - from === to
 *   - either unit is unknown
 *   - the units belong to different families
 */
export function convert(value: number, from: string | undefined, to: string | undefined): number {
  if (from === to || from === undefined || to === undefined) return value;
  const family = getUnitFamily(from);
  if (!family || family !== getUnitFamily(to)) return value;
  const def = UNIT_FAMILIES[family];
  const fromFactor = def.units[from];
  const toFactor = def.units[to];
  if (fromFactor === undefined || toFactor === undefined) return value;
  return (value * fromFactor) / toFactor;
}

/**
 * Determine the target display unit for a set of matched facts and query
 * options. Returns the unit to render and whether values should be converted.
 */
export function resolveDisplayUnit(
  facts: ReadonlyArray<{ unit?: string; metricUnit?: string }>,
  {
    directive,
    preferred,
  }: { directive?: string; preferred?: string },
): { unit?: string; convert: boolean } {
  const sourceUnits = facts
    .map((row) => row.unit ?? row.metricUnit)
    .filter((u): u is string => Boolean(u));
  const firstSource = sourceUnits[0];

  if (directive) {
    const directiveFamily = getUnitFamily(directive);
    const applicable =
      directiveFamily !== undefined &&
      sourceUnits.some((u) => getUnitFamily(u) === directiveFamily);
    return { unit: directive, convert: applicable };
  }

  if (preferred) {
    const preferredFamily = getUnitFamily(preferred);
    if (
      preferredFamily &&
      sourceUnits.some((u) => getUnitFamily(u) === preferredFamily)
    ) {
      return { unit: preferred, convert: true };
    }
  }

  return { unit: firstSource, convert: false };
}
