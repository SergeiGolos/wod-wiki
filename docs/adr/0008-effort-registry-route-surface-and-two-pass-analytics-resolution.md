# ADR-0008: Effort Registry Route Surface and Two-Pass Analytics Resolution

**Date:** 2026-05-20
**Status:** Accepted
**Issue:** [WOD-524](/WOD/issues/WOD-524)
**References:** [WOD-522](/WOD/issues/WOD-522), [WOD-517](/WOD/issues/WOD-517), [[Metrics Processor Architecture]], `src/core/analytics/`

---

## Context

The product needs a canonical way to represent exercise efforts such as rowing, running, assault bike, or coach-defined compound efforts.

Today, effort semantics are fragmented across:

- authored labels in workout scripts
- analytics processor assumptions
- hardcoded MET and activity mappings
- UI labels and ad hoc aliases

That fragmentation creates four architecture problems.

### 1. There is no stable effort identity

A coach may author `row`, `rowing`, `erg`, or `concept2 row`, but the system has no first-class entity that says those names refer to the same effort definition.

Without a canonical identity, routes, analytics joins, user customization, and future reporting all depend on brittle strings.

### 2. Customization has no durable seam

If users need to refine MET, discipline, or modality assumptions for their own training context, there is no registry boundary where those overrides can live.

That pushes customization either into code changes or into UI-only hacks that analytics cannot trust.

### 3. Resolution happens too late and too inconsistently

Some effort references are knowable at compile time because the author provides an explicit canonical slug.

Other references only exist as free-form coach text and must be resolved later during analytics.

Treating those cases as one undifferentiated path would blur provenance and make downstream confidence handling difficult.

### 4. Analytics processors need a boundary, not a global registry import

Processors should consume effort resolution through a stable interface inside analytics context.

If processors import registry implementations directly, the analytics layer becomes coupled to persistence, routing, and registry internals.

## Decision

### 1. Efforts are first-class entities with canonical slugs

#### Decision statement

The system will model efforts as first-class domain entities with stable canonical slugs.

Each effort record must have, at minimum:

- `slug` — canonical identifier used for routes, references, and joins
- `label` — primary human-readable name
- `aliases` — additional searchable and fuzzy-matchable names
- `baseAttributes` — canonical effort attributes such as MET, discipline, and other analytics-relevant metadata
- `registrySource` — where the effort record came from: bundled, user, or synthetic-unresolved

The canonical slug is the durable identity boundary. Display labels and aliases may vary, but references should point at the slug.

#### Rationale

A first-class effort entity gives the architecture one place to attach semantics that are currently scattered across labels, processors, and lookups.

Canonical slugs make these workflows stable:

- routing to an effort detail screen
- deriving user-specific variants from a known parent
- grouping analytics across alias variants
- reusing the same effort definition in compile-time and analytics-time paths

This also separates entity identity from runtime provenance. The effort entity owns `registrySource`; runtime metrics can still use existing metric `origin` values such as `compiler`, `analyzed`, or `analyzed-estimated`.

#### Rejected alternatives

- **Plain strings only** — rejected because string equality is too weak for joins, routing, and user overrides.
- **Processor-owned activity definitions** — rejected because it would keep effort semantics fragmented across analytics implementations.
- **Route-only identifiers without domain entities** — rejected because routes are consumers of identity, not the owner of it.

#### Consequences

- all durable effort references become slug-based rather than label-based
- effort records can be reused by routing, analytics, and customization paths
- alias management becomes part of the registry contract instead of scattered heuristics
- the system must define slug normalization rules and migration policy carefully

### 2. The registry is two-tier: bundled seed plus user IndexedDB, with user definitions winning

#### Decision statement

The effort registry will have two storage tiers:

1. **Bundled seed registry** — shipped with the app as the default catalog
2. **User registry in IndexedDB** — local user-defined or user-derived effort records

Lookup order is user tier first, bundled tier second.

A user effort with the same slug as a bundled effort overrides the bundled definition for that user's runtime and analytics context.

#### Rationale

This preserves a stable default catalog while allowing local customization without forking the shipped dataset.

The architecture remains offline-friendly because effort lookup does not require a backend call.

The user-wins rule is the most predictable override policy for athlete- and coach-specific calibration. If a user explicitly customizes an effort, that customization should be authoritative inside that user's environment.

#### Rejected alternatives

- **Single bundled registry only** — rejected because it cannot support durable user customization.
- **Single mutable user registry copied from seed** — rejected because it collapses default and override semantics, making upgrades and provenance harder to reason about.
- **Server-only registry resolution** — rejected because analytics and route resolution must still work offline and locally.

#### Consequences

- the product gains a clean override seam for local customization
- bundled catalog updates remain possible without erasing local user intent
- registry merge rules and slug-collision policy must be explicit
- future sync can be added as a transport concern without changing the runtime lookup contract

### 3. User customization uses clone-based derivation with coefficient chains and hard overrides

#### Decision statement

User-defined effort variants will be created by cloning an existing effort and applying one or both of these mutation styles:

- **coefficient chain** — multiplicative modifiers applied to numeric base attributes
- **hard override** — explicit replacement of an attribute value

