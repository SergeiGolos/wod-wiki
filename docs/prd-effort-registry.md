# PRD: Effort Registry

**Issue:** [WOD-523](/WOD/issues/WOD-523)  
**Parent:** [WOD-522](/WOD/issues/WOD-522)  
**Status:** Approved by CEO + CTO  
**Last Updated:** 2026-05-20

---

## 1. Summary

WOD Wiki needs a first-class **effort registry** so athletes, coaches, analytics processors, and developers all resolve the same exercise-intensity concept from one canonical source.

Today, effort-like data is scattered across free-text labels, analytics assumptions, and processor-specific logic. The registry will unify that model by introducing a canonical effort entity, a two-tier storage system, clone-based customization, fuzzy alias resolution, an effort catalog route surface, and a two-pass analytics integration that preserves origin and certainty.

This PRD defines the product behavior, technical boundaries, and user stories required to ship the effort registry as a durable platform capability.

---

## 2. Problem

WOD Wiki currently treats effort primarily as a string. That creates four product problems:

1. **Athletes cannot reliably personalize effort definitions** without losing consistency in analytics.
2. **Coaches cannot safely standardize effort templates** for athletes while still allowing local customization.
3. **Analytics cannot distinguish known efforts from inferred efforts**, which weakens calorie, MET, and summary calculations.
4. **Developers cannot test effort resolution in isolation** because the definition, storage, and resolution logic are not formalized.

The result is avoidable ambiguity:
- “Run”, “Jog”, “Treadmill 8.5”, and “Tempo Run” may mean similar but not identical things.
- A coach-authored label may not match the bundled analytics assumptions.
- Users cannot inspect why a given MET or calorie estimate was chosen.
- Future feature work keeps re-implementing effort logic in new places.

---

## 3. Goals

1. Create a canonical effort entity that can be referenced by UI, analytics, and tests.
2. Let athletes customize efforts without forking the whole analytics system.
3. Let coaches create and manage reusable effort templates for athletes.
4. Ensure every workout segment can resolve to a known or estimated effort.
5. Preserve provenance so the system can distinguish compiler-known, analyzed, and estimated effort resolutions.
6. Make the registry easy to test, seed, debug, and extend.

---

## 4. Non-goals

The first release of the effort registry does **not** include:

- Full cloud sync of user efforts across devices
- Public marketplace or community effort sharing
- Server-side multi-tenant registry management
- Automatic ML-based effort classification
- Replacing all existing analytics processors in one migration

The system must be **future-compatible** with sync and richer sharing, but those are not launch blockers for this PRD.

---

## 5. Primary personas

### Athlete
Wants effort definitions that match how they actually train, wants personal overrides, and needs confidence that workout summaries reflect their real intensity.

### Coach
Wants reusable templates, alias coverage for athlete language, and a safe way to standardize effort assumptions without breaking athlete-specific customizations.

### Analytics engine
Needs deterministic effort resolution, explicit provenance, and a fallback path when the system cannot match a user-entered effort exactly.

### Developer
Needs typed contracts, isolated test seams, deterministic storage behavior, and observable resolution traces.

---

## 6. Product decisions

### Decision 1 — Effort definition shape

**Decision**  
Efforts are first-class entities with canonical slugs and a stable schema.

```ts
interface IEffort {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  description?: string;
  discipline: string;
  modality: string;
  intensityTier?: 'recovery' | 'easy' | 'moderate' | 'hard' | 'max';
  baseAttributes: {
    met?: number;
    intensity?: number;
    [key: string]: string | number | boolean | undefined;
  };
  derivation?: {
    derivedFrom?: string;
    coefficients?: Record<string, number>;
    hardOverrides?: Record<string, string | number | boolean>;
  };
  visibility: 'bundled' | 'private' | 'shared-template';
  origin: 'bundled' | 'user' | 'compiler' | 'analyzed' | 'analyzed-estimated';
  createdAt: string;
  updatedAt: string;
}
```

**Rationale**
- A canonical schema gives analytics, UI, and tests one shared source of truth.
- Slugs provide stable routing, storage keys, and debug output.
- Explicit origin and derivation preserve provenance instead of hiding it in labels.

### Decision 2 — Two-tier registry

**Decision**  
The registry has two storage layers:
1. **Bundled seed data** shipped with the app
2. **User IndexedDB data** for athlete and coach customization

Lookup order is **user first, bundled second**. User records win on slug conflicts.

**Rationale**
- Bundled data provides a stable default catalog.
- IndexedDB enables offline-first creation and editing.
- User-wins conflict behavior matches expectation when a person intentionally overrides a base effort.

