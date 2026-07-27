/**
 * Canonical discipline vocabulary — the single source of truth for effort
 * disciplines across the resolver, the TIS factor table, fact-row tags, the
 * WQL tag dictionary, and UI filters.
 *
 * The vocabulary is the 10 values used by the bundled catalog
 * (markdown/efforts/<discipline>/<slug>.md, 53 efforts). Earlier factor-table
 * keys ('resistance', 'yoga', 'cardio', 'hiit') and the 'weightlifting' /
 * 'monostructural' examples in storage docs were stale text — no live effort
 * ever carried them.
 */

export const EFFORT_DISCIPLINES = [
  'bodyweight',
  'cycling',
  'gymnastics',
  'kettlebell',
  'recovery',
  'rowing',
  'running',
  'strength',
  'swimming',
  'walking',
] as const;

export type EffortDiscipline = (typeof EFFORT_DISCIPLINES)[number];

export function isEffortDiscipline(value: unknown): value is EffortDiscipline {
  return typeof value === 'string'
    && (EFFORT_DISCIPLINES as readonly string[]).includes(value.toLowerCase());
}

/**
 * TIS discipline multiplier per canonical discipline. Loaded modalities
 * (strength + the loaded-skill pair kettlebell/gymnastics) score 1.2;
 * recovery absorbs the retired 'yoga' case at 0.9; the monostructural five
 * and bodyweight take the 1.0 default. Unknown/absent disciplines fall back
 * to 1.0 — the historical behavior for every non-'strength' value.
 */
export const DISCIPLINE_FACTORS: Record<EffortDiscipline, number> = {
  strength: 1.2,
  kettlebell: 1.2,
  gymnastics: 1.2,
  recovery: 0.9,
  bodyweight: 1.0,
  cycling: 1.0,
  rowing: 1.0,
  running: 1.0,
  swimming: 1.0,
  walking: 1.0,
};

/** Factor for an arbitrary discipline string; 1.0 when absent or unknown. */
export function disciplineFactorFor(discipline: string | undefined): number {
  if (!discipline) return 1.0;
  const key = discipline.toLowerCase();
  return isEffortDiscipline(key) ? DISCIPLINE_FACTORS[key] : 1.0;
}
