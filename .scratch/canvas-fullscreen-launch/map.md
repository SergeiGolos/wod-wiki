## Destination

Canvas-editor workout interactions use a unified full-screen dialog surface — the Run button always launches `FullscreenTimer`, completion hands off into `FullscreenReview` mounted at the same surface, and a successful completion records an accomplishment against the page's active challenge `Quest` ledger via an extended `Quest.validation` type.

## Notes

- **Domain**: WOD Wiki playground + package runtime. Canvas editor = `playground/src/canvas/MarkdownCanvasPage.tsx` + `CanvasEditorPanel`. Challenge system = `useSyntaxChallenge` + `usePageQuests.markComplete`. Fullscreen surfaces = `src/components/organisms/review/FullscreenTimer.tsx`, `FullscreenReview.tsx`.
- **Skills every session should consult**: `/domain-modeling` (to keep "accomplishment" / "challenge" / "completion" terminology consistent with `CONTEXT.md`); `/grilling` (default for HITL decisions); `/prototype` (only if a design call needs a concrete UI shape).
- **Standing preferences**:
  - Map is **planning only** — every ticket resolves a decision. Execution is out of scope here.
  - In-panel timer path (`launchViewRuntime`, `useMobileRunOverride`, the mobile-only branch) is being **deleted entirely**, not deprecated. Don't carry shims.
  - "Same quest system" — extend the existing `Quest.validation` schema, do not introduce a parallel accomplishment channel.
  - Completion is the trigger — clicking Run without finishing does **not** record an accomplishment.
- **Relevant context docs**: `markdown/canvas/challenge/README.md` (frontmatter quest shape), `docs/design/onboarding-banner-spec.md` (existing scroll-alignment work already deferred to a future wayfinder map — don't re-litigate here).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Inventory launch call sites](./issues/01-inventory-launch-call-sites.md) — launch surface is contained to a three-file trio (`useCanvasRuntime`, `useMobileRunOverride`, `MarkdownCanvasPage`); no out-of-scope consumer depends on the in-panel path; four distinct launch paths feed the canvas editor (in-panel timer, nav fullscreen to WallClockPage, imperative panel-actions fullscreen, inline canvasCommand Run); `blockHasTimer` becomes dead after the mobile branches are deleted. Full inventory: [research asset](./assets/01-launch-call-site-inventory.md).
- [Quest schema extension shape](./issues/02-quest-schema-extension-shape.md) — new `validation: { type: workout-complete }` discriminator, reuses the existing `Quest.validation` field, validator stays block-pure, sibling completion hook intercepts the new type before the deny-on-unknown validator sees it; validator's deny-on-unknown default is preserved.
- [Completion handoff state shape](./issues/03-completion-handoff-state-shape.md) — discriminated union `runtime.fullscreen: { kind: 'timer', block, results } | { kind: 'review', segments, results } | null` replaces `fullscreenBlock` and `reviewSegments`; segments derived once at completion in the page's `onCompleteWorkout`; existing `panelMode: 'review'` collapses out.
- [Completion trigger semantics](./issues/04-completion-trigger-semantics.md) — strict completion only (`results.completed === true`), wall-clock blocks count, zero-output counts, once-only per quest (ledger enforces idempotence), belt-and-suspenders check at hook level; per-quest thresholds deferred to a follow-up.
- [Chromecast cast safety](./issues/08-chromecast-cast-safety.md) — receiver is a multi-mode mirror picking from `WorkbenchDisplayState.mode`; sender-side resolver returns only `'active'`/`'idle'` for wall-clock-only; receiver's `'preview'` and `'review'` branches are deletable; the canvas-editor unification is sender-local and needs no cast-side change, but the cast bridge must not be gated on the editor panel mode while the fullscreen modal is mounted. Asset: [docs/cast-research/chromecast-wallclock-mirror.md](../../docs/cast-research/chromecast-wallclock-mirror.md).
- [Wiring the accomplishment trigger](./issues/05-wiring-accomplishment-trigger.md) — implementation plan: new `useCompletionChallenge` hook (sibling to `useSyntaxChallenge`) reads `runtime.fullscreen`, calls `markComplete` on `kind: 'review'` + `results.completed === true`; `useSyntaxChallenge` filters `workout-complete` before `validateScriptBlock`; validator file stays untouched. ~1.5 person-days. Plan: [wiring plan asset](./assets/05-wiring-plan.md).
- [Test & mock sweep](./issues/06-test-and-mock-sweep.md) — deletion is contained to one test scenario in `MarkdownCanvasPage.test.tsx` (line 277) plus two mocks; no unit tests for `useCanvasRuntime`/`useMobileRunOverride`, no Storybook stories, no e2e specs touch the canvas-editor launch surface. Sweep: [research asset](./assets/06-test-mock-sweep.md).
- [Run fullscreen button fate](./issues/07-run-fullscreen-button-fate.md) — collapse the launch surface to a single primary "Run" (or "Reconnect") button; the secondary "Run fullscreen" button is removed entirely from `SectionButtons.tsx` and `ViewPanelButtons.tsx`; delete `runState.onFullscreen` and related route navigation from `useCanvasRuntime.ts`.

## Not yet specified

- Cast safety risk for the unified fullscreen surface — see [Chromecast cast safety](./issues/08-chromecast-cast-safety.md) for the resolved constraint set; remaining concern is the editor panel-mode gate on the cast bridge during the fullscreen modal (flagged in the ticket's hand-off note).
- Storybook / catalog coverage for the unified fullscreen surface — a follow-up story under `stories/catalog/` exercising the new handoff.

## Out of scope

<!-- scope-boundary rulings; closed tickets linked here -->