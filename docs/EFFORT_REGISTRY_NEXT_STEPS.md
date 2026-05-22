# Effort Registry: Next Steps & Architecture Decisions

**Status**: Effort Resolution Module (ADR-0008) Phase 1 complete. Three improvements merged:
1. Deepened `EffortResolver` with derivation, modifiers, discipline-factor, hard overrides
2. Moved clone/derivation/modifier/fallback logic behind resolver seam
3. Removed hardcoded MET lookup tables from analytics processors

**Validation**: 125 focused tests pass. No new regressions. Full test suite shows 2048 pass (baseline failures unrelated to effort registry).

---

## Decision 1: Compile-Time Effort Enrichment vs. Runtime Analytics

**Current state**: `TwoPassEffortResolutionProcess` resolves effort at analytics time (realtime processor). ADR-0008 promises a compile-time `EffortEnrichmentPass` that injects planned MET/discipline metrics after JIT compilation.

**Question**: Do we actually need planned intensity metadata before runtime execution?
|>  We shoudl compile time enrichment going on idetnify the linked efforts and any metrics the effort allowed to modify effort.

**Trade-offs**:
- **Compile-time enrichment** (recommended): enables runtime/review UI to display planned MET, effort identity, and predicted TIS before execution finishes
- **Analytics-time only**: simpler, sufficient for logging/analysis, but UI cannot show planned metrics until after session completes

**Recommendation**: **Implement real compile-time enrichment**

This lets the UI show "planned 12 MET-min" next to each exercise block during execution, improving athlete feedback and pre-flight validation.

**Implementation notes**:
- Create `EffortEnrichmentPass` strategy in `src/runtime/compiler/strategies/`
- Hook into `JitCompiler` after all strategies complete
- Walk compiled block tree and inject `effort-data` metrics into exercise blocks
- Use `resolver.resolveEffort()` with label from block source statement

---

## Decision 2: Query Param Parsing & Attribute Metric Modifiers

**Current state**: `/effort/:slug?speed=6mph&surface=treadmill` does not yet feed query params into resolver modifiers.

**Question**: Which query params are resolver modifiers vs. page-control params? 
|> the example make sense

**Example problematic query string**:
```
/effort/run?speed=6mph&surface=treadmill&mode=edit&tab=resolved
```

What should be a modifier (fed to resolver)?
- `speed=6mph` ✓
- `surface=treadmill` ✓
- `mode=edit` ✗ (page UI control)
- `tab=resolved` ✗ (page UI control)

**Recommendation**: Reserve page-control params:
- `mode` (e.g., `view|edit`)
- `tab` (e.g., `definition|resolved|modifiers`)
- `q` (search/filter within page)
- `origin` (maybe — to query by registry source)

Everything else is an attribute metric modifier passed to `resolver.resolveEffort(slug, { modifiers })`.

**Implementation notes**:
- Create `parseEffortRouteModifiers(searchParams: URLSearchParams)` in `playground/src/lib/routes.tsx`
- Filter out reserved keys
- Convert remaining params into `Record<string, string>` 
- Update route helpers to accept modifiers: `effortPath(slug, modifiers?)`

---

## Decision 3: Resolved vs. Definition Display on `/effort/:slug`

**Current state**: `EffortDetailPage` displays stored definition values. After Resolution Module improvements, we should show effective resolved values.

**Question**: What should the page emphasize: **definition editing** or **resolved instance inspection**?
|> the effort page should focus primiary but after the primary section we should have anlytics listing fwhere the effeorts are found.

**Two design directions**:
1. **Definition-centric**: Show stored values; editing is primary; resolved values are secondary detail
2. **Resolved-centric** (recommended): Show effective resolved values prominently; definition editing is secondary; query params affect displayed resolution

**Recommendation**: **Default to resolved instance view**

A user visiting `/effort/run?speed=6mph` probably wants to know:
- What is the effective MET for *this* run configuration?
- Is it different from the base definition?
- Why? (inherited from parent? hard override? coefficient applied?)

**Implementation notes**:
- Add "Resolved View" tab showing:
  - Effective MET
  - Effective discipline factor
  - Applied modifiers with coefficient values
  - Resolution source: `user | bundled | default`
  - Estimated badge (if synthetic fallback)
  - Parent chain (if derived)
- Add "Definition View" tab showing raw stored JSON
- Default to Resolved View when query params present, Definition View otherwise

---

## Decision 4: Clone/Derivation Editing with Resolver Integration

**Current state**: `EffortEditorForm` computes `derivedMet` locally. This duplicates resolver logic and makes the form hard to keep in sync.