Recommended shape:

```ts
interface EffortDerivation {
  parentSlug: string;
  coefficients?: Record<string, number>;
  hardOverrides?: Record<string, unknown>;
}
```

Numeric attributes that scale naturally, such as MET-like intensity values, should prefer coefficients. Attributes that do not scale meaningfully should use hard overrides.

#### Rationale

Clone-based derivation preserves lineage.

That matters because the system needs to answer questions such as:

- which custom effort came from which base effort
- whether bundled updates should be re-applied or reviewed
- how a user-specific effort differs from the shipped default

Coefficient chains are expressive enough for most calibration use cases without forcing coaches into a formula authoring system. Hard overrides preserve determinism where multiplication is the wrong model.

#### Rejected alternatives

- **Full detached copies only** — rejected because lineage and upgrade reasoning disappear immediately.
- **Arbitrary formula language** — rejected because it increases complexity, validation cost, and UX burden for little near-term leverage.
- **Only hard overrides, no derivation metadata** — rejected because the system would lose explainability around how custom values were produced.

#### Consequences

- custom efforts stay explainable and traceable to a parent
- future migration or rebase tools become possible because lineage is preserved
- the system must define which attributes are coefficient-eligible versus override-only
- UX must expose derivation in a way that is understandable to non-technical users

### 4. Free-form effort labels resolve through fuzzy alias matching, then fall back to unresolved synthetic efforts

#### Decision statement

When analytics encounters a free-form effort label that is not already canonically resolved, the resolver will:

1. try exact alias or slug matching
2. try fuzzy alias matching
3. if still unresolved, create a synthetic unresolved effort for analytics continuity

When fuzzy matching succeeds, the runtime metric origin is `analyzed`.

When no match succeeds, the system creates a synthetic unresolved effort with:

- a normalized synthetic slug derived from the authored label
- `registrySource: synthetic-unresolved`
- runtime metric origin `analyzed-estimated`
- fallback analytics attributes, including a default MET value to be finalized by open question

Synthetic unresolved efforts are analyzable placeholders, not automatically persisted into the user registry.

#### Rationale

This keeps analytics resilient to typos, abbreviations, and coach-local naming without forcing perfect author discipline.

It also preserves continuity: an unresolved effort still becomes an explicit analyzable entity instead of collapsing into null.

Using `analyzed` versus `analyzed-estimated` preserves confidence information for downstream processors and future UI.

#### Rejected alternatives

- **Strict exact matching only** — rejected because real authored data is messy and would produce unnecessary null resolution failures.
- **Drop unresolved efforts entirely** — rejected because losing the effort signal is worse than carrying an estimated placeholder with provenance.
- **Auto-persist every unresolved label into the user registry** — rejected because transient typos should not silently mutate durable user data.

#### Consequences

- analytics remains robust against imperfect authored labels
- downstream consumers can distinguish matched efforts from estimated unresolved placeholders
- the system needs clear similarity-threshold governance to avoid bad fuzzy matches
- unresolved fallback defaults must be documented so estimated outputs remain explainable

### 5. The route surface is `/efforts` for the catalog and `/effort/:slug?key=value` for detail-state metrics

#### Decision statement

The product will expose the effort registry through this route surface:

- `/efforts` — effort catalog, search, filtering, and create-entry entrypoint
- `/effort/:slug` — effort detail and editing surface
- query params on `/effort/:slug` — attribute-metric state such as `?met=5.5&discipline=rowing`

The route slug is the identity boundary. Query params are view/edit state for effort attributes, not alternate identities.

#### Rationale

This gives the product a stable plural catalog route and a stable singular detail route while keeping attribute experimentation in the query string.

Using query params for attribute metrics avoids exploding the route tree for every editable or inspectable attribute combination.

It also keeps the URL legible and copyable for review flows such as “show me the running effort with this MET override applied.”

#### Rejected alternatives

- **Only one generic route with nested UI state** — rejected because it weakens shareability and makes route semantics less clear.
- **Path segments for every attribute dimension** — rejected because attribute combinations are open-ended and would create brittle route expansion.
- **No dedicated effort routes** — rejected because first-class effort entities should have first-class navigable surfaces.

#### Consequences

- effort routes become stable external and internal references
- catalog and detail responsibilities stay distinct
- query parsing and validation become part of the route contract
- effort attribute URLs can be shared without introducing additional route definitions

### 6. Resolution is two-pass: compile-time canonical resolution first, analytics-time recovery second

#### Decision statement

Effort resolution will happen in two explicit passes.

**Pass 1 — compile time**

When authored input already carries a canonical effort slug or a compiler-resolvable effort reference, the compiler attaches that resolved effort reference with runtime metric origin `compiler`.

**Pass 2 — analytics time**

When compiled output still has only free-form effort text or no canonical effort reference, analytics resolves it through `IEffortResolver` using exact or fuzzy alias resolution, or produces an unresolved synthetic effort. Successful analytics-time resolution uses runtime metric origin `analyzed`; unresolved fallback uses `analyzed-estimated`.

Analytics-time resolution should not re-resolve already canonical compiler-attached effort references unless an explicit future override mode is introduced.

