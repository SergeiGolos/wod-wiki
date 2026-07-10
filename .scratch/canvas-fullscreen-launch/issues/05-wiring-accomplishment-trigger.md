Type: task
Status: resolved
Blocked by: 01, 02, 04

## Question

Plan the implementation of the accomplishment trigger now that tickets 02 and 04 have settled the schema and semantics:

- **Hook**: introduce a new sibling hook to `useSyntaxChallenge` (per ticket 02's decision). Decide its name (placeholder: `useCompletionChallenge`), location, and surface. It must: (a) read the page's `Quest[]` and pick the ones with `validation.type === 'workout-complete'`; (b) subscribe to completion events from the canvas page; (c) call `usePageQuests.markComplete(questId)` once per matching quest when the trigger fires.
- **Event channel**: how the canvas page notifies the hook. Per ticket 03 the page already calls `setFullscreen({ kind: 'review', segments, results })` at completion. Options: (a) the hook reads from the same `useCanvasRuntime` state via context, (b) an explicit event subscriber pattern, (c) the page directly invokes the hook's `record` function via ref. Pick the simplest that doesn't introduce a new event bus.
- **Trigger gate**: per ticket 04 the hook applies `shouldRecordCompletion(results)` (truthy `results && results.completed === true`) before calling `markComplete`. Belt and suspenders.
- **`useSyntaxChallenge` integration**: confirm that `useSyntaxChallenge` filters out `type: workout-complete` quests before calling `validateAllQuests` (per ticket 02's hand-off). Document where the filter lives.

Output: a written wiring plan that lists every file touched, every test surface updated, and the order of operations for the implementation. No code is written in this ticket — the next effort executes it.

## Answer

Full wiring plan written: [Wiring plan: accomplishment trigger](../assets/05-wiring-plan.md).

**Summary of the plan**:

- **New hook** `useCompletionChallenge` lives at `playground/src/hooks/useCompletionChallenge.ts`. Sibling to `useSyntaxChallenge`, no event bus. Reads `runtime.fullscreen` (ticket 03 union) and calls `markComplete` on the `usePageQuests` ledger when `fullscreen.kind === 'review'` AND `results.completed === true`. Idempotent across React StrictMode double-mount via an internal "already-fired-in-this-mount" Set; the ledger enforces once-only as second-line defense.
- **Edit** `useSyntaxChallenge.ts` (lines 74–90) to filter `workout-complete` quests out before `validateScriptBlock`. The validator's deny-on-unknown default is preserved for everything else; runtime-only types return `{ pass: false, reason: 'Validated at runtime.' }` from this layer.
- **Edit** `MarkdownCanvasPage.tsx` to mount the new hook next to the existing `useSyntaxChallenge` call. Pass `page.quests ?? []` and `runtime.fullscreen`. The hook's return value is unused by the page — it writes to the ledger; `ChallengeBanner` reads from the same ledger.
- **No change** to `syntaxChallengeValidator.ts`. Stays block-pure. Ticket 02's contract holds.
- **Tests**: new `useCompletionChallenge.test.ts` (6 scenarios), edit `MarkdownCanvasPage.test.tsx` to cover the trigger path.
- **Cast safety**: per ticket 08, no cast-side change is needed. The hook writes to the localStorage ledger sender-side; the receiver keeps reading its own cast projection.

**Order of operations**:

1. Land `useCompletionChallenge.ts` + its test file (hook unmounted yet).
2. Land the `useSyntaxChallenge.ts` filter.
3. Land the `MarkdownCanvasPage.tsx` mount.
4. Update `MarkdownCanvasPage.test.tsx`.
5. Run `npm run test`; verify cast smoke via `/receiver-rpc.html` local-tab mirror.

**Acceptance criteria**:

1. A page-frontmatter `workout-complete` quest is auto-marked-complete after the canvas page transitions to `kind: 'review'` with `results.completed === true`.
2. Same quest NOT marked-complete when `results.completed === false`.
3. Same quest NOT marked-complete by `useSyntaxChallenge` (no validator path).
4. Re-running does not re-mark-complete (ledger enforces).
5. Cast local-tab mirror still renders timer on `kind: 'review'` transition.
6. All tests green.

**Implementation effort**: ~1.5 person-days.