### Decision 3 — Clone derivation

**Decision**  
User customization is clone-based. A custom effort may derive from another effort through a coefficient chain and optional hard overrides.

**Rules**
- `derivedFrom` points to the parent slug.
- `coefficients` multiply inherited numeric attributes in order.
- `hardOverrides` replace final values entirely.
- Derived efforts always preserve a provenance link to the parent.

**Rationale**
- Clone derivation keeps bundled and coach-authored efforts reusable.
- Coefficients support common “slightly harder/easier” use cases.
- Hard overrides support exact prescription when coefficients are not enough.

### Decision 4 — Fuzzy alias resolution

**Decision**  
User-entered effort names resolve through a ranked matcher:
1. Exact slug match
2. Exact alias match
3. Normalized alias match (case, punctuation, whitespace)
4. Fuzzy alias match with default threshold `<= 2`
5. Synthetic fallback effort if no match is found

If a fuzzy match succeeds, the resolved effort is tagged `origin: 'analyzed'`. If no match succeeds, the synthetic effort is tagged `origin: 'analyzed-estimated'`.

**Rationale**
- Coaches and athletes should not lose intent because of minor spelling or naming differences.
- A ranked matcher keeps exact matches deterministic while still recovering from human input variance.
- Synthetic fallback prevents analytics from dropping effort data entirely.

### Decision 5 — Route surface

**Decision**  
The registry is exposed through:
- **`/efforts`** — searchable catalog of bundled and user efforts
- **`/effort/:slug`** — detail and edit route
- Query params on detail routes act as attribute previews, e.g. `/effort/running?met=11.0&intensity=hard`

**Rules**
- Query params preview effective values without mutating the saved effort until the user explicitly saves.
- `/efforts` supports search, origin filters, discipline filters, and “create custom” entry points.
- User efforts can be deleted; bundled efforts cannot.

**Rationale**
- The catalog route makes the registry discoverable.
- The detail route provides a stable deep-link target for editing and debugging.
- Query-param previews let coaches and developers inspect attribute combinations without creating throwaway records.

### Decision 6 — Two-pass analytics integration

**Decision**  
Effort resolution runs in two passes:

1. **Compile-time pass**  
   Known effort references resolved during compile time are attached with `origin: 'compiler'`.
2. **Analytics-time pass**  
   Unresolved names are sent through the resolver during analytics execution and attached with `origin: 'analyzed'` or `origin: 'analyzed-estimated'`.

**Rules**
- Compiler-known effort resolution must not require IndexedDB writes.
- Analytics-time resolution must preserve the original input label for auditing.
- Downstream analytics may branch on origin but must receive the same normalized effort shape.

**Rationale**
- Compile-time resolution keeps known paths fast and deterministic.
- Analytics-time resolution covers real-world free text and late-bound metadata.
- Preserving origin allows the system to distinguish certainty levels.

### Decision 7 — Testability contracts

**Decision**  
The registry must be testable in isolation through injected interfaces instead of global state.

```ts
type IEffortResolver = {
  resolve(slug: string): IEffort | null;
  resolveFuzzy(input: string, threshold?: number): IEffort | null;
  list(): IEffort[];
  upsert(effort: IEffort): void;
  remove(slug: string): void;
};

type IEffortStore = {
  loadBundled(): Promise<IEffort[]>;
  loadUser(): Promise<IEffort[]>;
  writeUser(effort: IEffort): Promise<void>;
  removeUser(slug: string): Promise<void>;
};

type IEffortResolutionTrace = {
  input: string;
  resolutionStage: 'compiler' | 'analyzer';
  matchType: 'exact-slug' | 'exact-alias' | 'normalized-alias' | 'fuzzy' | 'fallback';
  matchedSlug?: string;
  threshold?: number;
};
```

**Rationale**
- Storage, matching, and analytics behavior can be unit tested separately.
- Developers can inject fixtures instead of mutating singleton state.
- Resolution traces make failures debuggable and make acceptance tests deterministic.

---

## 7. Functional requirements

### FR1 — Registry data model
- The system must maintain a canonical effort entity with stable slug identity.
- The system must allow bundled, private, and shared-template visibility modes.
- The system must preserve derivation lineage and timestamps.

### FR2 — Athlete customization
- Athletes must be able to clone a bundled or shared effort into a private effort.
- Athletes must be able to change coefficients and hard overrides.
- Athletes must be able to inspect the effective values that will be used by analytics.

### FR3 — Coach templates
- Coaches must be able to create shared-template efforts from scratch or by cloning an existing effort.
- Coaches must be able to assign aliases and notes that reflect athlete language.
- Coaches must be able to scope templates to athlete profiles available in the current local workspace.
- Remote sync is future work, but the data model must not block it.

