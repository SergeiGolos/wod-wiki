# Plan — Choice Resolution follow-ups (candidates 3 & 4)

Status: **proposed** (candidates 1 & 2 are done — see below).
Owner module introduced: `src/runtime/compiler/metrics/ChoiceResolution.ts`.

## Context

A `ChoiceGroupMetric` (`MetricType.Choice`) is a slash-separated OR expression
emitted by Fusion (`fuseUnits`). The runtime never understands a Choice; it must be
**collapsed** into a concrete alternative before the JIT compiles the first WOD
Block. See `CONTEXT.md` → *Choice Group* and *Choice Collapse*.

### Already shipped (candidates 1 & 2)

- **Candidate 1 — collapse seam before the runtime spins up.**
  `RuntimeFactory.createRuntime` now calls `collapseUnresolvedChoices(script.statements)`
  immediately after building the `WhiteboardScript` and **before** `StartSessionAction`.
  This is the enforced safety net: any still-unresolved Choice defaults to its first
  alternative, guaranteeing a `MetricType.Choice` never reaches a compiled Block —
  even on entry points that never surface the Pre-Run Wizard (tests, cast proxy,
  programmatic creation, autoStart).

- **Candidate 2 — one owner for the collapse.**
  The duplicated `resolveChoice` logic in `track-panel.tsx` and `RuntimeTimerPanel.tsx`
  is gone. Both now call the `resolveChoiceSelection` facade in
  `src/hooks/useCollectionMetrics.ts`, which delegates to `writeChoiceSelection` in
  the `ChoiceResolution` module. `writeChoiceSelection` is idempotent (drops any prior
  user-plan pick of the same type before writing), so default → user-pick → re-pick
  never accumulates duplicates. The hooks facade keeps component files off a direct
  `@/runtime/*` import (components-layer boundary, WOD-225).

---

## Candidate 3 — split `useCollectionMetrics` (it conflates two concerns)

### Problem

`useCollectionMetrics` returns a union, `ValueCollectionItem | ChoiceCollectionItem`.
These have **different lifecycles and resolution mechanisms**:

- `ValueCollectionItem` (hinted value collection) round-trips through the user override
  store via `setOverride(blockKey, metricType, value)`.
- `ChoiceCollectionItem` (pre-run choice) collapses into the **script** at `user-plan`
  via `resolveChoiceSelection`.

Every consumer (`track-panel.tsx`, `RuntimeTimerPanel.tsx`, `CollectionWizard.tsx`)
now branches on `item.kind` and casts (`item as ChoiceCollectionItem`). The union and
its discriminator **leak across the seam** instead of being hidden behind it. The hook
is *shallow* over two unrelated problems.

There is also a latent inconsistency: the choice branch's "already resolved" check
reads the **override store** (`overrides?.some(o => o.origin === 'user-plan')`), but
choice resolution writes to **`stmt.metrics`**, never to the override store. So the
check never actually fires. It happens to be harmless today (the wizard is a
single-pass, explicit-Start dialog) but it is a misleading signal.

### Proposed shape

Separate the two scans into two focused modules with small, deep interfaces:

1. `useValueCollection(...)` → `ValueCollectionItem[]` — hinted value collection only;
   detection and resolution both keyed on the override store.
2. `useChoiceCollection(script)` → `ChoiceCollectionItem[]` — unresolved Choice Groups
   only, detection keyed on `stmt.metrics` via `findUnresolvedChoices` (already in
   `ChoiceResolution`). This makes `stmt.metrics` the single source of truth for "is
   this choice resolved", removing the override-store inconsistency.

`CollectionWizard` then stops being a two-headed component:
- Option A: one wizard per concern (a `ChoiceWizard` and a `ValueWizard`), each with a
  homogeneous `items` array and no `kind` switch.
- Option B: keep one `CollectionWizard` but have it accept a discriminated *render
  strategy* rather than branching internally — only if the two genuinely share chrome
  (progress bar, prev/next, Start). Decide during implementation.

### Benefits

- The `kind` discriminator and every `as ChoiceCollectionItem` / `as ValueCollectionItem`
  cast disappear from call sites (**leverage**).
- Each scan is independently testable through its own interface; the choice scan tests
  against `stmt.metrics` truth, the value scan against the override store
  (**locality** + the interface becomes the test surface).
- Removes the dead/misleading override-store "already resolved" check.

### Risks / notes

- `CollectionWizard` currently shares pre-run chrome between both item kinds; confirm
  whether the chrome is genuinely shared before splitting the component (Rule of Three).
- Touch points: `src/hooks/useCollectionMetrics.ts`, `src/components/review/CollectionWizard.tsx`,
  `src/panels/track-panel.tsx`, `src/components/Editor/overlays/RuntimeTimerPanel.tsx`.

---

## Candidate 4 — make "no Choice reaches a compiled Block" an enforced invariant

### Problem

Candidate 1 collapses unresolved Choices **in the factory**. That covers the two known
runtime-creation paths, but the guarantee is positional (it lives at one call site),
not intrinsic to the compiler. If a future entry point builds a `ScriptRuntime`
without going through `RuntimeFactory.createRuntime`, an unresolved `ChoiceGroupMetric`
would be **silently dropped** by the JIT — no Resistance/Effort metric emitted, and
nothing complains. The "resolved by now" expectation is invisible at the compiler seam.

The current implicit protocol leans on three disconnected mechanisms:
1. the JIT cache-key filtering `MetricType.Choice` (like `Hint`),
2. ownership precedence `user-plan` (rank 2) shadowing `parser` (rank 3),
3. no strategy handling `MetricType.Choice`.

None of these is a single named guarantee, and none fails loudly when the contract is
violated.

### Proposed shape

Move the guarantee to the compiler seam — the place the contract is actually relied on:

- When `JitCompiler` is about to compile a statement that still carries an unresolved
  `MetricType.Choice` (no `user-plan` metric of the chosen type present), either:
  - **fail-fast** in dev (throw / loud console error with the statement id and the
    alternatives), and/or
  - **collapse-on-read** to the first alternative as a last-resort default, logging
    that a default was applied.

Reuse `findUnresolvedChoices` / `collapseUnresolvedChoices` from `ChoiceResolution`
so the rule stays single-owned. The factory call from candidate 1 can then be framed
as an *eager* application of the same invariant the compiler *enforces*.

### Benefits

- Turns a silent data-loss bug into a loud, localized one (**locality** — the failure
  surfaces at the one seam that depends on the guarantee).
- Any new runtime-creation path inherits the guarantee for free (**leverage**).
- Pairs naturally with candidate 1: the seam asserts what the compiler then trusts.

### Risks / notes

- Decide the dev-vs-prod behavior (throw vs. default-with-warning). Throwing in prod
  would regress a workout mid-load; default-with-warning is safer for users.
- Touch points: `src/runtime/compiler/JitCompiler.ts`, possibly the strategy that
  reads metrics for the affected block.
- Add a regression test: build a runtime from statements containing an unresolved
  Choice *without* the wizard, assert the compiled Block carries the defaulted metric
  (or that the guard fires), and that no `MetricType.Choice` survives into the Block.
