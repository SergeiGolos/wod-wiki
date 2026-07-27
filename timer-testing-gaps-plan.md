# Plan: Close Timer Testing Gaps

## Goal
Fix the known mixed-timers runtime bug, assert sound/label/output contracts, document the discovered timer semantics, and bring all timer/protocol markdown fixtures under runtime verification.

## Tasks

### Phase 1 — Fix Mixed-Timers Runtime Bug

- [ ] **1. Reproduce the invalid-state failure**
  - Run `5:00 Run / 10 Burpees / *:30 Rest / :? Max Effort Pushups` through `TestScript`
  - Capture the exact stack state when `next()` after forced rest throws
  - Verify: Failing test exists in `tests/runtime-compliance/mixed-timers.compliance.test.ts`

- [ ] **2. Diagnose root cause**
  - Trace whether the bug is in `RestBlockBehavior`, `ExitBehavior` with `onEvents: ['timer:complete']`, or `WaitingToStartInjectorBehavior`
  - Check if the forced-rest block leaves the stack in a state where the next statement cannot mount
  - Verify: One-line root-cause note is added as a comment above the failing test

- [ ] **3. Fix the state transition**
  - Apply the smallest safe change (likely in `RestBlockBehavior`, `ExitBehavior`, or `WaitingToStartInjectorBehavior`)
  - Ensure the fix does not regress existing timer, rest, or effort compliance tests
  - Verify: `npx bun test tests/runtime-compliance/mixed-timers.compliance.test.ts` passes
  - Verify: `npx bun test tests/runtime-compliance/timer.compliance.test.ts tests/runtime-compliance/rest.compliance.test.ts tests/runtime-compliance/effort.compliance.test.ts` still passes

### Phase 2 — Assert Output Contracts

- [ ] **4. Add sound-cue output assertions**
  - Extend existing timer compliance tests (`timer.compliance.test.ts`, `amrap.compliance.test.ts`, `emom.compliance.test.ts`) to assert `SoundMetric` outputs on mount, countdown (3-2-1), and completion
  - Use `assertions(snapshot).outputs().all()` and filter for `metricType === 'Sound'`
  - Verify: At least one new assertion exists per protocol (countdown, AMRAP, EMOM)

- [ ] **5. Add timer label/display assertions**
  - Assert that `current.label` and block display memory contain expected text for:
    - `5:00 Run` → label includes "Run" and countdown display
    - `^5:00 Row` → label includes "Row" and elapsed display
    - `:? Sprint` → label includes "Sprint" and elapsed display
  - Verify: New assertions pass in `timer.compliance.test.ts`, `countup.compliance.test.ts`, `collectible.compliance.test.ts`

- [ ] **6. Add JIT tests for forced timers (`*`)**
  - Test `*5:00 Run` and `*:30 Rest` produce paired outputs and require timer completion before `next()` advances
  - Verify: New file `tests/jit-compilation/forced-timer.test.ts` passes

### Phase 3 — Document Discovered Semantics

- [ ] **7. Document open EMOM default rounds**
  - Add a paragraph to `docs/02-syntax-reference.md` stating that `:60 EMOM` (no explicit round count) defaults to 10 rounds in the current runtime
  - Verify: Text appears in the EMOM or timer section and is grep-able as "open EMOM"

- [ ] **8. Document parenthesized protocol AST**
  - Add a parser-level note to `docs/02-syntax-reference.md` explaining that `10:00 (EMOM)` parses as `Duration + Rounds("EMOM")` rather than `Duration + Effort`
  - Include the rationale (rounds keyword is extracted into a Rounds metric)
  - Verify: Text appears and an inline example matches the actual AST shape

### Phase 4 — Fixture Coverage

- [ ] **9. Parameterize canvas-syntax fixture compilation**
  - In `tests/canvas/syntax-source-markdown.test.ts`, add a parameterized describe block that compiles every `.md` under `markdown/canvas/syntax/` whose frontmatter `section` is `timers` or `protocols`
  - Assert that `TestScript.compile(firstBlock)` produces a session with `depth >= 2` after `next()` and can be run to completion without runtime errors
  - Verify: New test block runs and passes for all timer/protocol fixtures

### Phase 5 — Verification

- [ ] **10. Run the full timer/protocol test suite**
  - Run: `npx bun test tests/parser-compliance/ tests/runtime-compliance/ tests/jit-compilation/ tests/canvas/syntax-source-markdown.test.ts`
  - Verify: No new failures are introduced by this plan's changes (pre-existing unrelated failures are allowed)

## Done When

- [ ] `mixed-timers.md` fixture runs end-to-end without "Invalid runtime state"
- [ ] SoundMetric outputs are asserted in existing timer compliance tests
- [ ] Timer labels/display memory are asserted for countdown, count-up, and collectible timers
- [ ] Forced-timer JIT tests exist and pass
- [ ] Open EMOM and parenthesized-protocol semantics are documented in `docs/02-syntax-reference.md`
- [ ] All timer/protocol syntax fixtures are compiled and run to completion in CI
- [ ] Full suite run shows zero new failures compared to baseline

## Risks & Notes

- The mixed-timers bug may be a symptom of a broader `ExitBehavior` / `WaitingToStartInjectorBehavior` interaction; if the fix requires a larger refactor, split it into a separate follow-up plan.
- Sound cues are currently emitted as system outputs; if the output schema changes, the assertions need only filter by `metricType === 'Sound'`.
- The parenthesized protocol AST shape is a parser contract; changing it would affect `IntervalLogicStrategy` and `AmrapLogicStrategy` matchers. Document first, normalize later if desired.