### FR4 — Resolution and fallback
- Every effort lookup must follow the ranked resolution order defined above.
- When no match exists, the resolver must create a synthetic fallback effort with:
  - original label preserved
  - default `met = 5.0`
  - `origin = 'analyzed-estimated'`
- The fallback threshold default is `<= 2`, with implementation-level configurability.

### FR5 — Analytics integration
- Compile-time and analytics-time passes must emit the same normalized effort shape.
- Output statements must preserve effort origin for downstream analytics.
- Analytics consumers must be able to use effective effort attributes without re-running resolution.

### FR6 — Catalog and detail UI
- `/efforts` must provide search, filters, and clear affordances to create custom efforts.
- `/effort/:slug` must show aliases, derivation chain, effective values, and edit controls.
- Query-param previews must visually distinguish preview state from saved state.

### FR7 — Debugging and observability
- Resolution traces must be inspectable in tests and developer tooling.
- The UI must show enough provenance for a user to understand whether an effort was bundled, user-defined, compiler-known, or estimated.
- The system must log validation failures and conflict outcomes deterministically.

---

## 8. User stories

## Athlete perspective

### US-01 — Browse the catalog
**As an athlete, I want to browse the effort catalog so I can understand the built-in effort options before I customize anything.**

**Acceptance criteria**
- `/efforts` lists bundled and user efforts in one catalog.
- Each row shows label, slug, origin/visibility, and core attributes.
- The catalog loads without network dependence once bundled data is available locally.

### US-02 — Search by the names I already use
**As an athlete, I want search to find efforts by label or alias so I do not need to know the canonical slug.**

**Acceptance criteria**
- Search matches against `label`, `slug`, and `aliases`.
- Search is case-insensitive and ignores punctuation differences.
- Search results show the canonical effort that will actually be used.

### US-03 — Clone a bundled effort into my own version
**As an athlete, I want to clone a bundled effort so I can personalize it without editing the system default.**

**Acceptance criteria**
- A bundled effort exposes a “Create custom” action.
- The new record is stored in the user layer with a provenance link to the parent slug.
- Editing the cloned effort does not mutate the bundled source record.

### US-04 — Adjust coefficients and preview the result
**As an athlete, I want to change coefficients and preview effective attributes so I can tune intensity without guessing.**

**Acceptance criteria**
- The detail route shows editable coefficient inputs for supported numeric attributes.
- The UI renders effective values after coefficient application before save.
- Preview values clearly distinguish inherited, modified, and final effective values.

### US-05 — Hard-override an exact value
**As an athlete, I want to hard-override a value like MET when I know the exact number I need.**

**Acceptance criteria**
- The editor provides explicit hard-override controls separate from coefficients.
- A hard override replaces the effective value even if coefficients are also present.
- The UI explains that overrides bypass the inherited calculation chain.

### US-06 — Use my effort in workout authoring
**As an athlete, I want my custom effort to resolve during workout authoring and review so the system uses my preferred definition.**

**Acceptance criteria**
- User-layer efforts are available anywhere the authoring or analytics pipeline resolves efforts.
- If a user effort shares a slug with bundled data, the user effort wins.
- The resulting workout output preserves the selected or resolved effort slug and origin.

### US-07 — Understand what effort was actually used
**As an athlete, I want to see whether my workout used a bundled, custom, or estimated effort so I can trust the summary.**

**Acceptance criteria**
- Review surfaces show effort label, origin, and effective key attributes.
- If a fuzzy or fallback match was used, the UI indicates that it was inferred.
- Users can deep-link from a resolved effort in history to `/effort/:slug` when the effort exists in the registry.

### US-08 — Keep my efforts available offline
**As an athlete, I want my saved efforts to persist locally so I can use them offline and after reloads.**

**Acceptance criteria**
- User efforts are stored in IndexedDB.
- Reloading the app restores user efforts before catalog interaction.
- Offline use does not remove access to previously created efforts.

## Coach perspective

### US-09 — Create a coach template
**As a coach, I want to create a shared effort template so multiple athletes can start from the same baseline.**

**Acceptance criteria**
- Coaches can create a new effort with `visibility = 'shared-template'`.
- A shared template can be created from scratch or by cloning another effort.
- Shared templates appear distinctly from private athlete efforts in the catalog.

### US-10 — Capture athlete language with aliases
**As a coach, I want to add aliases to a template so athlete-entered terms still resolve to the right effort.**

