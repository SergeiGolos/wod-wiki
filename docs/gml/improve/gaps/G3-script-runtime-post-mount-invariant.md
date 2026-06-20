# G3 — Post-mount snapshot invariant + `mixed-timers.md` verification ✅ DONE (2026-06-20)

> Source: minimax [#05](../../../minimax/improve/05-script-runtime-five-jobs.md)
> (unique angles not in global plan #3). **Severity:** Medium (correctness).
> **Hard dependency: global-plan S3a + S3b.**

### Result

* **New:** `tests/runtime-compliance/post-mount-snapshot-invariant.compliance.test.ts` (2 tests) — compiles a single-block timer script, asserts that after `userNext` every Timer block in the snapshot has non-empty `'time'` memory (i.e., `CountdownTimerBehavior.onMount` ran before the snapshot fired). Also asserts the initial pre-push state has no Timer blocks.
* **Modified:** `src/runtime/ScriptRuntime.ts` — added the "POST-MOUNT SNAPSHOT INVARIANT" docblock at `do()`'s `finally` block, explicitly naming the contract and pointing at the regression test.
* **Pre-existing regression test verified:** `tests/runtime-compliance/mixed-timers.compliance.test.ts` (9 tests, all pass) — the `mixed-timers.md` fixture's `"Invalid runtime state for next event"` bug is closed at the architecture level.

## Problem

The global plan's **S3a** merges the two snapshot constructors
(`subscribeToStack` and `_notifyStackSettled`) — the symptom of the
pre-mount snapshot leak. But S3a's acceptance criteria say "make the timing
explicit and documented," not "name and enforce the invariant." Two things
are missing:

1. **No named invariant.** The architectural contract — *"stack snapshots
   reflect post-mount state; pre-mount blocks never appear in a snapshot"* —
   is not asserted anywhere. A future maintainer could reintroduce a
   pre-mount snapshot path without breaking any test.

2. **No `mixed-timers.md` linkage.** The open `"Invalid runtime state for
   next event"` bug (`docs/testing-gap-analysis-timers.md:55-57`, fixture
   `mixed-timers.md`: `5:00 Run / 10 Burpees / *:30 Rest / :? Max Effort
   Pushups`) is the known downstream symptom of the snapshot/turn race. The
   global plan's #3 doesn't mention it. After S3a/S3b, the bug may be closed
   as a side-effect — or it may persist in the narrowed interface. Nobody
   checks.

## Solution

One verification story with two deliverables, executed **after** S3a and S3b
ship.

## Implementation

### Steps

1. **Add the post-mount snapshot invariant test.** Write a test that mounts
   a stub action (one whose `onMount` is a no-op — no memory initialized) and
   asserts that **no stack snapshot is emitted until `onMount` completes**.
   This pins the invariant S3a introduced by name. If the test fails, S3a's
   merge did not actually close the pre-mount leak.

2. **Run the `mixed-timers.md` fixture through the post-S3b runtime.** The
   fixture (`5:00 Run / 10 Burpees / *:30 Rest / :? Max Effort Pushups`)
   previously threw `"Invalid runtime state for next event"` when advancing
   to the collectible timer after forced rest. Two outcomes:
   - **Bug is gone:** add the fixture to `tests/runtime-compliance/` as a
     regression test. The architecture fixed it.
   - **Bug persists:** file an issue against the narrowed `IScriptRuntime`.
     The bug survived the interface narrowing and needs explicit investigation.

3. **Document the invariant in `ScriptRuntime.ts`.** Add a docblock to the
   snapshot emission path stating: *"Snapshots reflect post-mount state. A
   block whose `onMount` has not completed must not appear in a snapshot."*
   Reference the invariant test by name.

### Tests

- **Add** `tests/runtime-compliance/post-mount-snapshot-invariant.compliance.test.ts`
  — the stub-action test from step 1.
- **Add** `tests/runtime-compliance/mixed-timers.compliance.test.ts` — the
  fixture from step 2 (if the bug is gone; otherwise skip and file the issue).

### Acceptance

- The post-mount snapshot invariant test passes.
- `mixed-timers.md` fixture either passes (regression test added) or has a
  filed issue.
- `ScriptRuntime.ts` snapshot emission path has a docblock naming the
  invariant.

### Risks

- If S3a's merge didn't actually close the pre-mount leak, the invariant
  test will fail on landing. That's the correct outcome — it means S3a needs
  a follow-up before G3 can pass.
- The `mixed-timers.md` bug may have a different root cause than the
  snapshot race. If step 2 shows the bug persists, don't assume the
  architecture is wrong — investigate the narrowed interface first.

## Story

**G3** — hard dependency on global-plan **S3a** (snapshot constructors
merged) and **S3b** (`IScriptRuntime` narrowed). Execute after both ship and
`bun run test` is green.
