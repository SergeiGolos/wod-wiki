# Architectural Cleanup: Simplifying the Parser/Compiler/Runtime Without Changing the Goal

This is the summary index for a three-part cleanup plan derived from a source-level review of the parser → JIT compiler → runtime → metrics pipeline (see [`parser-compiler-runtime-metrics.md`](./parser-compiler-runtime-metrics.md) for how that pipeline works today).

The review's mandate was narrow: **identify complexity that can be removed or consolidated without changing the core goal** — parse Markdown-based workout text, run it in the runtime, collect metrics, and let those metrics be compared across workouts — **and, where possible, make the system more customizable** (techie users programming behaviors against specific efforts, dialect-specific analytics, and easy dialect authoring).

Three documents cover the findings, ordered by risk and payoff:

| Tier | Document | Status | What it covers | Risk |
|---|---|---|---|---|
| 1 | [Tier 1 — Deletions](./architectural-cleanup-tier-1-deletions.md) | ✅ **Implemented and verified** | Verified-dead code: unused behaviors, vestigial strategies, an over-engineered cache, small dead exports | None — pure removal, zero production consumers confirmed by grep |
| 2 | [Tier 2 — Consolidations](./architectural-cleanup-tier-2-consolidations.md) | Not started | Duplicated mechanisms doing the same job three different ways: observation channels, output emission, strategy behavior wiring, honest deprecation labels | Low — mechanical refactors, no behavior change intended |
| 3 | [Tier 3 — Extensibility Realignment](./architectural-cleanup-tier-3-extensibility.md) | Not started | Why "add a dialect" / "program a behavior for an effort" / "dialect-specific analytics" are harder than they should be today, and how to fix it using mechanisms that already exist | Medium — changes the public extension surface |

## What's explicitly *not* being touched

The review confirmed these are load-bearing design decisions, not accidental complexity. They look intricate on first read but each one directly serves the stated goal, and simplifying them would make the system *harder* to reason about, not easier:

- **The two-seam parser** (grammar → syntax primitives → semantic metrics). Grammar changes and workout-semantics changes are independent; collapsing the seam would re-couple them.
- **Lazy, per-round recompilation of child blocks.** Re-compiling the same statements every round looks wasteful, but it's the actual mechanism that projects round-specific state (a `21-15-9` rep scheme) into children declaratively via metric promotion. A stateful/mutable alternative would be *more* code, not less, and would break the "metrics are the universal currency" invariant.
- **Frozen-clock turns** (`ExecutionContext` + `SnapshotClock`). One user action can cascade into a pop → parent-advance → child-push chain; freezing the clock for the whole turn is what keeps every timestamp in that chain consistent. This is correctness, not incidental complexity.
- **Memory visibility tiers** (`display` / `result` / `promote` / `private`). Four tags, but they're the entire contract for what's shown, what's logged, what's inherited, and what's internal. Removing the distinction would just push the same decision into ad-hoc conditionals elsewhere.
- **Origin-based metric ownership** (`user` > `runtime` > `compiler` > `parser`). This is what lets a user's manual correction to a rep count win over the plan without special-casing.

## Suggested execution order

1. ✅ **Tier 1** — one PR, pure deletion, ~500+ LOC removed (behaviors, strategies, tests, small dead exports). Immediately shrinks the surface every later change has to reason about. **Done** — see the verification appendix in the Tier 1 doc for what was implemented, what was found missing from the original plan (a stale test and three test files the plan under-scoped), and how it was fixed.
2. **Tier 2, items 5–6** (tracker removal, output consolidation) — collapses "how does data leave the runtime" from three answers to two, and from ten emission sites with a confirmed double-fire to one authoritative path per block-pop. Note: Tier 1 already removed `WorkoutTracker`'s no-op span methods and hot-path `console.log` calls as small dead-code items — the tracker class itself, its two dispatch actions, and `subscribeToTracker` are still live and are this item's actual scope.
3. **Tier 2, item 7** (builder-resolves-exit) — removes the add/remove/move-behavior churn in the compiler before anyone builds new strategies on top of it.
4. **Tier 3, item 13** (registries + exports) — the prerequisite for everything else in Tier 3; converts three hardcoded lists into one registration pattern that's actually exported to consumers.
5. **Tier 3, items 11–12** (hint contract, effort hints) — delivers the "program behavior against an effort" and "dialect analytics" goals on top of a mechanism (`hints`) that already exists and is already understood by strategies.

Each tier document below includes, per item: what exists today (with file:line references), why it's a problem, and a side-by-side sketch of the old vs. new code shape. Tier 1's sketches now describe what was actually implemented (see its verification appendix); Tiers 2 and 3 remain proposed designs derived from the review — nothing in those two has been implemented yet.
