# PRD — Effort Registry and Resolution Pipeline

**Area**: Effort Definitions / Analytics / Route Surface  
**Status**: Ready for engineering  
**Source**: Architecture review + ADR metrics math requirements (ADR-0002 through ADR-0007)

---

## Problem Statement

Workout scripts in WOD Wiki contain effort strings — `"Push-ups"`, `"1.5 mile run"`, `"kettlebell swing"` — that the parser captures as raw `EffortMetric` text. These strings are unresolved: the system has no knowledge of what physiological properties they represent.

The analytics math defined in the ADRs requires three values that can only come from a resolved effort:

- **Activity METs** — the metabolic equivalent of the effort, required for MET-Score (ADR-0002) and TIS Duration-Score
- **Discipline-Factor** — the training discipline multiplier (`1.2` strength, `1.0` cardio/HIIT, `0.9` yoga) required for TIS (ADR-0003)
- **Modifier attributes** — open-ended key-value properties (`speed`, `equipment`, `position`, `resistance`) that shift MET values and enable effort-level autoregulation context (RIR, ADR-0004)

Without a resolution layer, none of the analytics ADRs can be fully implemented. `SessionLoad`, `TIS`, `MET-minutes`, and the discipline-aware processor assembly (ADR-0005) all stall at the same gap: the effort string has no canonical definition.

Beyond analytics, there is no place in the application where an athlete or coach can inspect, define, or extend what an effort *means* — its MET value, how it relates to similar efforts, what modifiers it accepts, or what aliases will match it in a script.

---

## Solution

Introduce an **Effort Registry** — a two-tier, clone-based definition system — paired with a **route surface** at `/efforts` and `/effort/{slug}?{attribute-metrics}` that makes each effort a browsable, editable first-class entity.

The registry is the single source of truth for effort resolution. The analytics pipeline consumes it at two points: compile-time (planned MET annotation) and analytics-time (post-session re-resolution with logged modifier context). The route surface is both the UI for managing effort definitions and the canonical URL structure that identifies any specific effort instance.

---

## User Stories

