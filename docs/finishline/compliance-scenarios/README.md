# Runtime Compliance — Test Scenarios

Scenario docs for the `tests/runtime-compliance/` suite. Each doc covers one block type or behavior, with sample WODs and expected state at each step.

| Doc | Coverage | Phase |
|-----|----------|-------|
| [effort.md](effort.md) | Single efforts, weights, bodyweight | 2 |
| [timer.md](timer.md) | Countdown, short format, auto-completion | 2 |
| [rounds.md](rounds.md) | Fixed rounds, rep schemes, loops | 2 |
| [rest.md](rest.md) | Timed rest, rest in loops | 2 |
| [amrap.md](amrap.md) | AMRAP lifecycle and timer expiry | 3 |
| [emom.md](emom.md) | EMOM interval cycling | 3 |
| [for-time.md](for-time.md) | For Time with rep schemes | 3 |
| [nesting.md](nesting.md) | Nested and sequential structures | 4 |
| [metric-inheritance.md](metric-inheritance.md) | Weight/rep cascading and overrides | 5 |
| [state-transitions.md](state-transitions.md) | Clock and user-driven transitions | 6 |
| [session-lifecycle.md](session-lifecycle.md) | Full session start-to-finish | 6 |
| [output-statements.md](output-statements.md) | Output pairing and stack levels | 7 |

**Legend for state tables:**

- **Stack** — blocks on the runtime stack, top-first
- **Action** — what triggers the transition (`userNext`, `advanceClock`, `mount`)
- **Expect** — assertions to verify
- 🟢 passing scenario, 🔴 `.skip` (edge case, not yet implemented)