**Acceptance criteria**
- Alias editing is available on the effort detail route.
- Alias validation prevents duplicate normalized aliases within the effective registry view.
- Alias changes are used by the fuzzy and exact resolver without requiring additional developer configuration.

### US-11 — Share a template to athlete profiles
**As a coach, I want to scope a template to one or more athletes so the right people can start from it.**

**Acceptance criteria**
- Shared templates support athlete/profile targeting in the local workspace model.
- Athlete-facing selectors show the shared template as available to eligible athletes.
- The model distinguishes “shared source template” from “athlete-owned clone”.

### US-12 — Update a template without silently rewriting athlete customizations
**As a coach, I want template updates to stay traceable so athlete overrides are not silently destroyed.**

**Acceptance criteria**
- Template edits update the shared-template record only.
- Athlete clones retain their own coefficients and hard overrides after the shared template changes.
- The system preserves derivation lineage so diffs between source and clone remain inspectable.

### US-13 — Compare source and custom values
**As a coach, I want to compare bundled, shared, and athlete-specific values so I can explain why analytics changed.**

**Acceptance criteria**
- The detail route shows parent values, local changes, and final effective values.
- Differences are displayed per attribute, not just as raw JSON.
- The comparison works for both coefficient-derived and hard-overridden attributes.

### US-14 — Promote an unresolved effort into the registry
**As a coach, I want to turn a fallback effort into a canonical template so repeated unknown labels become standardized.**

**Acceptance criteria**
- When analytics creates an `analyzed-estimated` effort, the system preserves the original label for later promotion.
- A coach can create a new registry record from that label without retyping the source name.
- Promotion allows the coach to attach aliases and base attributes before saving.

### US-15 — Retire a template safely
**As a coach, I want to retire or delete a template without corrupting historical workouts that already used it.**

**Acceptance criteria**
- User/shared-template efforts can be deleted or marked inactive.
- Historical outputs continue to display the effort label and origin captured at analysis time.
- Deleting a template does not mutate stored historical workout records.

## Analytics engine perspective

### US-16 — Resolve known efforts at compile time
**As the analytics engine, I want compiler-known efforts to resolve during compile time so known paths stay deterministic and fast.**

**Acceptance criteria**
- The compile path can attach a normalized effort with `origin = 'compiler'`.
- Compile-time resolution does not depend on analytics-time fuzzy matching.
- Compiler-origin effort data matches the same output shape used by analytics-time resolution.

### US-17 — Resolve free text during analytics
**As the analytics engine, I want unresolved effort names to go through fuzzy resolution during analysis so free-text workouts still produce useful metrics.**

**Acceptance criteria**
- Analytics receives access to an injected resolver.
- The analytics pass attempts exact, normalized, and fuzzy matching in ranked order.
- A successful analytics-time match marks the resolved effort `origin = 'analyzed'` and preserves the original input label for audit/debug views.

### US-18 — Fall back instead of dropping effort context
**As the analytics engine, I want unmatched effort names to receive a synthetic effort so sessions never lose effort context entirely.**

**Acceptance criteria**
- Unmatched inputs produce a synthetic `IEffort` object with the original label.
- The default fallback uses `met = 5.0` unless a lower layer explicitly configures otherwise.
- The fallback effort is tagged `origin = 'analyzed-estimated'`.

### US-19 — Expose provenance to downstream processors
**As the analytics engine, I want downstream processors to see normalized attributes and provenance so they can branch on certainty without re-resolving effort.**

**Acceptance criteria**
- Downstream processors receive normalized effort data in a single shape.
- Output statements expose effort origin for processor and UI consumers.
- Processors can distinguish compiler-known, analyzed, and estimated efforts without custom parsing.

## Developer perspective

### US-20 — Add bundled seed efforts safely
**As a developer, I want to add a new bundled effort through a typed seed path so I can extend the registry without fragile ad hoc strings.**

**Acceptance criteria**
- Bundled efforts are defined through a validated typed schema.
- Invalid bundled records fail validation before entering runtime resolution.
- Adding a new bundled effort does not require editing analytics code in multiple locations.

### US-21 — Test resolver behavior in isolation
**As a developer, I want to unit test storage, matching, and resolution separately so failures are small and deterministic.**

**Acceptance criteria**
- Resolver tests can run against in-memory fixtures.
- Store tests can mock bundled and user layers independently.
- Fuzzy matching can be tested without spinning up the full analytics pipeline.

### US-22 — Test both resolution passes in integration
**As a developer, I want integration tests for compile-time and analytics-time passes so origin handling cannot silently regress.**