**Question**: Should draft effort previews call the Effort Resolution Module?
|> yep
**Recommendation**: **Yes, absolutely**

The editor should ask the resolver for effective preview values instead of inline calculation.

**Implementation pattern**:
```ts
// In EffortEditorForm preview
const draftEffort: IEffort = { ...formValues };
const tempRegistry = new InMemoryEffortRegistry([draftEffort]);
const tempResolver = new EffortResolver(tempRegistry);
const resolved = tempResolver.resolveDefinition(draftEffort, { modifiers: previewModifiers });

setEffectivePreview({
  met: resolved.met,
  disciplineFactor: resolved.disciplineFactor,
  discipline: resolved.discipline,
  // ...
});
```

**Benefits**:
- Single source of truth for resolution logic
- Easier testing (mock resolver)
- Editor automatically stays in sync with resolver behavior
- Supports parent derivation preview

---

## Decision 5: Route Governance Documentation Update

**Current state**: Implementation added `/efforts` and `/effort/:slug` routes, but route inventory docs don't mention them.

**Question**: Should `/effort/:slug` query params be documented as part of the canonical route contract?

**Recommendation**: **Yes. Document the full route contract**

**Route inventory update needed** in `docs/design-system/02.page-routes/Playground-Route-Inventory.md`:

```markdown
### /efforts
- **Purpose**: Catalog all efforts (bundled + user-defined)
- **Query params**: 
  - `q` (search filter)
  - `tab` (category filter)
- **Page type**: Catalog / Collection

### /effort/:slug
- **Purpose**: View/edit single effort definition and resolved instances
- **Params**:
  - `:slug` (effort ID)
- **Query params** (attribute metrics, fed to resolver):
  - Any param not in reserved list (mode, tab, q, origin)
  - Examples: `?speed=6mph&surface=treadmill&weight=135lb`
  - Reserved non-modifier params:
    - `mode` (view|edit)
    - `tab` (definition|resolved|modifiers)
    - `q` (search within effort)
    - `origin` (filter by registry source)
- **Page type**: Detail

```

---

## Decision 6: Fuzzy-Match Evidence & Ambiguity Handling

**Current state**: Fuzzy resolution picks best deterministically, but does not report evidence (matched alias, edit distance, ambiguous candidates).

**Question**: When fuzzy resolution has multiple candidates within threshold, should it pick best, mark ambiguous, or ask user?  
|> yes for now. we look into what can heppend.

**Recommendation**: **Pick best only if unambiguous; otherwise return estimated with ambiguity metadata**

This prevents silent wrong analytics. Example:
- `rwo` could match `row` (edit distance 1) or `run` (edit distance 2)
- Current behavior: silently pick `row`
- Recommended: mark as ambiguous, return estimated effort, emit disclosure in UI

**Implementation notes**:
- Extend `fuzzyMatch.ts` to return `{ match: IEffort; distance: number; candidates: IEffort[] }`
- In `EffortResolver.resolveFuzzy()`, if multiple candidates within threshold, return synthetic unresolved effort with `ambiguityMetadata`
- Update `ResolvedEffort` interface to optionally include ambiguity info
- UI can show "⚠️ Effort ambiguous; showing best guess" badge

**When to implement**: After initial resolved-instance display works. Can be deferred if fuzzy ambiguity is rare in practice.

---

## Decision 7: Advanced Modifier Rules vs. Simple Coefficients

**Current state**: Modifiers support simple multiplier coefficients:
```ts
coefficients: {
  met: 1.2,
  "position=kneeling": 0.75,
  "surface=trail": 0.95
}
```

**Question**: Is a coefficient always a simple multiplier, or do we need richer rules?
|> for now this looks good

**Future scenarios that break simple coefficients**:
- `speed=6mph` → lookup exact MET from speed table (not multiplier)
- `weight=135lb` → scale by athlete bodyweight (complex formula)
- `equipment=double-kettlebell` → apply multiplier only if strength discipline

**Recommendation**: **Keep simple coefficients now; define future rule shape in ADR**

Do not implement advanced rules yet unless use case is imminent.

**For future ADR**:
```ts
interface EffortModifierRule {
  key: string; // "speed", "weight", "equipment"
  match: string | RegExp; // "6mph", /^\d+lb$/
  effect:
    | { type: "multiply"; value: number } // coefficient
    | { type: "set-met"; value: number } // exact value
    | { type: "scale-by-bodyweight"; formula: string } // complex
    | { type: "conditional"; discipline: string; effect: EffortModifierRule }; // discipline-gated
}
```

**When to implement**: Only if user-defined efforts request it or analytics precision demands it. Backlog for now.

