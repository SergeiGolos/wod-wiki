# 02 — Shared unit recognition and conversion for WQL analytics

Status: **Proposed — not implemented.** Nothing here is accepted decision or
runnable code; proposed types and functions are illustrative sketches. Anchored
in [issue 13 — Unit normalization, output defaults, and reducer
correctness](../issues/13-units-and-arithmetic.md), the [arithmetic
contract](../assets/arithmetic-contract.md) §5, and [query documents contract
§6](../assets/query-documents-contract.md), which already states the end-state
policy: *"WQL formula evaluation enforces strict physical dimension matching and
rejects the calc engine's historical authoritative casts (`pts`, `AU`) in WQL
queries."*

## Intent

Three modules today know what a unit is, and they disagree. WQL conversion
(`packages/wql/src/units.ts`) knows two families (kg↔lb, m↔km) and silently
passes everything else through. The composed-calc layer
(`packages/lang/src/analytics/calc/units.ts`) knows 30+ units with dimension
vectors and factors, but throws on mismatches and carries authoritative casts
(`AU`, `pts`, `MET-min`, `ratio`) that must never leak into WQL. The
recognition catalog (`packages/lang/src/metrics/units/UnitRegistry.ts`) knows
spellings, dimensions, and aliases — but holds **no conversion evidence at
all**. This document proposes the ownership seam that makes recognition and
conversion share one source: no import of the calc layer's legacy casts, and
no `wql → lang` package dependency.

## Verified current state

### WQL side: `packages/wql/src/units.ts`

