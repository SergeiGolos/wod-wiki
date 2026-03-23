# EMOM Scenarios

## 🟢 Basic EMOM — 3 Rounds

```wod
(3) :60 EMOM
  5 Pullups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · EMOM · Effort | R1: child pushed, 60s timer starts |
| 2 | `advanceClock(60_000)` | SessionRoot · EMOM · Effort | R1 timer expires → child auto-pops → **R2 auto-starts**, new child pushed |
| 3 | `advanceClock(60_000)` | SessionRoot · EMOM · Effort | R2 expires → R3 starts |
| 4 | `advanceClock(60_000)` | — | R3 expires → rounds exhausted → EMOM pops → session ends |

**Key behaviors:**
- `CountdownTimerBehavior` — 60s per round
- `RoundsEndBehavior` — detects when round count exhausted
- Timer expiry auto-pops child → advances round → pushes next child
- **No `userNext` needed during execution** — fully timer-driven

---

## 🟢 EMOM with Multiple Exercises

```wod
(5) 1:00 EMOM
  3 Thrusters
  5 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | EMOM · Effort("Thrusters") | R1, child 1 |
| 2 | `userNext` | EMOM · Effort("Pushups") | R1, child 2 (**user-driven within minute**) |
| 3 | `advanceClock(60_000)` | EMOM · Effort("Thrusters") | R1 timer expires → R2 child 1 pushed |
| 4 | `userNext` | EMOM · Effort("Pushups") | R2, child 2 |
| 5 | `advanceClock(60_000)` | EMOM · Effort("Thrusters") | R3 starts |
| … | repeat | … | … |
| N | `advanceClock(60_000)` | — | R5 expires, session ends |

**Assert:** within each minute, user must `next` through children. Timer expiry forces advancement regardless.

---

## 🟢 EMOM — Overrun Scenario

```wod
(3) :30 EMOM
  10 Heavy Deadlifts
```

| Expect |
|--------|
| If user hasn't called `next` before 30s expires, timer auto-pops the child |
| Round advances even if exercise not "completed" by user |
| No stuck state — timer is authoritative |