#### Rationale

Compile time and analytics time have different evidence quality.

Compile-time resolution is based on explicit authored canonical intent. Analytics-time resolution is a recovery step over less-structured data.

Separating the passes makes provenance explicit and lets downstream processors decide whether to trust compiler-resolved, analyzed-resolved, and analyzed-estimated efforts equally or differently.

This also aligns with the broader analytics architecture direction that assembly and policy should happen at explicit boundaries rather than through hidden global logic.

#### Rejected alternatives

- **Single unified late-resolution pass only** — rejected because it throws away the stronger provenance available at compile time.
- **Compile-time resolution only** — rejected because real-world coach-authored free text still needs analytics-time recovery.
- **Always rerun analytics resolution over compiler-resolved efforts** — rejected because it risks downgrading already-canonical references and creates unnecessary churn.

#### Consequences

- provenance becomes explicit instead of implicit
- processors can branch on confidence level when appropriate
- compiler output contracts must leave enough structured information for analytics recovery when canonical resolution is missing
- tests need to cover compile-resolved, analyzed-resolved, and analyzed-estimated paths separately

### 7. Analytics processors depend on `IEffortResolver` through `AnalyticsContext`; they do not import registry implementations directly

#### Decision statement

The analytics layer will consume effort resolution through an injected interface on analytics context.

Recommended shape:

```ts
interface IEffortResolver {
  resolveBySlug(slug: string): IEffort | null;
  resolveByAlias(label: string): IEffort | null;
  resolveFuzzy(label: string, options?: { threshold?: number }): IEffort | null;
  list(): readonly IEffort[];
}

interface AnalyticsContext {
  effortResolver: IEffortResolver;
}
```

No analytics processor should import IndexedDB storage, bundled registry modules, or route-layer code directly.

#### Rationale

This preserves the analytics boundary.

Processors need effort resolution capability, not knowledge of where effort records came from or how they are stored.

Injection makes the contract testable, keeps the registry swappable, and prevents the analytics layer from becoming coupled to persistence or UI concerns.

#### Rejected alternatives

- **Global registry singleton** — rejected because it makes tests and runtime composition harder and hides dependencies.
- **Direct imports from registry implementation modules** — rejected because it couples processors to storage and module layout.
- **Passing raw effort arrays into every processor separately** — rejected because it duplicates resolution policy and weakens a single analytics context contract.

#### Consequences

- analytics processors stay shallow and focused on domain transforms
- test fixtures can inject tiny deterministic resolver implementations
- registry storage can evolve without rewriting processor imports
- `AnalyticsContext` becomes the contract boundary that must be kept stable and documented

## Open questions to resolve before implementation

### 1. Default MET for unresolved efforts

When analytics creates a synthetic unresolved effort, what MET should it assign by default?

**Recommendation:** `5.0`

Rationale for the recommendation:

- it is a moderate generic fallback rather than an extremely low or extremely high assumption
- it avoids making unresolved labels look sedentary by default
- it is easier to explain as a placeholder pending explicit calibration

Important note: this recommendation is specific to synthetic unresolved effort-registry entities. It does **not** automatically rewrite the existing `MetMinuteProjectionEngine` fallback documented in [WOD-514](/WOD/issues/WOD-514).

### 2. Modifier coefficient schema editing UX

How should users edit coefficient chains and hard overrides?

**Recommendation:** expose a structured form for common modifiers and an advanced raw-editor fallback for uncommon fields.

Rationale for the recommendation:

- common use cases should not require JSON editing
- advanced users still need an escape hatch for less common attributes
- keeping coefficient and override semantics visible will improve explainability

### 3. Fuzzy-match similarity threshold

What similarity threshold should count as a fuzzy alias match?

**Recommendation:** edit distance `<= 2` as the default threshold

Rationale for the recommendation:

- it catches common typos and short alias mistakes
- it is less likely than broader thresholds to create accidental wrong matches
- it can be tightened or widened later if real-world registry data demands it

## Non-goals

This ADR does **not** define:

- the final UI design of the effort catalog or editor
- the full bundled seed dataset
- server-side sync for user effort records
- a universal formula language for effort derivation
- downstream analytics weighting rules for `compiler` vs `analyzed` vs `analyzed-estimated`

It establishes the domain boundary, route surface, and analytics resolution model.

## Validation path

- inspect `docs/adr/0008-effort-registry-route-surface-and-two-pass-analytics-resolution.md`
- verify all seven decisions include decision statement, rationale, rejected alternatives, and consequences
- verify the route surface is documented as `/efforts` and `/effort/:slug?key=value`
- verify two-pass resolution distinguishes `compiler`, `analyzed`, and `analyzed-estimated`
- verify `IEffortResolver` is described as an injected analytics-context dependency rather than a direct processor import
- verify all three open questions are explicitly listed with recommendations

## Related

- [WOD-524](/WOD/issues/WOD-524)
- [WOD-522](/WOD/issues/WOD-522)
- [WOD-517](/WOD/issues/WOD-517)
- [[Metrics Processor Architecture]]
- `repo/docs/adr/0005-analytics-profile-drives-processor-assembly.md`