**Current excerpt**, [units.ts:55–64](../../../../packages/wql/src/units.ts#L55-L64):

```ts
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
```

`resolveDisplayUnit` (line 70) falls back to the **first record's unit** with
`convert: false` when no directive or preferred unit applies. Unknown units are
never errors. Callers, verified: `QueryService.ts:40` imports both functions;
`toDisplayValue` (line 336) converts per fact **before** aggregation, only when
conversion resolved; line 814 rounds results to two decimals (`Math.round(… * 100) / 100` —
issue 13 scope 4 removes this); line 225 exposes `preferredUnit?: string`, fed
with `directive: parsed.displayUnit` at line 780. `packages/wql/src/index.ts:25`
re-exports `./units` publicly.
- **Playground duplicate**: `apps/playground/src/services/analytics/units.ts`
  is byte-for-byte the same module (verified by inspection). Consumers of the
  duplicate: `apps/playground/src/hooks/useWorkbenchServices.ts:16` (re-export)
  and `apps/playground/src/components/organisms/analytics/RawPointsTable.tsx:54-55`;
  its test is `apps/playground/src/services/analytics/units.test.ts`.
- **Widget unit preference**: `packages/ui/src/widgets/useAnalyticsUnitPreference.tsx`
  hardcodes `VALID_UNITS = ['kg', 'lb']` (line 11) with storage key
  `wod.analytics.unit` (line 7) and `getEffectiveAnalyticsUnit` /
  `getDashboardEffectiveUnit` (lines 71, 83) treating a kg/lb `displayUnit`
  directive as "forced" — the kg/lb-only hook the arithmetic contract calls
  out: *"no independent widget-preference tier ahead of the system default"*.

### Calc side: `packages/lang/src/analytics/calc/`

**Current excerpt**, [calc/units.ts:85–95](../../../../packages/lang/src/analytics/calc/units.ts#L85-L95):

```ts
export function convertScalar(value: number, fromUnit: string | undefined, toUnit: string): number {
  const to = UNITS[toUnit];
  if (!to) throw new CalcUnitError(`Unknown unit: ${toUnit}`);
  if (!fromUnit) return value / to.factor;
  const from = UNITS[fromUnit];
  if (!from) throw new CalcUnitError(`Unknown unit: ${fromUnit}`);
  if (!dimEquals(from.dim, to.dim)) {
    throw new CalcUnitError(`Cannot convert from ${fromUnit} to ${toUnit}: dimension mismatch`);
  }
  return (value * from.factor) / to.factor;
}
```

[calc/dimensions.ts](../../../../packages/lang/src/analytics/calc/dimensions.ts)
defines the 5-vector model `[L, M, T, C, E]` and `NAMED_COMPOUNDS`
(pace/speed/volume/power); callers at `calc/evaluator.ts:13,207` and
`calc/check.ts:95,153`. Its authoritative output casts are intentional legacy calc behavior, not evidence that its percent scaling or count-dropping rules satisfy strict WQL arithmetic. Keep that caller-specific cast policy outside shared conversion data.

### Recognition catalog: `packages/lang/src/metrics/units/UnitRegistry.ts`

**Current excerpt**, [UnitRegistry.ts:16–23](../../../../packages/lang/src/metrics/units/UnitRegistry.ts#L16-L23):

```ts
export interface UnitDef {
  /** Canonical, normalized spelling (e.g. `m`, `kg`, `cal`). */
  readonly canonical: string;
  /** What the unit measures. */
  readonly dimension: Dimension;
  /** Alternate spellings / acronyms (e.g. `lb` ← `lbs`, `pound`, `pounds`). */
  readonly aliases: readonly string[];
}
```

The header (line 8) says it plainly: *"This module is pure data + lookup."*
`STANDARD_UNITS` (line 105) lists m/km/cm/mm/ft/in/yd/mi, kg/g/lb/**bw**, cal/kcal
with aliases — `bw` is recognized as `mass` (alias `bodyweight`) here, and only
here. **Conversion evidence is absent**: nothing in the registry can answer
"how many m in a mi". Consumers (verified): `lang/src/dialects/UnitsDialect.ts`,
`lang/src/dialects/units/fuseUnits.ts`, `lang/src/runtime/compiler/metrics/MeasuredMetric.ts`,
`dimensionFactory.ts`.

### Package dependency facts (verified)

`packages/wql/package.json` and `packages/lang/package.json` each depend only on
`@bitcobblers/wod-wiki-core` (lang adds `uuid`). **There is no `wql → lang`
edge and none can be added** — query-documents contract §6 and issue 17 require
the calc evaluator to be *injected* into wql, keeping wql dependency-free of
lang. Meanwhile `packages/core` has no units module, and CONTEXT.md's Units
vocabulary already names this catalog "The **core** catalog … Pure, importable
data + lookup" — the vocabulary's owning home (`src/core/metrics/units/`) and
the physical home (`lang`) have drifted apart.

## Current concrete data example

Fact rows `{value: 1000, unit: 'm'}` and `{value: 1, unit: 'km'}` (both
canonical `distance` identity — CONTEXT.md: "Convertible units share an
identity"). Query `sum:distance{}`, no directive, no preference:
`resolveDisplayUnit` returns `{unit: 'm', convert: false}` (first record's
unit), `shouldConvert` is false, so `toDisplayValue` passes every value through
unconverted (`QueryService.ts:814`) → result **1001, labeled `m`** — the km
factor silently dropped. This is finding 3.3 / acceptance scenario 1 of issue 13
(`1000 m + 1 km` must return `2000 m`).

With directive `in km`, `convert` runs per fact before aggregation → `1 + 1 = 2 km`
(correct, but only because an explicit directive engaged). With directive
`in bw` or `in %`: `getUnitFamily` returns `undefined` → `applicable = false`
→ `{unit: 'bw', convert: false}` — the label changes, the values don't, no
error. That pass-through policy is what this document proposes to delete.

The percent/bw/count cases, precisely: `%` — absent from the core registry,
`DIM_ZERO` factor 1 in calc, unknown→pass-through in wql. `bw` — `mass`
(alias `bodyweight`) in the core registry only, absent from both conversion
tables. `count` — `DIM_COUNT` in calc only, absent from the registry and wql.
Issue 13 fixes the intent: ratios/percent with `100% = 1`; `bw` honored *only
with genuine measurement-time context*; count units (`rep reps count`) never
dropped as factors.

## Proposed sketch (illustrative — not decided, not runnable)

**Ownership**: extend the core catalog with conversion evidence, owned by
`packages/core` — the vocabulary's stated home and a package both `wql` and
`lang` already depend on. No `core → lang` import; no `wql → lang` import;
calc's `AUTHORITATIVE_CASTS` are never imported by the WQL path.

```ts
// Proposed sketch — shared core-owned data, not existing exports.
type DimVector = readonly [length: number, mass: number, time: number, count: number, energy: number];
interface UnitDefinition {
  readonly canonical: string;
  readonly dimension: DimVector;
  readonly aliases: readonly string[];
  readonly semanticScale?: string; // ratings are not interchangeable with ratios
  readonly conversion:
    | { kind: 'fixed'; factor: number }
    | { kind: 'contextual'; requires: 'recorded-body-mass' }
    | { kind: 'unavailable' };
}
type Conversion =
  | { ok: true; value: number }
  | { ok: false; error: 'unknown-unit' | 'dimension-mismatch' | 'scale-mismatch' | 'missing-context' | 'non-finite' | 'non-convertible' };
type ConversionContext = { recordedBodyMassKg?: number };
declare function convertUnit(value: number, from: string, to: string, context?: ConversionContext): Conversion;
declare function systemDefaultUnit(dimension: DimVector): string;
```

The proposed shared representation includes product/quotient dimensions and semantic scale identity; the current flat recognition union alone is insufficient for speed, pace, percentages, and named scales. Retain a recognition view for dialect fusion, while moving recognized definitions and validated conversion evidence to the shared data home. All participating consumers must use the same composed catalog snapshot, including dialect extensions. WQL applies strict checking; legacy calc authoring keeps any explicitly permitted cast policy in its own caller layer. Explicit compatible query output units override the agreed system defaults; no first-record fallback remains.

Caller usage sketch — `QueryService.toDisplayValue` (today at
`QueryService.ts:336-339`) becomes:

```ts
// Proposed sketch
const conv = convertUnit(value, unit, targetUnit);
if (!conv.ok) return diagnosed(conv.error, { query: parsed.metric, unit, targetUnit });
return conv.value;   // aggregate AFTER conversion, as today
```

Proposed data example, same input as above: `sum:distance{}` over `1000 m` +
`1 km`, no directive → target `m` (system default for distance) →
`convertUnit(1, 'km', 'm') = 1000` → aggregate `2000`, unit `m`. `sum:elapsed{}`
defaults to `s`; `in hr` converts; `in kg` errors for distance.

## Hidden implementation, adapters, locality

The interface is `convertUnit(value, from, to) → Conversion`; everything else
stays hidden: family lookup, alias normalization (case-insensitive, through the
registry — "normalize aliases through the registry, not name munging", issue 13),
the system-default table, compound-dimension composition, the strict/error
policy. Callers (`QueryService`, widgets, RawPointsTable) see only converted
values or diagnostics; convert-then-aggregate per fact stays as `QueryService`
already does it. Unit conversion is pure table lookup, so a **direct core
import** is right — no `IUnitConverter` ceremony (the *formula evaluator* is the
injected seam per contract §6; units are not the evaluator). The kg/lb widget
hook remains only until ticket 19 migrates its callers, then the kg/lb-only path is removed. This proposal does not add a new user-preference tier or silently repurpose the toggle into a system setting; compatible explicit `in lb` remains supported.

**Locality / Leverage**: recognition (`UnitSet`), conversion (new), and policy
(wql) each live in one module; `QueryService` keeps aggregation, gains nothing
unit-shaped. Simple fixed-factor units can be registered once for all consumers. Contextual units and semantic scales still require explicit conversion evidence and verification; they are not safe one-line additions by default.

## Deletion test

If this shared Module were deleted, recognition/conversion/default knowledge would return to WQL, calc, dialect, and display callers. That is its Depth. Deleting only the duplicate playground file removes duplication but does not unify policy. Migrate its `RawPointsTable` and re-export consumers, then remove it; separately remove first-record fallback, silent incompatible-unit pass-through, and intermediate rounding. A valid same-unit conversion is still an identity operation, but only after validating the unit and finite value.

## Incremental clean cutover

1. Move the recognition definitions to the proposed shared home without changing their recognized spellings. Update imports rather than keeping a permanent duplicate registry. Add explicit conversion evidence and context requirements; do not claim adding optional factors alone completes the strict converter.
2. Migrate calc and WQL callers to shared definitions while preserving their intentional policy differences. This structural stage need not change query answers.
3. Flip the policy: unknown/incompatible → error; system-default table replaces
   the first-record fallback. **Semantic, intentional change** — the mixed-unit
   sum changes (1001 → 2000); issue 13's acceptance scenarios are the spec.
4. Remove rounding; migrate `RawPointsTable` off the playground duplicate; delete it.
5. Ticket 19 migrates `useAnalyticsUnitPreference` callers; until then the hook
   stays functional (issue 13 clean-cutover constraint).

## Behavioral verification examples

- `sum:distance{}` over `1000 m + 1 km` → `2000 m`, no directive (issue 13 #1).
- `sum:elapsed{}` → `s`; `... in hr` converts; `sum:elapsed{} in kg` → error
  for that query, unrelated queries in the same document render (issue 13 #8).
- A historical `bw` value with recorded body mass converts from that retained context; without it, return a limitation. Today's body mass must not reinterpret history.
- `avg` of `120, missing, recorded 0` = `60`; `count` of the same = `2`
  (reducer matrix, issue 13 scope 3 — conversion runs before this matrix).
- `0.004 + 0.004 + 0.004 km` → `0.012 km` pre-formatting, stored unrounded.

## Tradeoffs and unresolved decisions

**Update:** the structural items below (registry home, contextual evidence representation, extension propagation) are now resolved by [ticket 21](../issues/21-unit-catalog-home.md); the bullets remain as review context.

- **Registry physical home**: moving the catalog to `packages/core` matches the
  vocabulary but touches every lang importer; alternatively core defines the
  extended `UnitDef` and lang keeps hosting. Undecided; the seam is the same either way.
- **Contextual conversion shape:** the requirement to use genuine measurement-time context is settled. The persisted representation and versioning of that evidence still need agreement with ticket 14; a blanket rejection of all `bw` values would narrow the contract.
- **Percent semantics:** `100% = 1` is settled. Source values retain their explicit unit and meaning; a `100 %` observation is not silently rewritten as unitless `100`. A ratio output receives the scaled numeric value.
- **Named defaults:** speed `m/s`, pace `min/km`, and named defaults preceding generic composed defaults are already agreed. No registration-order change may override them.
- **Catalog extensions:** define how validated dialect-added aliases, scales, and factors reach every consumer before claiming that the three tables have become one. Invalid or contextless conversion evidence must remain diagnosable.

## Siblings

- [04 — Dashboard note → block-local query documents](04-dashboard-note.md)
  consumes this unit policy inside query documents (`-> <unit>` sketches).
- [Deepening index](index.md), [Metric derivation](03-metric-derivation.md), and [transactional Persistence](07-transactional-storage.md) explain shared data and storage dependencies.
- Contracts: [arithmetic](../assets/arithmetic-contract.md), [query documents
  §6](../assets/query-documents-contract.md); ticket: [issue
  13](../issues/13-units-and-arithmetic.md).
