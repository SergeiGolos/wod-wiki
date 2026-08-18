/**
 * Lookup table registry (spec §4).
 *
 * Tables are adapters over heterogeneous sources (effort resolver, static
 * maps, user profile) exposing a uniform single-row lookup contract:
 * `lookup("table", keyExpr, "field")`. Registration is layered —
 * bundled → dialect → user — with later layers replacing earlier ones
 * (mirrors the Dialect Stack's personal-overrides-last rule). Miss behavior
 * is per-table: `absent` yields the absent value; `default-row` yields a
 * synthetic row so calcs never see a miss.
 */

import { DimVector } from './dimensions';
import { CalcEvalError, EvalContext } from './evaluator';
import { ABSENT, Val } from './values';

export interface LookupFieldDef {
  dimension: DimVector;
  type: 'number' | 'string';
}

export interface ILookupTable {
  readonly id: string;
  readonly fields: Record<string, LookupFieldDef>;
  readonly missPolicy: 'absent' | 'default-row';
  /** Single-row lookup. `absent` tables return undefined on a miss. */
  get(key: string, field: string): Val | undefined;
}

export type LookupLayer = 'bundled' | 'dialect' | 'user';

const LAYER_RANK: Record<LookupLayer, number> = { bundled: 0, dialect: 1, user: 2 };

export class LookupRegistry {
  private readonly tables = new Map<string, { table: ILookupTable; layer: LookupLayer }>();

  /** Register a table; a later-or-equal layer replaces the existing entry. */
  register(table: ILookupTable, layer: LookupLayer = 'bundled'): void {
    const existing = this.tables.get(table.id);
    if (existing && LAYER_RANK[existing.layer] > LAYER_RANK[layer]) return;
    this.tables.set(table.id, { table, layer });
  }

  get(tableId: string): ILookupTable | undefined {
    return this.tables.get(tableId)?.table;
  }

  /** Field dimension for static checking; undefined when table/field unknown. */
  fieldDim(tableId: string, field: string): DimVector | undefined {
    return this.tables.get(tableId)?.table.fields[field]?.dimension;
  }

  /** Runtime lookup honoring the table's miss policy. */
  lookup(tableId: string, key: string, field: string): Val {
    const table = this.tables.get(tableId)?.table;
    if (!table) return ABSENT;
    return table.get(key, field) ?? ABSENT;
  }

  /**
   * EvalContext `callFunction` implementation for `lookup("table", key, "field")`.
   * Compose with other extension functions (aggregates) at the engine layer.
   */
  readonly callFunction: EvalContext['callFunction'] = (name, args) => {
    if (name !== 'lookup') return undefined;
    const [table, key, field] = args;
    if (table?.kind !== 'string' || field?.kind !== 'string') {
      throw new CalcEvalError('lookup() table and field must be strings');
    }
    if (key.kind === 'absent' || key.kind === 'series' || key.kind === 'period') return ABSENT;
    const keyStr = key.kind === 'string' ? key.value : String(key.value);
    return this.lookup(table.value, keyStr, field.value);
  };
}
