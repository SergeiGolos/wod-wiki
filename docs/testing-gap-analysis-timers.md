# Testing Gap Analysis: Timer & Time Patterns

This document captures the current state of test coverage for timer and time-related
patterns in the WOD Wiki runtime, after the focused backfill described below.

## Files Added in This Backfill

| File | Layer | Purpose |
|------|-------|---------|
| `tests/parser-compliance/timer-patterns.parse-then-run.integration.test.ts` | Parser → Runtime | Full lifecycle for previously parser-only patterns |
| `tests/parser-compliance/timer-patterns-advanced.parse-then-run.integration.test.ts` | Parser → Runtime | Full lifecycle for markdown fixture patterns |
| `tests/runtime-compliance/countup.compliance.test.ts` | Runtime | Count-up override (`^`) behavior |
| `tests/runtime-compliance/collectible.compliance.test.ts` | Runtime | Collectible metrics (`?`, `:?`) |
| `tests/runtime-compliance/tabata.compliance.test.ts` | Runtime | Tabata interval protocols |
| `tests/runtime-compliance/alternating-emom.compliance.test.ts` | Runtime | Alternating EMOM and open EMOM |
| `tests/runtime-compliance/timer-state-transitions.compliance.test.ts` | Runtime | Pause/resume/boundary for advanced timers |
| `tests/jit-compilation/countup-collectible.test.ts` | JIT / Outputs | Output-statement contract for new patterns |

## Coverage Matrix After Backfill

| Pattern | Parser | JIT | Runtime | State Transitions | Fixture Tested |
|---------|--------|-----|---------|-------------------|----------------|
| `5:00 Run` (countdown) | ✅ | ✅ | ✅ | ✅ | timers-1.md |
| `:30 Plank` (short) | ✅ | ❌ | ✅ | ❌ | timers-1.md |
| `1:30:00` (H:MM:SS) | ✅ | ❌ | ✅ (new) | ❌ | timers-1.md |
| `^5:00 Row` (count-up override) | ✅ | ✅ (new) | ✅ (new) | ✅ (new) | timers-2.md |
| `:? Sprint` (collectible timer) | ✅ | ✅ (new) | ✅ (new) | ✅ (new) | timers-3.md |
| `*5:00 Run` (forced timer) | ✅ | ❌ | ✅ | ❌ | timer-modifiers.md |
| `? Pushups` (collectible reps) | ✅ | ✅ (new) | ✅ (new) | ❌ | syntax_features |
| `10:00 ? KB Snatch 24kg` | ✅ | ✅ (new) | ✅ (new) | ❌ | syntax_features |
| `20:00 AMRAP` | ✅ | ✅ | ✅ | ❌ | classic-amrap.md |
| `20:00 (AMRAP)` | ✅ | ✅ (new) | ✅ (new) | ❌ | protocols-1.md |
| `10:00 (EMOM)` | ✅ | ✅ (new) | ✅ (new) | ❌ | protocols-2.md |
| `(3) :60 EMOM` | ✅ | ✅ | ✅ | ✅ (new) | basic-emom.md |
| `(3) :60 EMOM / - / -` (alternating) | ✅ | ❌ | ✅ (new) | ❌ | alternating-emom.md |
| `:60 EMOM` (open) | ✅ | ❌ | ✅ (new) | ❌ | — |
| `(8) :20 / :10 Rest` (Tabata) | ✅ | ❌ | ✅ (new) | ❌ | protocols-4.md |
| `(5) :40 / *:20 Rest` (custom intervals) | ✅ | ❌ | ✅ (new) | ❌ | custom-intervals.md |
| `(4) / 3:00 Run 800m / 2:00 Rest` | ✅ | ❌ | ✅ (new) | ❌ | distance-intervals.md |
| `20:00 / (21-15-9)` (time cap) | ✅ | ❌ | ✅ (new) | ❌ | time-cap.md |
| Multiple AMRAP windows | ✅ | ❌ | ✅ (new) | ❌ | multiple-amrap-windows.md |
| Mixed timers sequential | ✅ | ❌ | ❌ | ❌ | mixed-timers.md |