---

## Immediate Recommended Next Slice: "Resolved Effort Display"

**Scope**: Make `/effort/:slug?modifiers` resolve and display effective values

**Why this slice**:
- Uses the Effort Resolution Module work we just completed
- Proves resolver is useful outside analytics
- Unblocks route param documentation
- Does not require compile-time enrichment yet
- Valuable for UX immediately (users see how modifiers affect MET)

ok**Implementation tasks**:

### 1. Add route modifier parser
File: `playground/src/lib/routes.tsx`
```ts
export function parseEffortRouteModifiers(searchParams: URLSearchParams): Record<string, string> {
  const reserved = new Set(['mode', 'tab', 'q', 'origin']);
  const modifiers: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!reserved.has(key)) {
      modifiers[key] = value;
    }
  }
  return modifiers;
}

export function effortPath(slug: string, modifiers?: Record<string, string>, options?: { mode?: string; tab?: string }): string {
  const params = new URLSearchParams();
  if (modifiers) {
    for (const [k, v] of Object.entries(modifiers)) {
      params.set(k, v);
    }
  }
  if (options?.mode) params.set('mode', options.mode);
  if (options?.tab) params.set('tab', options.tab);
  const query = params.toString();
  return query ? `/effort/${slug}?${query}` : `/effort/${slug}`;
}
```

### 2. Update `EffortDetailPage` to resolve and display
File: `playground/src/pages/EffortDetailPage.tsx`

- Extract modifiers from `useSearchParams()`
- Call `resolver.resolveEffort(slug, { modifiers })`
- Display resolved vs. definition side-by-side
- Add "Resolved View" / "Definition View" tabs

### 3. Add resolved display component
File: `playground/src/components/efforts/EffortResolvedDisplay.tsx`

Show:
- Effective MET (highlight if different from definition)
- Effective discipline / discipline factor
- Applied modifiers with their coefficient impact
- Resolved from: `user | bundled | default`
- Estimated badge (if synthetic)
- Parent chain (if derived)

### 4. Update route inventory docs
File: `docs/design-system/02.page-routes/Playground-Route-Inventory.md`

Add `/efforts` and `/effort/:slug` with full query param contract (see Decision 5 above).

### 5. Add route tests
File: `tests/playground/effort-routes.test.ts`

```ts
describe('effort routes', () => {
  it('should parse modifier query params', () => {
    const params = new URLSearchParams('speed=6mph&surface=treadmill&mode=edit');
    const modifiers = parseEffortRouteModifiers(params);
    expect(modifiers).toEqual({ speed: '6mph', surface: 'treadmill' });
  });

  it('should exclude reserved params from modifiers', () => {
    const params = new URLSearchParams('speed=6mph&mode=edit&tab=resolved');
    const modifiers = parseEffortRouteModifiers(params);
    expect(modifiers).toEqual({ speed: '6mph' });
  });

  it('should resolve effort with modifiers', async () => {
    // Call resolver, verify effective MET differs from definition
  });
});
```

**Estimated effort**: 6-8 hours
- Route parsing: 1h
- UI component: 2-3h
- Tests: 1-2h
- Docs: 1h

**Blockers**: None. Ready to start.

---

## Implementation Roadmap (Suggested Order)

1. ✅ **Phase 1 (DONE)**: Deepen Effort Resolution Module (MET, discipline, derivation, modifiers)
2. **Phase 2 (RECOMMENDED)**: Resolved Effort Display on `/effort/:slug?modifiers` (6-8h)
3. **Phase 3**: Compile-time Effort Enrichment Pass in JIT compiler (8-10h)
4. **Phase 4**: Clone/Derivation editing with resolver integration (4-6h)
5. **Phase 5**: Fuzzy ambiguity handling (3-5h)
6. **Phase 6**: Advanced modifier rules (if needed; backlog for now)

---

## Open Questions for Stakeholder

1. Is planned effort enrichment important for UI before execution completes?
2. Should `/effort/:slug` default to showing resolved or definition view?
3. Do users need to know when fuzzy resolution is ambiguous?
4. Should effort editors use the same resolver preview logic?
5. Any immediate use cases for advanced modifier rules (speed tables, bodyweight scaling)?

---

## Related Documents

- [ADR-0008: Effort Registry Route Surface & Two-Pass Analytics Resolution](./adr/0008-effort-registry-route-surface-and-two-pass-analytics-resolution.md)
- [PRD: Effort Registry](./prd-effort-registry.md)
- [Playground Route Governance](./design-system/02.page-routes/Playground-Route-Governance.md)
