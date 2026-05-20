# ADR-0008: Effort Registry, Route Surface, and Two-Pass Analytics Resolution

**Status**: proposed  
**Area**: Effort Definitions / Analytics / Routing  
**Related PRD**: `docs/prd-effort-registry.md`  
**Related ADRs**: ADR-0002 (MET-Score), ADR-0003 (Discipline-Factor), ADR-0005 (Analytics Profile), ADR-0006 (METmax fallback), playground-route-governance

---

## Context

The analytics math defined in ADR-0002 through ADR-0007 requires **Activity METs** and a **Discipline-Factor** per effort performed in a workout. These values are not derivable from the workout script alone — `EffortMetric` currently stores only a raw string (e.g. `"Push-ups"`, `"run"`, `"hard fast"`). No resolution layer exists to map that string to physiological properties.

Without resolved effort data:
- `MET-Score` (ADR-0002) cannot be computed
- `Discipline-Factor` (ADR-0003) defaults to `1.0` for everything, losing the strength/yoga differentiation
- `MetMinuteProjectionEngine` produces estimates against a hard-coded assumed MET
- `TISProcessor` cannot be implemented at all
- `StandardAnalyticsProfile` (ADR-0005) cannot selectively activate processors based on which effort types are present

A resolution layer is required before any of ADR-0002 through ADR-0007 can be fully implemented.

---

## Decision

### 1. Effort Definitions Are First-Class Entities

Each effort is a named, versioned definition with a canonical slug (`push-up`, `run`, `kettlebell-swing`). Definitions carry:

- `met` — base MET value for the unmodified effort
- `disciplineFactor` — TIS discipline multiplier (strength `1.2`, cardio/HIIT `1.0`, yoga `0.9`)
- `parentSlug` — optional slug of the effort this definition was cloned from
- `modifierSchema` — declared modifier keys, accepted values, and the MET coefficient each value applies
- `metOverride` — optional hard MET value that unconditionally wins over coefficient computation
- `aliases` — strings the fuzzy resolver will match against script effort text
- `tier` — `'bundled'` (seeded at build time) or `'user'` (persisted in IndexedDB)

### 2. Two-Tier Registry: Bundled Seed + User-Defined

The registry holds two tiers. The bundled tier is a data file (not logic) checked into the repository containing common movements with research-backed MET values. The user tier is persisted in IndexedDB and checked first during all resolution operations. User definitions can override bundled efforts by sharing a slug, or extend the registry with entirely new efforts.

**Chosen over single-tier** because seeded data covers the 80% case without requiring user setup, while user extensibility handles specialty movements. User priority ensures customizations are always respected.

### 3. Clone-Based Derivation

New efforts can be created by cloning an existing effort. The clone sets `parentSlug` and inherits the parent's `met`, `disciplineFactor`, and `modifierSchema` as starting values. The user modifies only what differs.

**MET resolution order for a derived effort** (first match wins):
1. `metOverride` — set explicitly by the user, unconditional
2. `parentMet × ∏(active modifier coefficients)` — auto-computed from the parent's resolved MET and the modifier keys present in the effort URL's query params
3. Parent's resolved MET — inherited unchanged when no active modifiers have defined coefficients

**Chosen over manual-only MET entry** because coefficient-based computation lets a rich seeded dataset propagate intelligently through derivation chains. The hard override exists for cases where research provides a specific value that coefficient math would not reach.

### 4. Fuzzy Alias Resolution With Unresolved Fallback

The resolver normalizes both the script effort string and each alias: lowercase, strip punctuation, collapse whitespace, then compare. Users define aliases on any effort's detail page.

