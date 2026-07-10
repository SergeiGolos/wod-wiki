# Wiring plan: accomplishment trigger

Implementation plan for ticket [05 — Wiring the accomplishment trigger](../issues/05-wiring-accomplishment-trigger.md).

Resolves the implementation shape after tickets 01, 02, 03, 04, and 08 settled the schema, state, semantics, and cast-safety constraint set. **No code is written in this ticket** — the next effort executes the plan.

## Design summary

A new hook `useCompletionChallenge` sits alongside `useSyntaxChallenge`. It owns the runtime-only `workout-complete` quests; the existing `useSyntaxChallenge` keeps owning block-pure syntax quests. The two hooks share the same `usePageQuests` ledger — calling `markComplete(questId)` from either side writes to the same per-route Set.

The hook observes the canvas page's `runtime.fullscreen` state (the discriminated union from ticket 03). When `fullscreen.kind === 'review'`, it inspects the `results` payload, applies the trigger gate (`results && results.completed === true`), and calls `markComplete` for every quest whose `validation.type === 'workout-complete'`. No new event bus, no ref plumbing.

`useSyntaxChallenge` filters `workout-complete` quests out before calling `validateScriptBlock` so the validator's deny-on-unknown default is preserved for everything that reaches it.

## File-by-file change set

### New file

**`playground/src/hooks/useCompletionChallenge.ts`** — the new sibling hook.

- Signature mirrors `useSyntaxChallenge` minus the `block` arg:

  ```ts
  export function useCompletionChallenge({
    pageRoute,
    quests,
    /** The page's current fullscreen state (ticket 03 union). */
    fullscreen,
    enabled = true,
  }: UseCompletionChallengeArgs): UseCompletionChallengeResult
  ```

- Behavior:
  1. Calls `usePageQuests(pageRoute, quests)` to get `markComplete`.
  2. Filters `quests` to those with `validation?.type === 'workout-complete'`. If none, returns early.
  3. Reads `fullscreen` from props. On a transition where `fullscreen.kind === 'review'` AND `enabled` AND `results?.completed === true`, iterates the filtered quests and calls `markComplete(q.id)` for each.
  4. Snapshot set of "already-fired-in-this-mount" quest ids to avoid double-firing during React StrictMode double-mount (defensive; the ledger is already idempotent, but a single render guard keeps React DevTools quiet).
  5. Returns `{ questIds: string[] }` — useful for tests to assert which quests were marked. The `ChallengeBanner` does not need this hook's return value; it consumes `usePageQuests`'s decorated quests directly.

- Test file: **`playground/src/hooks/useCompletionChallenge.test.ts`** — covers:
  - Quests with non-`workout-complete` validation are ignored.
  - Trigger fires on `kind: 'review'` transition.
  - Trigger does NOT fire when `results.completed === false`.
  - Trigger does NOT fire when `enabled === false`.
  - Re-firing the same trigger is a no-op (ledger enforces once-only; the hook should not throw or warn).
  - Empty quests array is a no-op.

### Edit: `playground/src/hooks/useSyntaxChallenge.ts`

Filter `workout-complete` quests before validation. The cleanest place is inside the existing `results` memo at line 74–90:

```ts
const results = useMemo<Record<string, ValidationResult>>(() => {
  const out: Record<string, ValidationResult> = {};
  if (!enabled || !block) {
    for (const q of quests) {
      out[q.id] = { pass: false, reason: 'No active block.' };
    }
    return out;
  }
  const statements = block.statements ?? compiledStatements;
  const virtualBlock = { content: block.content, statements };
  for (const q of quests) {
    // Runtime-only quest types are handled by `useCompletionChallenge`.
    // Skip them here so the validator's deny-on-unknown default doesn't
    // mark them as failed.
    if (q.validation?.type === 'workout-complete') {
      out[q.id] = { pass: false, reason: 'Validated at runtime.' };
      continue;
    }
    out[q.id] = validateScriptBlock(virtualBlock, q.validation);
  }
  return out;
}, [block, quests, enabled, compiledStatements]);
```

This keeps the validator file pure and never feeds `workout-complete` schemas into `validateScriptBlock`.

The existing auto-complete effect at lines 92–108 already guards on `r?.pass`, so filtering out the runtime-only types at this layer means they will never be auto-completed by `useSyntaxChallenge` (good). The completion hook takes over for those.

### Edit: `playground/src/canvas/MarkdownCanvasPage.tsx`

Mount the new hook. Pass `page.quests ?? []` and the page's `runtime.fullscreen` (the union from ticket 03). Place the call next to the existing `useSyntaxChallenge` invocation at line ~160:

```ts
const completion = useCompletionChallenge({
  pageRoute: page.route,
  quests: pageQuests,
  fullscreen: runtime.fullscreen,
})
```

The completion hook returns `{ questIds }` only — `MarkdownCanvasPage` does not need to do anything with it. The hook writes to the ledger; `ChallengeBanner` reads from the same ledger via `usePageQuests`.

### Edit: `playground/src/services/syntaxChallengeValidator.ts` — OPTIONAL, NOT REQUIRED

Per ticket 02's decision, the validator stays block-pure and is NOT extended. No change needed in this file. The `VALIDATORS` registry remains the existing five types (`has-movement`, `exactly-movements`, `has-reps`, `min-rounds`, `contains-token`). The deny-on-unknown default at lines 190–196 is preserved.

If the implementation reviewer wants a defensive runtime-type allowlist here too, it can be added as a Set constant at the top of the file:

```ts
const RUNTIME_OWNED_TYPES = new Set(['workout-complete'])
```

