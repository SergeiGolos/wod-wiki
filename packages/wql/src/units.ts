/**
 * WQL unit policy (wayfinder ticket 13, home per decision ticket 21).
 *
 * Recognition and conversion evidence live in the core catalog — this module
 * adds the wql application policy: strict conversion before arithmetic, the
 * system-default output table applied when the query has no `in <unit>`
 * directive, and errors (never pass-through) for unknown units and
 * dimension-incompatible conversions.
 *
 * Cutover notes (ticket 13): the old first-record-unit fallback and the
 * unknown/incompatible pass-through in `resolveDisplayUnit` are gone. The
 * host `kg | lb` widget preference is no longer a tier in the default chain —
 * `useAnalyticsUnitPreference` callers migrate to the system defaults under
 * ticket 19; no new callers allowed.
 */

import {
  SYSTEM_DEFAULT_OUTPUT_UNIT,
  UnitConversionError,
  convertViaCatalog,
  dimensionKeyOf,
  lookupUnit,
  systemDefaultUnit,
} from '@bitcobblers/wod-wiki-core';

export {
  SYSTEM_DEFAULT_OUTPUT_UNIT,
  UnitConversionError,
  convertViaCatalog,
  dimensionKeyOf,
  lookupUnit,
  systemDefaultUnit,
};

/** Legacy 2-family vocabulary kept only as a type alias for existing
 *  callers of the display seam; arithmetic dimensions come from the catalog. */
export type UnitFamily = 'mass' | 'distance';

/** The fact-unit shape resolveOutputUnit reads. */
export interface UnitBearingFact {
  unit?: string;
  metricUnit?: string;
}

/** Display conversion for UI surfaces (RawPointsTable etc.): converts
 *  within a shared dimension through the catalog, passes unknown or
 *  cross-dimension values through unchanged instead of throwing. Arithmetic
 *  must use {@link convertViaCatalog}. Ticket 19 migrates the remaining
 *  display callers onto renderer formatting. */
export function convertDisplay(value: number, from: string | undefined, to: string | undefined): number {
  if (from === undefined || to === undefined || from === to) return value;
  const fromDim = dimensionKeyOf(from);
  if (!fromDim || fromDim !== dimensionKeyOf(to)) return value;
  try {
    return convertViaCatalog(value, from, to);
  } catch {
    return value;
  }
}

/** Dimension compatibility probe for display surfaces. */
export function getUnitFamily(unit: string | undefined): string | undefined {
  return unit ? dimensionKeyOf(unit) : undefined;
}

export interface OutputUnitResolution {
  /** The resolved output unit — undefined means unitless / no conversion. */
  unit?: string;
  /** Whether fact values must be converted into `unit` before aggregation. */
  convert: boolean;
  /** Diagnostic when the directive is unusable for this result (unknown
   *  unit, or dimension-incompatible with the selected observations). */
  error?: string;
}

/**
 * Resolve the output unit for an aggregate result (arithmetic contract §5):
 *
 * 1. an explicit `in <unit>` directive wins when it is a known unit and
 *    dimensionally compatible with the observations; incompatible → error
 *    for the affected calculation;
 * 2. otherwise the system default for the observations' dimension
 *    (mass `kg`, distance `m`, duration `s`, …; ratio unitless);
 * 3. observations with no unit at all stay unitless — no first-record
 *    fallback, no reinterpretation of stored measurements.
 */
export function resolveOutputUnit(
  facts: ReadonlyArray<UnitBearingFact>,
  {
    directive,
    preferred,
  }: { directive?: string; preferred?: string },
): OutputUnitResolution {
  void preferred; // retired from the default chain (ticket 13); removed with ticket 19's caller migration

  const spellings = new Set<string>();
  for (const fact of facts) {
    const unit = fact.unit ?? fact.metricUnit;
    if (unit) spellings.add(unit);
  }

  // Determine the observations' shared dimension; unknown spellings are
  // errors — an explicit unknown unit is never passed through.
  let dimension: string | undefined;
  for (const spelling of spellings) {
    const dim = dimensionKeyOf(spelling);
    if (!dim) {
      return { error: `Unknown unit "${spelling}"`, convert: false };
    }
    if (dimension && dim !== dimension) {
      return { error: `Incompatible units in one calculation (${[...spellings].join(', ')})`, convert: false };
    }
    dimension = dim;
  }

  if (directive) {
    const directiveDim = dimensionKeyOf(directive);
    if (!directiveDim) {
      return { error: `Unknown unit "${directive}"`, convert: false };
    }
    if (dimension && directiveDim !== dimension) {
      return { error: `Output unit "${directive}" is not compatible with this result's dimension`, convert: false };
    }
    if (dimension) {
      return { unit: directive, convert: true };
    }
    // Dimensionless observations with a directive: nothing to convert.
    return { unit: directive, convert: false };
  }

  if (dimension) {
    const fallback = systemDefaultUnit(dimension as Parameters<typeof systemDefaultUnit>[0]);
    return { unit: fallback, convert: fallback !== undefined };
  }
  return { unit: undefined, convert: false };
}
