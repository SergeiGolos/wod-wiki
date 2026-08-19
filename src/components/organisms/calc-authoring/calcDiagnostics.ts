/**
 * Static diagnostics for a drafted calc line (#880) — the "Static
 * Diagnostics Strip" backend.
 *
 * Reuses the engine's real registration-time checking: the draft is compiled
 * with the line-form compiler, then registered into a throwaway
 * `CalculationRegistry` (seeded with the built-ins so library refs like
 * `rpeSource.rpe` resolve). Any `CalcRegistrationError` — unknown symbol,
 * dimension mismatch, bad convert target, invalid output unit — surfaces as
 * a diagnostic; a clean registration yields the inferred dimension vector
 * (rendered in the strip and used for dimension-aware unit suggestions).
 *
 * Pure logic, no DOM — unit-testable.
 */

import { DimVector, DIM_ZERO, compoundName } from '@bitcobblers/wod-wiki-engine';
import { CalculationRegistry } from '@bitcobblers/wod-wiki-engine';
import { LookupRegistry, ILookupTable } from '@bitcobblers/wod-wiki-engine';
import { BUILTIN_CALCS, STORE_CALCS } from '@bitcobblers/wod-wiki-engine';
import { compileLineForm } from '@bitcobblers/wod-wiki-engine';
import { CalculationDefinition, CalcScope } from '@bitcobblers/wod-wiki-engine';
import { outputNodeId } from '@bitcobblers/wod-wiki-engine';

export interface CalcDiagnostic {
  severity: 'error' | 'warning';
  message: string;
}

export interface CalcAnalysis {
  defs: CalculationDefinition[];
  diagnostics: CalcDiagnostic[];
  /** Inferred dimension vector of the primary output node, when computable. */
  dim: DimVector | undefined;
  /** Named compound label for the output dim (e.g. "power"), when known. */
  compound: string | undefined;
}

/** A table stub carrying only the field metadata static checking needs. */
function silentTable(
  id: string,
  fields: ILookupTable['fields'],
  missPolicy: 'absent' | 'default-row' = 'absent',
): ILookupTable {
  return { id, fields, missPolicy, get: () => undefined };
}

/** The four built-in lookup tables, metadata-only (registration-time dims). */
export function buildStaticLookups(): LookupRegistry {
  const reg = new LookupRegistry();
  reg.register(silentTable('effort', {
    met: { dimension: DIM_ZERO, type: 'number' },
    disciplineFactor: { dimension: DIM_ZERO, type: 'number' },
    discipline: { dimension: DIM_ZERO, type: 'string' },
    intensityTier: { dimension: DIM_ZERO, type: 'string' },
    resolvedFrom: { dimension: DIM_ZERO, type: 'string' },
  }, 'default-row'));
  reg.register(silentTable('rpe-labels', { rpe: { dimension: DIM_ZERO, type: 'number' } }));
  reg.register(silentTable('profile', { vo2max: { dimension: DIM_ZERO, type: 'number' } }));
  reg.register(silentTable('disciplines', { disciplineFactor: { dimension: DIM_ZERO, type: 'number' } }, 'default-row'));
  return reg;
}

function registerBestEffort(reg: CalculationRegistry, defs: CalculationDefinition[]): void {
  for (const def of defs) {
    try { reg.register(def); } catch { /* built-ins already validated; ignore */ }
  }
}

/** Analyze a drafted calc-line source against the engine's static checks. */
export function analyzeCalcLine(src: string, scope: CalcScope = 'segment'): CalcAnalysis {
  const diagnostics: CalcDiagnostic[] = [];
  let defs: CalculationDefinition[] = [];

  try {
    const compiled = compileLineForm(src, { scope });
    defs = compiled.defs;
    for (const w of compiled.warnings) diagnostics.push({ severity: 'warning', message: w });
  } catch (err) {
    return {
      defs,
      diagnostics: [{ severity: 'error', message: err instanceof Error ? err.message : String(err) }],
      dim: undefined,
      compound: undefined,
    };
  }

  const lookups = buildStaticLookups();
  const registry = new CalculationRegistry(lookups);
  registerBestEffort(registry, [...BUILTIN_CALCS, ...STORE_CALCS]);

  let dim: DimVector | undefined;
  for (const def of defs) {
    try {
      registry.register(def);
    } catch (err) {
      diagnostics.push({ severity: 'error', message: err instanceof Error ? err.message : String(err) });
      continue;
    }
    // Success — read the primary node's inferred dimension. Output calcs use
    // the declared output node; library calcs fall back to their primary node.
    const out = outputNodeId(def) ?? (def.kind === 'library' ? Object.keys(def.variants[0]?.nodes ?? {})[0] : undefined);
    const primary = [...def.variants].sort((a, b) => b.priority - a.priority)[0];
    const d = out && primary.nodeDims?.[out];
    if (d) dim = d;
  }

  let compound: string | undefined;
  if (dim) compound = compoundName(dim);

  if (defs.length === 0) diagnostics.push({ severity: 'warning', message: 'No calc line parsed.' });
  return { defs, diagnostics, dim, compound };
}
