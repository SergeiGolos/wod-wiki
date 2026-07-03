# Proposal: Make Effort Hints Actually Reach Strategies

Companion to [`architectural-cleanup-tier-3-extensibility.md`](../architectural-cleanup-tier-3-extensibility.md) §3.3 and its Verification Appendix, which found the confirmed gap this document proposes fixing. Read that section first if you haven't — this doc assumes the diagnosis is already established and goes straight to the fix.

## The problem, in one paragraph

`IEffort.hints` (declared in effort markdown frontmatter) is supposed to let a technie user attach compiler hints to a specific exercise, the same way a dialect attaches hints to a workout pattern. Today it doesn't work: `EffortEnrichmentPass` writes the hints into `metric:hint` **block** memory, but that pass runs *after* `JitCompiler.compile()` returns — and every consumer of hints (`IntervalLogicStrategy`, `GenericTimerStrategy`, `LabelComposer`) reads hints off the **statement**, during `match()`/`apply()`, which is what `compile()` runs internally. By the time an effort hint could be read, the decision it might have influenced has already been made. Confirmed: a repo-wide grep for the `metric:hint` tag turns up exactly two hits, both in the writer (`RuntimeBlock.ts`) — nothing reads it.

## Why dialects don't have this problem

`DialectStack.processAll(statements)` runs in `lezer-mapper.ts`, as part of **parsing** — strictly before `JitCompiler.compile()` is ever called on those statements. Dialect hints land on `statement.metrics` while the statement is still just a statement, so by the time a strategy's `match()` runs against it, the hints are already there. The fix is to give effort hints the same head start.

## Two options, and the recommendation

The Tier 3 appendix left two options open. Recommendation: **Option 1**.

| | Option 1: move resolution pre-compile | Option 2: re-scope to analytics-only |
|---|---|---|
| Delivers the original promise (program behavior against an effort) | Yes | No — hints stay inert for compilation, only ever useful to a future analytics processor |
| Engineering cost | Moderate — one new function, one new call site, no interface changes | Near-zero — a doc-comment fix |
| Risk | Low if scoped correctly (see design below) — does not touch `IDialect`, does not touch any existing dialect | None |
| Leaves working code in a confusing state | No | Yes — `IEffort.hints`, the markdown parsing, and `mergeHints` all stay in the codebase, fully wired, doing nothing useful |

Option 2 is the fallback if Option 1's scope turns out to be unacceptable for some reason discovered during implementation — but as designed below, the change is small and self-contained, so there's no strong reason to settle for the lesser fix.

## Why this isn't "just register effort hints as a dialect"

The obvious-looking shortcut — implement effort-hint resolution as another `IDialect` and register it in `dialectRegistry` — doesn't work, and it's worth stating why so nobody tries it and gets confused later:

**Dialects are constructed once, at module load, with no access to a runtime.** `dialectRegistry`'s seed array is built with bare `new CrossFitDialect()`-style calls before any `ScriptRuntime` exists. Resolving an effort requires an `IEffortResolver` — a runtime-scoped object (`runtime.analyticsContext.effortResolver`) that can differ per script (e.g. a user's `IndexedDBEffortRegistry`-backed resolver with their own custom efforts layered over the bundled set). `IDialect.analyze(statement)` takes no context parameter, so there's no seam to inject a per-runtime resolver into a dialect instance without widening `IDialect`'s interface — which would touch all seven existing dialect implementations for a capability only one new caller needs.

Effort resolution is a **compile-time**, per-runtime concern; dialect processing is a **parse-time**, resolver-independent concern. They run at genuinely different pipeline stages for a real reason, not an oversight. The fix below keeps them separate.

## The design

### New function: `applyEffortHintsToStatements`

Add this to `src/runtime/compiler/EffortEnrichmentPass.ts`, alongside (not replacing) the existing post-compile `applyEffortEnrichment`:

```ts
/**
 * Pre-compile pass: attaches effort-defined hints (IEffort.hints) onto each
 * statement's own metrics, before JitCompiler.compile() runs — the same
 * pipeline stage dialects use (see DialectStack.processAll), so
 * hasHint()/getHints() calls inside strategy match()/apply() actually see
 * them. This is a *different* pass from applyEffortEnrichment (below),
 * which still runs post-compile to attach the effort-data analytics metric
 * (planned MET/discipline) — that one has no timing requirement and is
 * unaffected by this change.
 *
 * Call this on the same statement array passed to `runtime.jit.compile(...)`,
 * before that call — see CompileAndPushBlockAction.
 */
export function applyEffortHintsToStatements(
  statements: readonly ICodeStatement[],
  resolver: IEffortResolver,
): void {
  for (const statement of statements) {
    const effortMetric = statement.metrics
      .toArray()
      .find((m): m is IMetric & { value: string } =>
        m.type === MetricType.Effort && typeof m.value === 'string');
    if (!effortMetric) continue;

    let resolved: ResolvedEffort;
    try {
      resolved = resolver.resolveEffort(effortMetric.value);
    } catch {
      continue; // unresolvable effort text — leave the statement alone
    }

    const hints = resolved.effort.hints;
    if (!hints || Object.keys(hints).length === 0) continue;

    // hintsToContainer's dedup checks the EXISTING container's hints before
    // adding — passing `statement.metrics` here (not a fresh container)
    // means re-running this on the same statement (e.g. a rounds child
    // re-compiled every round) does not accumulate duplicate hint metrics.
    hintsToContainer(Object.keys(hints), statement.metrics, 'compiler');
  }
}
```

Notes on this design:

- **Finds the effort from the raw statement metric, not a composed label.** The current post-compile pass matches on `block.label` — a *composed* display string (logic + metric + identity + attributes, see `LabelComposer.build`), which is a display artifact, not a clean identifier. Reading `MetricType.Effort`'s `.value` directly (e.g. `"Thrusters"`) is both more precise and available before any label has been composed. This is a small improvement riding along with the fix, not a new risk — it's the same value `EffortFallbackStrategy` and friends already treat as the effort identity.
- **Idempotent across repeated compiles.** The lazy JIT architecture recompiles the same child statements every round of a loop (see `docs/parser-compiler-runtime-metrics.md`). Because `hintsToContainer`'s de-dup reads the *existing* container's hints before adding, calling this function again on the same statement object on round 2, 3, etc. is a no-op past the first call — no accumulation, no need for a separate "already processed" guard.
- **`resolver.resolveEffort()` never throws in practice** (unresolved efforts come back as a `registrySource: 'synthetic-unresolved'` `ResolvedEffort`, not an exception) — the `try/catch` is defensive, matching the existing post-compile pass's own defensiveness (`tryEnrichBlock` wraps its resolve call in `try/catch` too).
- **No new dependency direction.** `EffortEnrichmentPass.ts` already imports `IEffortResolver`; this just adds a sibling function in the same file, using the same import.

### One new call site: `CompileAndPushBlockAction`

```ts
// src/runtime/actions/stack/CompileAndPushBlockAction.ts
import { applyEffortEnrichment, applyEffortHintsToStatements } from '../../compiler/EffortEnrichmentPass';

// ... inside do(runtime):
const childStatements = runtime.script.getIds(this.statementIds);
if (childStatements.length === 0) {
    return [];
}

// NEW — pre-compile: attach effort hints to statements before compile()
// runs, so strategies can see them during match()/apply().
if (runtime.analyticsContext?.effortResolver) {
    applyEffortHintsToStatements(childStatements, runtime.analyticsContext.effortResolver);
}

try {
    const compiledBlock = runtime.jit.compile(childStatements, runtime);
    if (!compiledBlock) {
        return [];
    }

    // UNCHANGED — post-compile: attach the effort-data analytics metric
    // (planned MET/discipline/intensity) to the compiled block.
    if (runtime.analyticsContext?.effortResolver) {
        applyEffortEnrichment(compiledBlock, {
            resolver: runtime.analyticsContext.effortResolver,
        });
    }

    return [new PushBlockAction(compiledBlock, this.options)];
} catch (error) {
    console.error(`CompileAndPushBlockAction: Compilation failed`, error);
    return [];
}
```

