/**
 * Unit Registry — the core catalog of measurement units.
 *
 * Units are NOT a parser concept. The parser emits bare Number and Text; a
 * {@link UnitSet} (imported by a Dialect) identifies which text tokens are units
 * and what {@link Dimension} they measure. See CONTEXT.md → "Units of measurement".
 *
 * This module is pure data + lookup. It has no dependency on metric classes,
 * the parser, or dialects — those import from here, never the reverse.
 */

/** The physical quantity a {@link UnitDef} measures. */
export type Dimension = 'length' | 'mass' | 'energy' | 'count' | 'time';

/** A single recognized unit: its canonical spelling, dimension, and aliases. */
export interface UnitDef {
  /** Canonical, normalized spelling (e.g. `m`, `kg`, `cal`). */
  readonly canonical: string;
  /** What the unit measures. */
  readonly dimension: Dimension;
  /** Alternate spellings / acronyms (e.g. `lb` ← `lbs`, `pound`, `pounds`). */
  readonly aliases: readonly string[];
}

/** Result of peeling a leading unit token off raw text. */
export interface UnitMatch {
  /** The matched canonical unit definition. */
  readonly unit: UnitDef;
  /** The exact token as it appeared in the source (e.g. `miles`). */
  readonly token: string;
  /** Remaining text after the consumed unit token (whitespace-trimmed). */
  readonly rest: string;
}

const LEADING_WORD = /^([a-zA-Z]+)([\s\S]*)$/;

/**
 * An importable, composable set of {@link UnitDef}s.
 *
 * Lookups are case-insensitive across canonical spellings and aliases. Sets
 * compose with {@link extend}: on a token collision the later definition wins,
 * which is how a Dialect overrides a base unit.
 */
export class UnitSet {
  /** Definitions in priority order (later entries override earlier on token collision). */
  private readonly defs: readonly UnitDef[];
  private readonly byToken: Map<string, UnitDef>;

  constructor(defs: readonly UnitDef[] = []) {
    this.defs = defs;
    this.byToken = new Map();
    // Iterate in order so later defs overwrite earlier ones (override semantics).
    for (const def of defs) {
      this.byToken.set(def.canonical.toLowerCase(), def);
      for (const alias of def.aliases) {
        this.byToken.set(alias.toLowerCase(), def);
      }
    }
  }

  /** Look up a unit by canonical spelling or alias (case-insensitive). */
  get(token: string): UnitDef | undefined {
    return this.byToken.get(token.trim().toLowerCase());
  }

  /** Whether the token is a recognized unit (canonical or alias). */
  has(token: string): boolean {
    return this.byToken.has(token.trim().toLowerCase());
  }

  /**
   * Peel a leading unit token off the front of `text`.
   *
   * Returns `null` when the first whitespace/letter-delimited word is not a
   * recognized unit — this is what keeps `5 Burpees` from ever fusing while
   * `4 mile Run` → `{ unit: mile, rest: "Run" }`.
   */
  consumeLeading(text: string): UnitMatch | null {
    const m = LEADING_WORD.exec(text.trimStart());
    if (!m) return null;
    const token = m[1];
    const unit = this.get(token);
    if (!unit) return null;
    return { unit, token, rest: m[2].trim() };
  }

  /**
   * Compose into a new set. Later units override earlier ones on token
   * collision — the mechanism a Dialect uses to add or redefine units.
   */
  extend(...units: UnitDef[]): UnitSet {
    return new UnitSet([...this.defs, ...units]);
  }

  /** All definitions in priority order. */
  toArray(): UnitDef[] {
    return [...this.defs];
  }
}

/**
 * The base catalog applied at the bottom of the Dialect Stack. Sport and
 * personal dialects extend or override these via {@link UnitSet.extend}.
 */
export const STANDARD_UNITS: readonly UnitDef[] = [
  // length
  { canonical: 'm',  dimension: 'length', aliases: ['meter', 'meters', 'metre', 'metres'] },
  { canonical: 'km', dimension: 'length', aliases: ['kilometer', 'kilometers', 'kilometre', 'kilometres'] },
  { canonical: 'cm', dimension: 'length', aliases: ['centimeter', 'centimeters', 'centimetre', 'centimetres'] },
  { canonical: 'mm', dimension: 'length', aliases: ['millimeter', 'millimeters', 'millimetre', 'millimetres'] },
  { canonical: 'ft', dimension: 'length', aliases: ['foot', 'feet'] },
  { canonical: 'in', dimension: 'length', aliases: ['inch', 'inches'] },
  { canonical: 'yd', dimension: 'length', aliases: ['yard', 'yards'] },
  { canonical: 'mi', dimension: 'length', aliases: ['mile', 'miles'] },

  // mass
  { canonical: 'kg', dimension: 'mass', aliases: ['kilo', 'kilos', 'kilogram', 'kilograms'] },
  { canonical: 'g',  dimension: 'mass', aliases: ['gram', 'grams'] },
  { canonical: 'lb', dimension: 'mass', aliases: ['lbs', 'pound', 'pounds'] },
  { canonical: 'bw', dimension: 'mass', aliases: ['bodyweight'] },

  // energy
  { canonical: 'cal',  dimension: 'energy', aliases: ['cals', 'calorie', 'calories'] },
  { canonical: 'kcal', dimension: 'energy', aliases: ['kcals', 'kilocalorie', 'kilocalories'] },
];

/**
 * Factory for {@link UnitSet}s. `standard()` is the base catalog; `of()` builds
 * a custom set a Dialect can stack on top.
 */
export const UnitRegistry = {
  /** The base catalog used by the base Units Dialect. */
  standard(): UnitSet {
    return new UnitSet(STANDARD_UNITS);
  },
  /** Build a set from arbitrary definitions. */
  of(units: readonly UnitDef[]): UnitSet {
    return new UnitSet(units);
  },
};