**Acceptance criteria**
- At least one integration path covers compiler-known effort resolution.
- At least one integration path covers analytics-time fuzzy resolution.
- At least one integration path covers the fallback `analyzed-estimated` path.

### US-23 — Debug a bad resolution quickly
**As a developer, I want an inspectable resolution trace so I can understand why a given effort matched, fell back, or lost precedence.**

**Acceptance criteria**
- The resolver emits a structured trace with input, stage, threshold, and match type.
- Tests can assert on trace output.
- Developer tooling or logs can surface the trace without requiring source-code instrumentation changes.

---

## 9. UX and interaction requirements

### Catalog route: `/efforts`
- Default sort: bundled first by discipline, then user/shared templates by recent update.
- Search box matches label, slug, and aliases.
- Filters: origin/visibility, discipline, modality, intensity tier.
- Primary CTA: **Create custom effort**.
- Secondary CTA on bundled rows: **Clone**.

### Detail route: `/effort/:slug`
- Header shows label, slug, origin/visibility, and parent link if derived.
- Sections:
  1. Summary
  2. Aliases
  3. Base attributes
  4. Derivation controls
  5. Effective values preview
  6. Sharing/visibility
  7. Danger zone (delete/inactivate for user efforts)

### Query-param preview behavior
- Query params render a non-persistent preview banner.
- Preview values do not save automatically.
- Saving requires explicit user action that converts the preview into stored values.

---

## 10. Data and behavior rules

### Resolution precedence
1. User exact slug
2. Bundled exact slug
3. User exact alias
4. Bundled exact alias
5. User normalized alias
6. Bundled normalized alias
7. User fuzzy alias
8. Bundled fuzzy alias
9. Synthetic fallback

### Conflict rules
- User layer wins on identical slug.
- Duplicate normalized aliases within the same effective registry view are validation errors.
- Bundled records are immutable at runtime.

### Historical integrity rules
- Historical workout output stores the effective effort label and origin used at analysis time.
- Deleting a user or shared effort must not mutate historical workout records.
- Re-analysis may produce a different result later, but prior stored outputs remain intact unless explicitly regenerated.

---

## 11. Success metrics

### User-facing metrics
- 90%+ of workouts with effort-like labels resolve to a non-fallback effort after alias coverage matures.
- Athletes can create or clone a custom effort in under 60 seconds.
- Coaches can promote an unresolved effort into a canonical template in under 2 minutes.

### Quality metrics
- Zero analytics crashes caused by missing effort data.
- 100% deterministic resolver output for identical registry fixtures and inputs.
- Full test coverage across exact, fuzzy, fallback, precedence, and derivation scenarios.

### Trust metrics
- Review surfaces always show effort origin when effort data is present.
- Users can inspect why a fallback occurred without reading logs.

---

## 12. Rollout and validation path

### Validation before implementation signoff
- PRD review by CEO and CTO
- Documentation link check for the new PRD

### Validation during implementation
- Unit tests for schema validation, derivation math, alias normalization, fuzzy matching, and store precedence
- Integration tests for compile-time and analytics-time resolution
- UI tests for catalog search, clone flow, edit flow, preview behavior, and fallback promotion

### Suggested implementation slices
1. Canonical effort schema + bundled seed loader
2. IndexedDB user store + precedence resolver
3. Catalog/detail routes
4. Clone derivation and effective-value preview
5. Analytics two-pass integration
6. Resolution trace + debugging surfaces

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Fuzzy matching is too permissive | Wrong analytics attribution | Default threshold `<= 2`, trace output, future configurability |
| Coach template edits accidentally rewrite athlete intent | Trust loss | Clone derivation with independent athlete overrides |
| Registry logic becomes a hidden singleton | Fragile tests and coupling | Injected interfaces for resolver/store/context |
| Offline-only user store complicates future sync | Migration complexity | Stable schema, origin metadata, explicit visibility model |
| Users cannot tell inferred from exact matches | Low trust in analytics | Show origin and inference state in review/detail surfaces |

---

## 14. Open follow-on items

These are intentionally deferred from the first release but should stay visible:
- Cross-device sync of user and coach efforts
- Team/org-level sharing beyond the local workspace model
- Import/export packages for effort templates
- Confidence scoring UI for fuzzy matches
- Bulk alias management tools

---

## 15. Implementation handoff summary

Ship the effort registry as a reusable platform layer, not a one-off UI feature.

The implementation must preserve five invariants:
1. One canonical effort shape everywhere.
2. User data wins over bundled data.
3. Derived efforts always preserve lineage.
4. Analytics always emits an effort, even when estimated.
5. Resolution logic is injectable, testable, and observable.
