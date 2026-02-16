# Phase 7 — Labeling & Promotion Aspect

## Goal

Split into two independent sub-phases:
- **7A:** Merge `DisplayInitBehavior` + `RoundDisplayBehavior` → `LabelingBehavior`
- **7B:** Merge `PromoteFragmentBehavior` + `RepSchemeBehavior` → `FragmentPromotionBehavior`

These two new behaviors are independent of each other but both depend on Phase 2 (ReEntryBehavior) for round state.

## Duration: ~2.5 hours (1h for 7A + 1.5h for 7B)

## Rationale

**Labeling:** `DisplayInitBehavior` sets static labels on mount; `RoundDisplayBehavior` updates display memory with a dynamic "Round X of Y" string on mount/next. Both write to `display` memory. Merging them centralizes all display memory writes.

**Promotion:** `PromoteFragmentBehavior` copies a fragment type to `fragment:promote` memory for child inheritance; `RepSchemeBehavior` manages a rep scheme array and writes to `fragment:rep-target` memory. Both are "make parent data available to children" patterns. `RepSchemeBehavior` also implements `IRepSource` — this interface will become a method on the merged behavior.

---

## Sub-phase 7A — LabelingBehavior

### Current State

| Behavior | Hook | What It Does |
|----------|------|-------------|
| `DisplayInitBehavior` | `onMount` | Creates text fragments (label, subtitle, action) and pushes to `display` memory |
| `RoundDisplayBehavior` | `onMount`, `onNext` | Reads `round` memory, formats "Round X of Y" string, updates `display` memory (filters out old round fragments, appends new one) |

### New Behavior: `LabelingBehavior`

**File:** `src/runtime/behaviors/LabelingBehavior.ts`

### Config
```typescript
export interface LabelingConfig {
  /** Display mode */
  mode?: 'clock' | 'timer' | 'countdown' | 'hidden';
  /** Primary label (falls back to block.label) */
  label?: string;
  /** Secondary label */
  subtitle?: string;
  /** Action being performed */
  actionDisplay?: string;
  /** Whether to show round display (auto-detected from round memory if omitted) */
  showRoundDisplay?: boolean;
  /** Custom round format function (default: "Round X of Y") */
  roundFormat?: (current: number, total?: number) => string;
}
```

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | 1. Create text fragments for label, subtitle, actionDisplay (same as DisplayInitBehavior). 2. If round memory exists → create round display fragment. 3. Push all fragments to `display` memory. |
| `onNext` | 1. If round memory exists → read current/total. 2. Filter out old round fragments from display memory. 3. Add updated round fragment. 4. Update `display` memory. |
| `onUnmount` | No-op |
| `onDispose` | No-op |

### Memory Contract
- **Reads:** `round` (for round display)
- **Writes:** `display` tag

### Tasks

#### 7A.1 Create `LabelingBehavior`

Merge logic from both behaviors. Structure:
```
createStaticLabels(ctx) → ICodeFragment[]
createRoundLabel(ctx) → ICodeFragment | undefined
```

#### 7A.2 Create `LabelingBehavior.test.ts`

Test cases:
- Sets label from config
- Falls back to block.label when no config.label
- Sets subtitle fragment
- Sets actionDisplay fragment
- Emits all label fragments to `display` memory on mount
- Shows round display when round memory present
- Skips round display when no round memory
- Formats "Round X of Y" for bounded rounds
- Formats "Round X" for unbounded rounds
- Updates round display on next (mount → advance → check display)
- Does not accumulate duplicate round fragments
- Custom roundFormat function overrides default
- showRoundDisplay: false suppresses round label even with round memory

#### 7A.3 Update Strategies

Replace old behaviors in strategy wiring:

