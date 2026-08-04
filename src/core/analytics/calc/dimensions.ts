/**
 * Exponent-vector dimension model for the composed calculations layer.
 *
 * Dimensions are 5-element exponent vectors over base physical quantities:
 *   [L, M, T, C, E]  =  [length, mass, time, count(reps), energy(cal)]
 *
 * Algebra (docs/composed-calculations-spec.md §5.1):
 *   Dim(a * b) = Dim(a) + Dim(b)
 *   Dim(a / b) = Dim(a) − Dim(b)
 *   Dim(a ± b) requires Dim(a) = Dim(b)   (static registration failure otherwise)
 */

export type DimVector = readonly [number, number, number, number, number];

export const DIM_ZERO: DimVector = [0, 0, 0, 0, 0];
export const DIM_LENGTH: DimVector = [1, 0, 0, 0, 0];
export const DIM_MASS: DimVector = [0, 1, 0, 0, 0];
export const DIM_TIME: DimVector = [0, 0, 1, 0, 0];
export const DIM_COUNT: DimVector = [0, 0, 0, 1, 0];
export const DIM_ENERGY: DimVector = [0, 0, 0, 0, 1];

export function addDim(a: DimVector, b: DimVector): DimVector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3], a[4] + b[4]];
}

export function subDim(a: DimVector, b: DimVector): DimVector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3], a[4] - b[4]];
}

export function dimEquals(a: DimVector, b: DimVector): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4];
}

export function isDimensionless(d: DimVector): boolean {
  return dimEquals(d, DIM_ZERO);
}

const AXIS_NAMES = ['L', 'M', 'T', 'C', 'E'] as const;

/** Human-readable vector, e.g. "T·L⁻¹" for pace. */
export function formatDim(d: DimVector): string {
  if (isDimensionless(d)) return 'dimensionless';
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const e = d[i];
    if (e === 0) continue;
    parts.push(e === 1 ? AXIS_NAMES[i] : `${AXIS_NAMES[i]}^${e}`);
  }
  return parts.join('·');
}

/**
 * Named compound dimension registry (spec §5.2). Used for diagnostics and
 * dimension-filtered unit suggestions — not required for evaluation.
 */
export const NAMED_COMPOUNDS: Record<string, { dim: DimVector; preferredUnits: string[] }> = {
  pace: { dim: [-1, 0, 1, 0, 0], preferredUnits: ['min/km', 'sec/km', 'min/mi'] },
  speed: { dim: [1, 0, -1, 0, 0], preferredUnits: ['m/s', 'km/h'] },
  volume: { dim: [0, 1, 0, 1, 0], preferredUnits: ['kg', 'lb'] },
  power: { dim: [0, 1, -1, 1, 0], preferredUnits: ['kg/s', 'lb/s'] },
  time: { dim: DIM_TIME, preferredUnits: ['min', 's', 'h'] },
  mass: { dim: DIM_MASS, preferredUnits: ['kg', 'lb'] },
  length: { dim: DIM_LENGTH, preferredUnits: ['m', 'km', 'mi'] },
  count: { dim: DIM_COUNT, preferredUnits: ['reps'] },
  energy: { dim: DIM_ENERGY, preferredUnits: ['cal', 'kcal'] },
  dimensionless: { dim: DIM_ZERO, preferredUnits: ['pts', 'AU', 'MET', 'ratio'] },
};

/** Reverse lookup: find the compound name for a vector, if one exists. */
export function compoundName(d: DimVector): string | undefined {
  for (const [name, def] of Object.entries(NAMED_COMPOUNDS)) {
    if (dimEquals(def.dim, d)) return name;
  }
  return undefined;
}