Both passes are gated on the same `runtime.analyticsContext?.effortResolver` check that already exists — no new configuration surface, no new failure mode for scripts that don't have an effort resolver configured.

### Interaction with the JIT strategy cache

None. Tier 1 removed the strategy-match cache entirely (`docs/architectural-cleanup-tier-1-deletions.md` §1.3) — every `compile()` call evaluates `match()` fresh. If that cache still existed, this change would need to bypass it the same way promotion does (`JitCompiler.ts`'s `hasPromotions` check), since attaching a new hint changes which strategies match. Worth a one-line note here in case the cache is ever reintroduced: **a future strategy-match cache must key on effort-attached hints the same way it would need to key on promoted metrics.**

### Interaction with metric promotion

None expected, but worth stating: `PromotionResolver` projects *parent block* memory (visibility `promote`) onto a *child's* cloned statements, and that projection happens inside `JitCompiler.compile()` itself — after this proposal's new pre-compile pass would already have run on the original (not yet cloned) statements. Since `PromotionResolver` clones and *appends* promoted metrics (never removes existing ones), an effort hint already attached to the original statement survives into the promoted clone unchanged. No ordering conflict.

## Open questions to resolve during implementation

1. **Multiple Effort metrics on one statement.** The parser's `mergeFragments` concatenates adjacent efforts into one `EffortMetric` in the common case ("Push Ups" → one metric), but it's not proven impossible for a statement to carry more than one after dialect/promotion processing. The design above takes the *first* match via `.find()`. Confirm this is the right behavior (versus, say, resolving all of them and merging hints from each) against a real multi-effort test case before shipping.
2. **Precedence when a dialect and an effort both set the same hint on the same statement, with conflicting values.** `hintsToContainer`'s de-dup keys on the hint *string* only (hints are presence flags, not key-value pairs — `behavior.required_timer` is either present or absent, there's no "value" to conflict on). So in practice there's no real conflict to resolve: if either a dialect or an effort attaches `behavior.required_timer`, it's present. This resolves the "effort-vs-dialect precedence" question the original Tier 3 doc raised as unresolved — it turns out not to be a real question, since hints don't carry values to prioritize between. Worth confirming this reasoning holds once implemented and tested.
3. **Test coverage.** Neither `EffortEnrichmentPass.ts` nor `CompileAndPushBlockAction.ts` currently has a dedicated test file (confirmed absent during the Tier 3 audit). Implementing this proposal should add one, covering at minimum: an effort hint reaching `IntervalLogicStrategy`/`GenericTimerStrategy`'s `match()`, idempotency across a simulated re-compile, and the case where `resolver.resolveEffort()` returns a `synthetic-unresolved` effort with no `hints`.
4. **Should `applyEffortHintsToStatements` also run for the label-consumed hints (`CONSUMED_HINTS.LABEL_*`)?** Yes, automatically — `LabelComposer` reads hints the same way strategies do (`hasHint`/`getHints` on statement metrics), so no special-casing is needed; an effort setting `workout.emom` as a hint would flow through identically to a dialect setting it.

## Verification plan for implementation

Before merging a change based on this proposal, confirm:

- [ ] `bun test ./src` and the full `tests/` suite show zero new failures (compare against the byte-identical-baseline methodology used throughout the rest of this cleanup — see any of the three Tier verification appendices for the exact `git stash`-diff technique).
- [ ] A manual end-to-end script (in the style of the ones used to verify `docs/guide-authoring-a-sport-dialect.md`) proves the fix: define an effort with `hints: { behavior.required_timer: true }` in a test-only markdown fixture (or an in-memory `IEffortRegistry.upsert()` call), compile a statement using that effort's name, and confirm `GenericTimerStrategy.match()` returns `true` where it previously wouldn't have.
- [ ] `tsc --noEmit` run explicitly (per the lesson recorded in the Tier 2 verification appendix — test suites alone don't catch every class of regression).
- [ ] Update `IRuntimeBlock.mergeHints`'s doc comment (currently describes the gap this proposal closes) and the inline comment in `EffortEnrichmentPass.tryEnrichBlock` to remove the "does NOT reach any strategy" caveat once it's no longer true.