## Remaining Gaps (Post-Backfill)

### 🔴 High-Impact Gaps

1. **Forced timer (`*`) beyond rest**
   - `*5:00 Run` has runtime compliance but no JIT/output-statement test.
   - `*:30 Rest` in a sequential context (e.g. mixed-timers.md) has no runtime test.

2. **Mixed sequential timers**
   - `5:00 Run / 10 Burpees / *:30 Rest / :? Max Effort Pushups` parses cleanly but the
     runtime interaction between forced rest and the subsequent collectible timer is
     untested. Initial probing showed an "Invalid runtime state for next event" when
     advancing to the collectible timer after forced rest.

3. **Sound cue outputs**
   - `SoundCueBehavior` exists and is wired into `GenericTimerStrategy`, `AmrapLogicStrategy`,
     and `IntervalLogicStrategy`, but no test asserts that sound outputs are emitted at
     mount, countdown, or completion.

4. **Timer display memory / `LabelingBehavior`**
   - Labels for countdown, count-up, and interval timers are constructed but never
     asserted in compliance tests.

### 🟡 Medium-Impact Gaps

5. **Short timers (`:30`, `:20`, `:10`)**
   - Parser and Tabata tests exercise them, but no dedicated boundary/rounding test
     for sub-minute timers.

6. **Very long timers (`1:30:00`)**
   - New parse-then-run test covers expiry, but no JIT output test.

7. **Pause/resume for countdown timers in EMOM/AMRAP context**
   - Pause/resume is tested for standalone count-up timers and simple countdown timers,
     but not when the timer is the driver of an EMOM interval or AMRAP cap.

8. **Parenthesized protocol parser AST**
   - `10:00 (EMOM)` parses as `Duration + Rounds("EMOM")`, not `Duration + Effort`.
     This is surprising and should be documented or normalized; current tests only
     assert the runtime works.

9. **Collectible distance (`20:00 ?m Run`)**
   - Parser supports it; no runtime test verifies the distance metric is recorded.

10. **Rest block auto-generation from interval parents**
    - `RestBlockBehavior` and `RestBlockStrategy` are implemented but only unit-tested;
    the AMRAP/EMOM "exercises finished early, inject rest" path has no end-to-end test.

### 🟢 Low-Impact / Documentation Gaps

11. **Fixture coverage in `syntax-source-markdown.test.ts`**
    - Only 4 fixtures are compiled and asserted for block type. The remaining 67
      syntax markdowns are only parser-checked. A parameterized loop over all
      timer/protocol fixtures would close this gap cheaply.

12. **Behavior harness coverage**
    - `CountdownTimerBehavior` and `CountupTimerBehavior` have unit tests but do not
      cover span mutation edge cases (e.g., pause when already paused, resume when
      not paused, zero-duration countdown).

13. **Open EMOM semantics**
    - `:60 EMOM` without an explicit round count defaults to 10 rounds in the runtime.
      This is implementation-specific and should be documented or tested as a contract.

## Test-Running Notes

- All **new tests pass** (36 parser/JIT/runtime tests added in this backfill).
- Pre-existing failures in `metric-inheritance.compliance.test.ts`,
  `state-transitions.compliance.test.ts`, `for-time.compliance.test.ts`, and
  `rounds.compliance.test.ts (large count)` are **unrelated to timer patterns**.
- The `mixed-timers.md` fixture in particular exposes a runtime interaction bug
  between forced rest and collectible timers that warrants its own investigation.

## Recommended Next Steps

1. Add JIT tests for `*5:00 Run` and `*:30 Rest` to cover forced-timer output contract.
2. Investigate and fix the "Invalid runtime state" error in the mixed-timers sequence,
   then add a compliance test for it.
3. Add a parameterized canvas-syntax test that compiles every timer/protocol fixture
   and asserts a non-empty runtime stack after `next()`.
4. Add sound-cue output assertions to existing timer compliance tests.
5. Document the default 10-round behavior for open EMOM and the parenthesized-protocol
   AST shape.
