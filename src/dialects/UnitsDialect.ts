import { IDialect, DialectAnalysis } from "../core/models/Dialect";
import { ICodeStatement } from "../core/models/CodeStatement";
import { UnitRegistry, UnitSet } from "../core/metrics/units";
import { fuseUnits } from "./units/fuseUnits";

/**
 * Base Units Dialect — the bottom of the Dialect Stack.
 *
 * The parser is unit-agnostic: it emits bare Number and Text. This dialect's
 * {@link transform} fuses adjacent Number + unit-word metrics into dimensioned
 * metrics (Distance / Resistance / energy …) using the core {@link UnitRegistry}.
 *
 * It contributes no hints — units are a rewrite, not a marker — so {@link analyze}
 * returns nothing. Sport dialects stack on top and may extend the unit set; a
 * personal-overrides dialect can sit last. Because fusion is idempotent, this
 * dialect is safe to run in both the parse pipeline and the compile-time stack.
 */
export class UnitsDialect implements IDialect {
  id = 'units';
  name = 'Units Dialect';

  private readonly units: UnitSet;

  /**
   * @param units the unit set to recognize. Defaults to the standard catalog;
   *   pass an extended set (e.g. `UnitRegistry.standard().extend(...)`) to add
   *   or override units.
   */
  constructor(units: UnitSet = UnitRegistry.standard()) {
    this.units = units;
  }

  transform(statement: ICodeStatement): void {
    fuseUnits(statement, this.units);
  }

  analyze(_statement: ICodeStatement): DialectAnalysis {
    return {};
  }
}