When no alias matches, the effort is marked **unresolved**. Resolution falls back to a configurable default MET (same pattern as ADR-0006's population-average METmax). The resolved metrics are tagged `origin: 'analyzed-estimated'` to signal reduced precision to downstream display and TIS output (consistent with the `analyzed-estimated` addition required by ADR-0006).

**Chosen over exact-match-only** because workout scripts are authored text, not code — `"Push-Ups"`, `"pushup"`, `"push ups"` should all resolve to `push-up`. The graceful-degradation fallback means analytics never hard-fail on an unresolved effort, preserving the same defensive posture established by ADR-0006.

### 5. Route Surface: `/efforts` Catalog + `/effort/:slug?{attribute-metrics}`

Two new canonical routes are added to `ROUTE_PATTERNS` in `playground/src/lib/routes.tsx`:

```
/efforts                              — catalog index
/effort/:slug                         — effort detail page (inline edit mode)
```

Modifier attribute metrics are passed as standard URL query params:

```
/effort/run?speed=6mph&surface=treadmill
/effort/push-up?position=kneeling
/effort/kettlebell-swing?equipment=kettlebell&count=double
```

Query params are **attribute metrics** — typed key-value pairs in the existing `IMetric` sense. They are serialized from `Record<string, string>` via `URLSearchParams`. The effort slug names the base effort; the query params identify the specific instance of that effort with its modifier attributes applied.

Path builders `effortsPath()` and `effortPath(slug, modifiers?)` are added to `routes.tsx`. These routes are governed by the playground-route-governance ADR — they are canonical, not compatibility aliases.

**Chosen key-value query params over path segments or a tag list** because modifier attributes are typed key-value data that integrates naturally with the existing `IMetric` system and allows open-ended attribute sets without a fixed schema per effort type.

### 6. Two-Pass Analytics Resolution

Effort resolution feeds the analytics pipeline at two points:

**Pass 1 — Compile-time (`EffortEnrichmentPass`)**  
Runs after JIT compilation. For each `CodeStatement` containing an `EffortMetric`, the enrichment pass calls the effort resolver and injects `met` and `disciplineFactor` metrics with `origin: 'compiler'`. These represent **planned intensity** — what the script specifies. Unresolved efforts inject default values with `origin: 'analyzed-estimated'`.

**Pass 2 — Analytics-time (per-segment re-resolution)**  
`AnalyticsContext` (ADR-0005) gains an `effortResolver: IEffortResolver` field. `IRealtimeProcessor` implementations call `context.effortResolver.resolve(slug, modifiers)` per segment, where `modifiers` reflects any modifier attribute metrics logged during execution (e.g., actual weight used). Results carry `origin: 'analyzed'`, which wins over the compile-time `'compiler'` value in the metric precedence chain.

```
IEffortResolver {
  resolve(slug: string, modifiers?: Record<string, string>): ResolvedEffort
}

ResolvedEffort {
  slug:             string
  met:              number
  disciplineFactor: number
  origin:           'analyzed' | 'analyzed-estimated'
  resolvedFrom:     'user' | 'bundled' | 'default'
}
```

**Chosen two-pass over single-pass** because compile-time resolution gives the runtime display planned-intensity values immediately (no async wait), while analytics-time re-resolution with logged modifier context produces accurate post-session MET values. Planned vs. actual intensity is already a meaningful distinction in the metric origin vocabulary (`'compiler'` vs. `'analyzed'`) and requires no new origin types.

### 7. No Processor Imports the Registry Directly

All analytics processor access to effort data goes through `IEffortResolver` injected via `AnalyticsContext`. This preserves the testability goal of ADR-0005 — processors can be unit tested with a mock resolver without a real registry. `StandardAnalyticsProfile` is responsible for constructing the registry-backed resolver and injecting it into `AnalyticsContext` at session start.

---

## Considered Alternatives

**Single-tier user-only registry** — rejected. Requires every user to define every effort before analytics work. The seeded bundled tier eliminates the cold-start problem.

**Effort resolution as a separate microservice/API** — rejected. The playground is a local-first application. The registry lives in IndexedDB and a static data file; the resolver is a synchronous in-process call.

**Path-segment modifiers (`/effort/push-up/kneeling`)** — rejected. Path segments imply named first-class child efforts and break for open-ended attribute combinations. Query params allow unbounded attribute sets and integrate with the `IMetric` system without a fixed per-effort schema.

**Single analytics pass (compile-time only)** — rejected. Compile-time resolution uses script-specified modifier attributes. Post-session logged modifier attributes (actual weight, actual speed) may differ from what was planned. Two passes allow planned → actual refinement with no new mechanism — the existing `origin` precedence chain handles resolution order automatically.

**Fuzzy matching with no fallback** — rejected. An unresolvable effort that blocks analytics output is worse than an estimated output with a visible disclosure. The pattern is established by ADR-0006.

---

## Consequences

- `EffortMetric` gains an optional `resolvedSlug` field populated after the `EffortEnrichmentPass` runs, so the analytics pipeline always has a canonical slug to resolve against even when the script text is an alias.
- `AnalyticsContext` gains `effortResolver: IEffortResolver` (breaking change to the interface; callers must supply a resolver — `StandardAnalyticsProfile` provides the default).
- `MetMinuteProjectionEngine` and `TISProcessor` are unblocked: they call `context.effortResolver.resolve()` rather than assuming a hard-coded MET.
- `StandardAnalyticsProfile` gains `requiredMetrics: [MetricType.Effort]` on MET-dependent processors, ensuring they only activate for workouts that contain effort statements (consistent with ADR-0005 activation logic).
- The `/efforts` and `/effort/:slug` routes must be added to the playground route inventory doc (`docs/design-system/02.page-routes/Playground-Route-Inventory.md`) per the playground-route-governance ADR validation path.
- Bundled effort data file must be reviewed and updated when new research provides more accurate MET values — this is data maintenance, not a code change.

---

## Open Questions — Resolve Before Implementing

1. **Default MET for unresolved efforts**: What value should the unresolved-effort fallback MET be? Candidates: `3.5` (sedentary baseline), `5.0` (light activity average), `8.0` (moderate CrossFit average). The team should align on this before `EffortEnrichmentPass` is implemented. Recommended: `5.0` with a disclosure — errs toward underestimation, which is safer for load calculation than overestimation.

2. **Modifier coefficient schema authoring UX**: The effort detail page needs a UI for defining modifier keys, accepted values, and their coefficients. The data shape is clear but the editing UX has not been designed. This does not block the resolver or analytics integration but must be resolved before the detail page is considered complete.

3. **Fuzzy match threshold**: What similarity score constitutes a match? A normalized edit-distance of ≤ 2 characters is a reasonable starting point but should be validated against real script corpora before hardening.