| Strategy | Old | New |
|----------|-----|-----|
| `WorkoutRootStrategy` | `DisplayInitBehavior` + `RoundDisplayBehavior` | `LabelingBehavior` |
| `IntervalLogicStrategy` | `DisplayInitBehavior` + `RoundDisplayBehavior` | `LabelingBehavior` |
| `WaitingToStartStrategy` | `DisplayInitBehavior` | `LabelingBehavior` |
| `RestBlockStrategy` | `DisplayInitBehavior` | `LabelingBehavior` |

#### 7A.4 Update `behaviors/index.ts`

- Add: `LabelingBehavior`
- Remove: `DisplayInitBehavior`, `RoundDisplayBehavior`

#### 7A.5 Delete Old Behaviors

- `src/runtime/behaviors/DisplayInitBehavior.ts`
- `src/runtime/behaviors/RoundDisplayBehavior.ts`

#### 7A.6 Update Strategy Tests

- `SessionRootStrategy.test.ts` — check for `LabelingBehavior` instead of `DisplayInitBehavior` / `RoundDisplayBehavior`
- `WorkoutRootStrategy.test.ts` — update behavior assertions
- `RestBlockStrategy.test.ts` — update `DisplayInitBehavior` assertions
- `WaitingToStartStrategy.test.ts` — update `DisplayInitBehavior` assertions

#### 7A.7 Validate

```bash
bun run test
bun x tsc --noEmit
```

---

## Sub-phase 7B — FragmentPromotionBehavior

### Current State

| Behavior | Hook | What It Does |
|----------|------|-------------|
| `PromoteFragmentBehavior` | `onMount`, `onNext` | Finds a fragment by `fragmentType` in block memory, copies it to `fragment:promote` memory. Optional `enableDynamicUpdates` to re-promote on next. |
| `RepSchemeBehavior` | `onMount`, `onNext` | Reads round state, indexes into rep scheme array, writes `FragmentType.Rep` fragment to `fragment:rep-target` memory. Implements `IRepSource` interface with `getRepsForRound()` and `getRepsForCurrentRound()`. |

### New Behavior: `FragmentPromotionBehavior`

**File:** `src/runtime/behaviors/FragmentPromotionBehavior.ts`

### Config
```typescript
export interface FragmentPromotionConfig {
  /** Fragment promotions — each entry describes one fragment type to promote */
  promotions: PromotionRule[];
  /** Optional rep scheme for round-based rep distribution */
  repScheme?: number[];
}

export interface PromotionRule {
  /** The fragment type to promote */
  fragmentType: FragmentType;
  /** Origin to override (default: 'execution') */
  origin?: FragmentOrigin;
  /** Re-promote on every next() call (dynamic values) */
  enableDynamicUpdates?: boolean;
  /** Source memory tag to read from (default: searches all) */
  sourceTag?: MemoryTag;
}
```

### Design Decision: Rep Scheme as Promotion

`RepSchemeBehavior` is conceptually a specialized promotion — it promotes a `Rep` fragment to children based on round state. In the merged behavior:
- Rep scheme logic runs first (writes to `fragment:rep-target`)
- Then generic promotions run (may or may not include `FragmentType.Rep`)

The `IRepSource` interface methods become instance methods on `FragmentPromotionBehavior`.

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | 1. If repScheme configured → read round state, promote initial rep value to `fragment:rep-target`. 2. For each promotion rule → find source fragment, copy to `fragment:promote`. |
| `onNext` | 1. If repScheme configured → read round state, re-promote if round changed. 2. For each dynamic promotion rule → re-promote from source. |
| `onUnmount` | No-op |
| `onDispose` | No-op |

### Memory Contract
- **Reads:** all tags (fragment search), `round` (for rep scheme)
- **Writes:** `fragment:promote` tag, `fragment:rep-target` tag

### IRepSource Compatibility

```typescript
export class FragmentPromotionBehavior implements IRuntimeBehavior, IRepSource {
    get repScheme(): readonly number[] { ... }
    getRepsForRound(round: number): number | undefined { ... }
    getRepsForCurrentRound(): number | undefined { ... }
}
```

