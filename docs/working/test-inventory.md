# Test Inventory — wod-wiki

Story 5 deliverable. Every test file in `tests/**` and `playground/src/**` is classified.

Classes:

- `KEEP-AS-BROWSER` — assertion is on pixels / DOM / route state. Test harness is the seam.
- `KEEP-AS-REACT` — React component / DOM assertions via React Testing Library.
- `ALREADY-PORTED` — already on the new TestScript builder / FakeRpcTransport seam.
- `REWRITE-ON-BUILDER` — assertion is on runtime/cast state; the new builder is the right fit.
- `OUT-OF-SCOPE` — pure-function / data / harness self-tests. The new seam does not help.
- `NEEDS-REVIEW` — uncertain; flagged for human review.

## Totals

- Total test files: **86**
- KEEP-AS-BROWSER: **2**
- KEEP-AS-REACT: **26**
- ALREADY-PORTED: **2**
- REWRITE-ON-BUILDER: **25**
- OUT-OF-SCOPE: **31**

## Inventory table

| File | LOC | Class | Why |
|------|-----|-------|-----|
| `playground/src/canvas/MarkdownCanvasPage.test.tsx` | 432 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/canvas/canvasRoutes.test.ts` | 26 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/canvas/parseCanvasMarkdown.test.ts` | 225 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/components/molecules/AttentionWidget.test.tsx` | 60 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/components/molecules/CanvasSection.test.tsx` | 152 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/components/molecules/CodeExampleWidget.test.tsx` | 96 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/components/molecules/SyntaxGroupWidget.test.tsx` | 44 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/hooks/useJournalZipProcessor.test.ts` | 167 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/hooks/usePlaygroundContent.test.ts` | 77 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/hooks/useShowPlaygrounds.test.ts` | 41 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/lib/effortYaml.test.ts` | 113 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/lib/routes.test.tsx` | 436 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/nav/panels/__tests__/CollectionsNavPanel.test.tsx` | 394 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/nav/panels/__tests__/EffortsNavPanel.test.tsx` | 380 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/nav/panels/__tests__/FeedsNavPanel.test.tsx` | 449 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/nav/panels/__tests__/JournalNavPanel.test.tsx` | 527 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/pages/PlaygroundRedirect.test.tsx` | 81 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/receiverBootLoader.test.ts` | 47 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/services/dateUtils.test.ts` | 38 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/services/journalEntryFlow.test.ts` | 624 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/services/journalWorkout.test.ts` | 325 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/services/paletteDataSources.test.ts` | 418 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/services/parseJournalDate.test.ts` | 25 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/templates/defaultPlaygroundContent.test.ts` | 14 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/views/ListViews.test.tsx` | 185 | KEEP-AS-REACT | RTL component / DOM assertions |
| `playground/src/views/queriable-list/JournalDateScroll.test.tsx` | 113 | KEEP-AS-REACT | RTL component / DOM assertions |
| `tests/analytics/analytics-contract.test.ts` | 123 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/analytics/effort-registry-crud-analytics.test.ts` | 277 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/analytics/processor-split-validation.test.ts` | 360 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/analytics/two-pass-effort-resolution.test.ts` | 252 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/blocks/AmrapBlock.test.ts` | 55 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/EffortBlock.test.ts` | 51 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/GroupBlock.test.ts` | 43 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/IntervalBlock.test.ts` | 34 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/RoundsBlock.test.ts` | 60 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/TimerBlock.test.ts` | 67 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/root-block/RootBlock.basics.test.ts` | 99 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/root-block/RootBlock.children.test.ts` | 258 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/root-block/RootBlock.integration.test.ts` | 371 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/blocks/root-block/RootBlock.lifecycle.test.ts` | 266 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/canvas/home-feature-markdown.test.tsx` | 38 | KEEP-AS-BROWSER | Puppeteer / DOM assertion |
| `tests/canvas/syntax-source-markdown.test.ts` | 174 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/cast-integration/cast-roundtrip.test.ts` | 183 | ALREADY-PORTED | Cast integration test, on FakeRpcTransport; expand rather than rewrite |
| `tests/harness/__tests__/BehaviorTestHarness.test.ts` | 171 | OUT-OF-SCOPE | Harness self-test |
| `tests/harness/__tests__/MockBlock.test.ts` | 75 | OUT-OF-SCOPE | Harness self-test |
| `tests/harness/__tests__/RuntimeTestBuilder.test.ts` | 55 | OUT-OF-SCOPE | Harness self-test |
| `tests/jit-compilation/amrap.test.ts` | 105 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/clear-children.test.ts` | 167 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/emom.test.ts` | 79 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/fixed-round-loop.test.ts` | 100 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/for-time-rep-scheme.test.ts` | 86 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/for-time-single.test.ts` | 155 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/grouped_statements.test.ts` | 112 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/jit-compilation/loop-with-rest.test.ts` | 118 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/rep-scheme-inheritance.test.ts` | 86 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/jit-compilation/sequential-timers.test.ts` | 119 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/language-compilation/parser-integration.test.ts` | 86 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/language-compilation/statement-ids.test.ts` | 84 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/language-compilation/syntax_features.test.ts` | 250 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/language-compilation/whiteboard-script-parsing.test.ts` | 76 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/lifecycle/ClockPropagation.test.ts` | 160 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/lifecycle/LifecyclePhases.test.ts` | 69 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/lifecycle/MountBehavior.test.ts` | 50 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/lifecycle/NextBehavior.test.ts` | 37 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/lifecycle/SnapshotClock.test.ts` | 224 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/lifecycle/UnmountBehavior.test.ts` | 38 | REWRITE-ON-BUILDER | Lifecycle test |
| `tests/panels/review-panel-chromecast.test.ts` | 117 | KEEP-AS-BROWSER | Puppeteer / DOM assertion |
| `tests/parser/lezer-tree-inspect.test.ts` | 27 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/parser/lezer-whiteboardscript.test.ts` | 171 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/parser/unit-flexibility.test.ts` | 50 | OUT-OF-SCOPE | Pure-function / data test |
| `tests/playground/effort-routes.test.ts` | 74 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/runtime-compliance/amrap.compliance.test.ts` | 752 | REWRITE-ON-BUILDER | Compliance test |
| `tests/runtime-compliance/effort.compliance.test.ts` | 522 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/runtime-compliance/emom.compliance.test.ts` | 211 | REWRITE-ON-BUILDER | Compliance test |
| `tests/runtime-compliance/for-time.compliance.test.ts` | 522 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/runtime-compliance/metric-inheritance.compliance.test.ts` | 598 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/runtime-compliance/rest.compliance.test.ts` | 421 | REWRITE-ON-BUILDER | Compliance test |
| `tests/runtime-compliance/rounds.compliance.test.ts` | 361 | REWRITE-ON-BUILDER | Compliance test |
| `tests/runtime-compliance/session-lifecycle.compliance.test.ts` | 304 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/runtime-compliance/state-transitions.compliance.test.ts` | 314 | ALREADY-PORTED | Compliance test |
| `tests/runtime-compliance/timer.compliance.test.ts` | 423 | OUT-OF-SCOPE | No runtime/cast imports — pure strategy/data test |
| `tests/strategies/AmrapLogicStrategy.integration.test.ts` | 36 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/strategies/AmrapLogicStrategy.test.ts` | 24 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/strategies/EffortFallbackStrategy.test.ts` | 22 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/strategies/IntervalLogicStrategy.test.ts` | 25 | REWRITE-ON-BUILDER | Test exercises runtime/cast state |
| `tests/wods/all-wods.test.ts` | 106 | OUT-OF-SCOPE | Pure-function / data test |

## What gets ported, and to where

Worklist for the next session, in priority order:

1. **runtime-compliance/** — the 8 unported files. Highest leverage; the plan calls for them to converge on the new builder.
2. **lifecycle/** — replace BehaviorTestHarness with TestScript where the tests are full-runtime. Keep slim MockBlock tests as-is.
3. **blocks/**, **strategies/**, **jit-compilation/**, **analytics/** — mechanical replace of session-test-utils with TestScript.
4. **cast-integration/** — already on FakeRpcTransport; expand the existing test for full-scale coverage.

## What is NOT rewritten

- Parser / language-compilation / wods — pure functions, no runtime seam.
- tests/harness — meta-tests of the test infrastructure itself.
- playground/src — RTL is the seam; rewriting loses the test.
- canvas / panels — DOM/React Testing Library is the assertion.

## Verification

A full-scale integration test — script → runtime → cast → back, in a single `TestScript`
run, asserting on both ends — sits alongside the compliance suite. Story 2 already proved
the cast surface; the next incremental is a multi-block script that exercises the full path.