1. As an athlete, I want effort strings I write in my workout scripts to automatically resolve to known physiological values, so that my analytics are accurate without manual data entry.
2. As an athlete, I want to browse a catalog of seeded efforts at `/efforts`, so that I can discover what movements are already defined and what properties they carry.
3. As an athlete, I want to navigate to `/effort/push-up` and see the full definition of that effort — its MET value, discipline factor, derivation parent, modifier coefficients, and accepted aliases — so I understand how the system interprets my scripts.
4. As an athlete, I want to edit an effort's definition inline on its detail page, so that I can override a seeded value (e.g., adjust MET to match my actual fitness level) without leaving the effort's canonical URL.
5. As an athlete, I want to clone a seeded effort to create a modified version (e.g., clone `push-up` to create `kneeling-push-up`), so that I inherit the parent's properties and only specify what differs.
6. As an athlete, I want the child effort's MET value to be auto-computed from the parent's MET and the modifier coefficients I define on the clone, so that I don't have to look up every derived value manually.
7. As an athlete, I want to override the auto-computed MET on any cloned effort with a hard value, so that research-backed numbers take precedence over coefficient math when I know better.
8. As an athlete, I want to add aliases to any effort (e.g., `"pushup"`, `"push ups"`, `"Press-Up"`), so that scripts I've already written continue to resolve correctly regardless of spelling variation.
9. As an athlete, I want fuzzy alias matching to handle case and minor variation automatically, so that I don't have to be exact in my workout scripts.
10. As an athlete, I want unresolved effort strings to degrade gracefully with a default MET and a visible disclosure, so that my analytics are never silently wrong — I can see when an effort needs a definition.
11. As an athlete, I want to navigate to `/effort/run?speed=6mph&surface=treadmill` and see how modifier attribute metrics affect the effort's resolved MET, so I understand how the URL encodes a specific effort instance.
12. As an athlete, I want modifier query params on the effort URL to be treated as attribute metrics (typed key-value pairs), so that they integrate naturally with the existing metric pipeline.
13. As a coach, I want to define completely custom efforts not in the seeded registry, so that specialty movements (strongman, gymnastics, sport-specific) are tracked with accurate values.
14. As a coach, I want user-defined efforts to take precedence over seeded efforts during resolution, so that my custom overrides are always respected.
15. As a coach, I want to see the full derivation chain of a cloned effort (parent → modifiers → override), so that I can audit where a MET value came from.
16. As a coach, I want effort definitions to declare which modifier keys they accept and what coefficient each modifier value applies to the MET, so that the system can compute MET adjustments automatically across the derivation tree.
17. As the analytics engine, I want each `CodeStatement` containing an effort to be annotated with a resolved `met` and `disciplineFactor` metric at compile time (`origin: 'compiler'`), so that the runtime display has planned-intensity values immediately.
18. As the analytics engine, I want to re-resolve efforts at analytics time using logged modifier attribute metrics (`origin: 'analyzed'`), so that post-session MET values reflect what the athlete actually did (weight used, speed logged, etc.).
19. As the analytics engine, I want compile-time resolved metrics to be overridden by analytics-time resolved metrics via the existing metric precedence chain, so that planned vs. actual intensity is handled consistently with the rest of the metric system.
20. As the analytics engine, I want `AnalyticsContext` to carry an `effortResolver`, so that `IRealtimeProcessor` implementations can look up effort properties per segment without coupling to the registry directly.
21. As a developer, I want the effort registry to be injectable and testable in isolation, so that analytics processors can be unit tested with mock effort data.
22. As a developer, I want the seeded effort registry to be a data file (not code logic), so that the community can contribute new efforts without modifying processor or compiler code.
23. As a developer, I want new effort routes to be registered in `ROUTE_PATTERNS` following the playground route governance ADR, so that the route contract is centralized and verifiable.

---

## Implementation Decisions

### Effort Definition Shape

Each effort definition is a record with the following structure (shape, not code):

- `slug` — URL-safe canonical identifier (e.g. `push-up`, `run`, `kettlebell-swing`)
- `displayName` — human-readable label
- `met` — base MET value (numeric, required; population-average fallback if unknown per ADR-0006 pattern)
- `disciplineFactor` — TIS discipline multiplier (`1.2` strength, `1.0` cardio/HIIT, `0.9` yoga)
- `parentSlug` — optional; slug of the effort this was cloned from
- `modifierSchema` — map of accepted modifier keys to their accepted values and MET coefficients (e.g. `speed: { "6mph": 1.0, "9mph": 1.25 }`)
- `metOverride` — optional hard value that wins over computed MET from coefficient chain
- `aliases` — array of strings used for fuzzy resolution from script effort strings
- `tier` — `'bundled'` or `'user'`; user tier always checked first during resolution

### Two-Tier Registry

The registry holds two collections: bundled (seeded at build time from a data file) and user-defined (persisted in IndexedDB alongside playground notes). Resolution checks user tier first, bundled second. Both tiers support the same definition shape.

### Clone-Based Derivation

Cloning an effort creates a new user-tier definition with `parentSlug` set. MET resolution order for a derived effort:
1. `metOverride` (if set) — wins unconditionally
2. `parentMet × product(modifierCoefficients)` — auto-computed from inherited parent MET and applied modifier keys
3. Parent's resolved MET — inherited unchanged if no modifiers defined

### Fuzzy Alias Resolution

The resolver normalizes both the script effort string and each alias to lowercase, strips punctuation, and collapses whitespace before matching. Users can add aliases on any effort's detail page. When no alias matches, the effort is marked `unresolved`, analytics proceeds with a configurable default MET (same pattern as ADR-0006), and the output is tagged `origin: 'analyzed-estimated'`.

### Route Surface

New canonical routes added to `ROUTE_PATTERNS`:

- `/efforts` — catalog index, browsable + searchable list of all registered efforts
- `/effort/:slug` — effort detail page; edit mode inline; modifier attribute metrics passed as query params

Path builder functions `effortsPath()` and `effortPath(slug, modifiers?)` added to `routes.tsx`. Modifier query params are serialized as `URLSearchParams` from a `Record<string, string>`.

### Analytics Pipeline Integration

**Compile-time**: A new `EffortEnrichmentPass` runs after JIT compilation. For each `CodeStatement` with an `EffortMetric`, it calls the registry resolver and injects `met` and `disciplineFactor` metrics with `origin: 'compiler'`. Unresolved efforts inject default values tagged `origin: 'analyzed-estimated'`.

**Analytics-time**: `AnalyticsContext` gains an `effortResolver` field typed to an `IEffortResolver` interface. `IRealtimeProcessor` implementations that need MET values call `context.effortResolver.resolve(slug, modifiers)` per segment. The result carries `origin: 'analyzed'`, which wins over the compile-time `'compiler'` value in the metric precedence chain.

### Processor Integration

`StandardAnalyticsProfile` (ADR-0005) constructs the `AnalyticsContext` with the registry-backed `IEffortResolver`. `MetMinuteProjectionEngine` and the forthcoming `TISProcessor` are the first consumers. No processor imports the registry directly — all access goes through `IEffortResolver`.

---

## Testing Decisions

A good test for this feature tests **external behavior only**: given a script with known effort strings and a registry with known definitions, assert what MET values appear in the compiled output metrics and in the analytics summary — not which internal method resolved them.

**Modules to test:**

- `EffortResolver` — unit tested in isolation with a mock two-tier registry. Assert: user tier wins over bundled; alias fuzzy match resolves correctly; coefficient chain computes expected MET; unresolved returns default + `analyzed-estimated` origin.
- `EffortEnrichmentPass` — unit tested with a mock registry. Assert: CodeStatements gain injected `met` and `disciplineFactor` metrics with `origin: 'compiler'` after the pass.
- `EffortRegistryService` — integration tested against a real IndexedDB test double. Assert: CRUD operations persist user efforts; clone creates child with correct `parentSlug`; user tier is returned first.
- Analytics pipeline integration — tested via `RuntimeTestBuilder` harness with a seeded mock registry. Assert: MET-minutes output reflects resolved MET values; `analyzed-estimated` disclosure appears when effort is unresolved.
- Route registration — snapshot test asserting `/efforts` and `/effort/:slug` are present in `ROUTE_PATTERNS`.

Prior art: `tests/jit-compilation/` for compiler pass patterns; `src/timeline/analytics/` for processor test patterns; `tests/harness/RuntimeTestBuilder` for end-to-end analytics assertions.

---

## Out of Scope

- Bulk import of MET compendium data (seeded efforts can be added incrementally; a full compendium import tool is a separate feature)
- Social/shared effort libraries (user efforts are local to the device in this iteration)
- Effort-level video or image attachments
- Automatic MET detection from wearable data
- Per-effort 1RM or personal records tracking (that belongs to the athlete profile, not the effort definition)
- Route surface for modifier schema editing (modifier keys and coefficients are edited on the effort detail page; a dedicated modifier schema builder is future work)

---

## Further Notes

The `/effort/{slug}?{attribute-metrics}` URL pattern is intentionally a **superset of the effort string in the script**. An effort string like `"kneeling push-up at slow tempo"` that resolves via alias to `/effort/push-up?position=kneeling&tempo=slow` gives the user a navigable URL they can visit to see exactly how that effort instance was interpreted. This creates a natural feedback loop: write a script, run it, click an unresolved effort disclosure, land on `/effort/push-up` with pre-filled modifier params, and create or amend the definition.

The two-pass analytics enrichment (compile-time `'compiler'` + analytics-time `'analyzed'`) mirrors the existing metric origin vocabulary and plays cleanly with the `origin: 'analyzed-estimated'` addition proposed in ADR-0006. No new origin types are needed.