Any code using `block.getBehavior(RepSchemeBehavior)` will need updating to `block.getBehavior(FragmentPromotionBehavior)` — but this should be a very small footprint since `RepSchemeBehavior` is only queried via `IRepSource` interface.

### Tasks

#### 7B.1 Create `FragmentPromotionBehavior`

Merge logic from both behaviors. Key internal methods:
- `promoteFragments(ctx)` — iterates promotion rules, finds + promotes
- `promoteRepScheme(ctx, round)` — rep scheme round-robin logic
- `findSourceFragment(ctx, rule)` — from `PromoteFragmentBehavior`

#### 7B.2 Create `FragmentPromotionBehavior.test.ts`

Test cases:

**Fragment promotion:**
- Promotes fragment by type to `fragment:promote` memory
- Uses configured origin override
- Skips promotion when source fragment not found
- Does not re-promote on next when `enableDynamicUpdates` is false
- Re-promotes on next when `enableDynamicUpdates` is true
- Reads from specific sourceTag when configured
- Handles multiple promotion rules
- Updates existing promoted fragments instead of duplicating

**Rep scheme:**
- Promotes rep for initial round on mount
- Updates rep on next when round changes
- Does not re-promote when round unchanged
- Round-robin wraps when round exceeds scheme length
- Empty scheme skips promotion
- `getRepsForRound(n)` returns correct value
- `getRepsForCurrentRound()` returns last promoted round's reps
- Writes to `fragment:rep-target` memory tag

#### 7B.3 Update Strategies

| Strategy | Old | New |
|----------|-----|-----|
| `GenericLoopStrategy` | `RepSchemeBehavior` + `PromoteFragmentBehavior` | `FragmentPromotionBehavior` (single instance with repScheme + promotions array) |
| `ChildrenStrategy` | `PromoteFragmentBehavior` | `FragmentPromotionBehavior` |

In `GenericLoopStrategy`, the current code adds `RepSchemeBehavior` separately from `PromoteFragmentBehavior`. In the merged version, a single `FragmentPromotionBehavior` instance holds both the rep scheme and the promotion rules.

#### 7B.4 Check `IRepSource` Consumers

Search for `getBehavior(RepSchemeBehavior)` calls. Update to `getBehavior(FragmentPromotionBehavior)` or pull via `IRepSource` interface type if the codebase supports interface-based lookup.

#### 7B.5 Update `behaviors/index.ts`

- Add: `FragmentPromotionBehavior`
- Remove: `PromoteFragmentBehavior`, `RepSchemeBehavior`

#### 7B.6 Delete Old Behaviors

- `src/runtime/behaviors/PromoteFragmentBehavior.ts`
- `src/runtime/behaviors/RepSchemeBehavior.ts`

#### 7B.7 Update Existing Tests

- Port `PromoteFragmentBehavior` tests → `FragmentPromotionBehavior.test.ts`
- Port `RepSchemeBehavior` tests → `FragmentPromotionBehavior.test.ts`
- Update integration tests that check for `PromoteFragmentBehavior` / `RepSchemeBehavior` by name

#### 7B.8 Validate

```bash
bun run test
bun x tsc --noEmit
```

---

## Dependencies

- **Requires:** Phase 2 (ReEntryBehavior for round state memory)
- **Required by:** None (terminal phase)
- **7A and 7B are independent** and can be done in either order or in parallel

## Risk: Low

- `DisplayInitBehavior` and `RoundDisplayBehavior` are simple, well-tested, and write to a single memory tag
- `PromoteFragmentBehavior` and `RepSchemeBehavior` have clear contracts
- No cross-behavior coupling in any of these four behaviors
- `IRepSource` interface preserved on the merged behavior

### Mitigation

1. Run strategy tests after each sub-phase independently
2. Verify display memory content in Storybook runtime stories
3. Run integration tests for blocks that use rep schemes (Fran, etc.)