…and `validateScriptBlock` could short-circuit on those with `{ pass: false, reason: 'Validated at runtime.' }`. But this duplicates the filter in `useSyntaxChallenge.ts`. **Skip it** unless the implementation wants a belt-and-braces second filter — the one in the hook is sufficient because that's the single call site in the codebase.

## Test surface updates

- **NEW**: `playground/src/hooks/useCompletionChallenge.test.ts` — listed above.
- **EDIT**: `playground/src/canvas/MarkdownCanvasPage.test.tsx` — currently mocks `getAnalyticsFromLogs` (line 123). The new test scenarios must cover:
  - A page quest with `validation: { type: workout-complete }` gets `markComplete` called when the canvas page transitions to `fullscreen.kind === 'review'` with `results.completed === true`.
  - The same quest is NOT marked complete when `results.completed === false`.
- **EDIT**: `playground/src/hooks/useSyntaxChallenge.test.ts` (does not exist yet — if added later, the new test must cover the `workout-complete` skip). For now, the existing test surface for `useSyntaxChallenge` does not include a case that would trip the new filter (no existing quest uses `workout-complete`), so no edit is required. **Verify in the test sweep ticket (06) that no existing quest frontmatter uses the new type** — otherwise those tests need fixtures.
- **EDIT**: `playground/src/services/syntaxChallengeValidator.test.ts` — no edit. The validator surface does not change.
- **CAST SAFETY** (per ticket 08): no cast-related test edit needed in this ticket. The cast bridge is sender-side and unaffected by the new hook. If the implementer adds a regression test for "cast bridge continues to send updates while the fullscreen modal is open," that lives in the cast test surface, not here.

## Order of operations for the implementation

The execution effort should land changes in this order to keep the test surface coherent:

1. Create `useCompletionChallenge.ts` with the test file. Test-only commit; the hook is not yet mounted.
2. Edit `useSyntaxChallenge.ts` to filter `workout-complete`. Existing tests must still pass — none use the new type.
3. Edit `MarkdownCanvasPage.tsx` to mount the hook and pass `runtime.fullscreen`.
4. Update `MarkdownCanvasPage.test.tsx` mocks to inject `runtime.fullscreen` into the page if the existing mocks don't already cover it (verify; `MarkdownCanvasPage` already has access to `runtime`, so the hook call should not require new mocks).
5. Run full test suite (`npm run test`) and verify all four `MarkdownCanvasPage.test.tsx` scenarios still pass (the existing "persists the first inline canvas completion" test at line 277 covers the in-panel path; that test is on the deletion list for the implementation phase per ticket 01's inventory — when the in-panel path is deleted, this test rewrites or removes).
6. Run the cast-side smoke: open the local-tab `/receiver-rpc.html` mirror and confirm a sample workout's `fullscreen.kind === 'review'` transition still drives the receiver through its existing `'active'` panel rendering (per ticket 08's finding).

## Risks and what to watch

- **Strict-mode double-invoke**: React StrictMode runs effects twice in development. The new hook's effect must be idempotent across double-fires. The internal "already-fired-in-this-mount" Set covers this; the ledger is the second-line defense.
- **`useEffect` dep churn**: depending on `runtime.fullscreen` directly means the effect re-runs on every fullscreen state change. Memoize the dependency or guard inside the effect on `kind === 'review'` only. Otherwise the hook logs noise on every keystroke that mutates `runtime`.
- **Page navigation between routes**: the hook's snapshot Set is keyed on `pageRoute`. If the user navigates to a different page mid-flight, the cleanup should reset the snapshot. The natural React lifecycle (component unmount) handles this — but verify by reading the `useEffect` return cleanup in the new hook.
- **Test pollution**: `usePageQuests` reads from localStorage (`wodwiki.quests.v1`). Tests must reset the ledger before each scenario. Existing `usePageQuests.test.ts` already handles this. The new `useCompletionChallenge.test.ts` must do the same.
- **The `Quest` type appears in three places**: `parseCanvasMarkdown.ts` (parser output), `usePageQuests.ts` (hook input), and `useSyntaxChallenge.ts` (hook input). Today they're shape-compatible but distinct. The new hook reuses the `usePageQuests.ts` `Quest` type to stay consistent.

## Out of scope (deferred to follow-ups)

- **Per-quest thresholds** (e.g. `validation: { type: workout-complete, min-segments: 3 }`) — ticket 04 ruled out for now.
- **Chapter progress wiring** — `useChapterProgress` already reads the ledger; no change needed, but the implementer should confirm chapter badges update correctly when a `workout-complete` quest is the only one on a page.
- **Storybook stories** for the new hook — follow-up ticket (currently in fog under `Not yet specified`).
- **Chromecast cast-side optimization** (collapsing `workbenchModeResolver` to wall-clock-only) — separate effort, scoped out per ticket 08.

## Implementation effort size

Roughly 1.5 person-days:

- Hook + tests: ~0.75 days.
- Filter + page mount + MarkdownCanvasPage test updates: ~0.5 days.
- Verification (cast smoke, full test suite, ledger reset confirm): ~0.25 days.

## Acceptance criteria

The implementation is complete when:

1. A page frontmatter `Quest` with `validation: { type: workout-complete }` is auto-marked-complete after the canvas page transitions to `fullscreen.kind === 'review'` with `results.completed === true`.
2. The same quest is NOT marked-complete when `results.completed === false`.
3. The same quest is NOT marked-complete in isolation by `useSyntaxChallenge` (no validator involvement).
4. Re-running the same block does not re-mark-complete (ledger enforces).
5. The Chromecast local-tab mirror still renders the workout timer on `kind === 'review'` transition (cast safety preserved).
6. All existing tests pass; the four new `useCompletionChallenge.test.ts` scenarios pass.
7. `npm run test` is green for both `playground/src/` and `src/`.