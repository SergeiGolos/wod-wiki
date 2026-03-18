# Rest Scenarios

## 🟢 Timed Rest (standalone)

```wod
1:00 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Rest | rest timer starts, 60s |
| 2 | `advanceClock(60_000)` | — | auto-completes at 60s, session ends |

**Assert:** no `userNext` needed — rest auto-pops on timer expiry.

---

## 🟢 Rest Between Efforts in a Loop

```wod
(3)
  10 Pullups
  15 Pushups
  1:00 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort("Pullups") | R1, child 1 |
| 2 | `userNext` | Rounds · Effort("Pushups") | R1, child 2 |
| 3 | — | Rounds · Rest | R1, rest auto-pushed |
| 3a | `advanceClock(60_000)` | Rounds · Effort("Pullups") | rest expires → R2 starts |
| 4 | `userNext` | Rounds · Effort("Pushups") | R2, child 2 |
| 5 | — | Rounds · Rest | R2, rest |
| 5a | `advanceClock(60_000)` | Rounds · Effort("Pullups") | R3 starts |
| 6 | `userNext` | Rounds · Effort("Pushups") | R3, child 2 |
| 7 | — | Rounds · Rest | R3, rest |
| 7a | `advanceClock(60_000)` | — | final rest expires, session ends |

**Assert:** 3 rounds × (2 `userNext` + 1 `advanceClock`). Outputs ≥ 20.

---

## � Timed Rest — Skip vs. Wait (Skippable)

A plain timed rest (no `*` prefix) can be ended by `userNext` before the countdown expires. Both paths produce a rest output statement; only the `completionReason` differs.

```wod
:30 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Rest | rest timer starts (30s) |
| 2a | `userNext` _(early)_ | — | rest dismissed, `completionReason = 'user-advance'` |
| 2b | `advanceClock(30_000)` _(wait)_ | — | rest expires, `completionReason = 'timer-expiry'` |

**Assert:** stack empties via either path; output contains exactly one rest segment.

---

## 🔴 Forced Timed Rest — Cannot Skip (`*` prefix)

Prefixing any timer with `*` makes it **required**. `userNext` is silently ignored while the countdown is active. The block only exits when the timer fires.

```wod
*:30 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Rest("*:30") | **forced** rest starts |
| 2 | `userNext` _(attempt skip)_ | SessionRoot · Rest("*:30") | **no-op** — block stays, timer continues |
| 3 | `advanceClock(30_000)` | — | timer expires → auto-pop, session ends |

**Syntax note:** `*` applies to any timer: `*:30`, `*1:00`, `*2:30 Recovery`, `*30:00`.

**Assert:**
- Multiple `userNext` calls during forced rest all produce zero stack changes
- `completionReason` is always `'timer-expiry'`; `'user-advance'` is never emitted
- Parser sets `required: true` on the `DurationMetric`; runtime honors it via behavior intercept

---

## 🟡 Forced Rest in a Loop

Forced rest inside a rounds block means athletes must wait out every rest period — no fast cycling through rounds.

```wod
(3)
  10 Pullups
  15 Pushups
  *1:00 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort("Pullups") | R1, child 1 |
| 2 | `userNext` | Rounds · Effort("Pushups") | R1, child 2 |
| 3 | — | Rounds · Rest("*1:00") | forced rest auto-pushed |
| 4 | `userNext` _(attempt)_ | Rounds · Rest("*1:00") | **no-op** |
| 5 | `advanceClock(60_000)` | Rounds · Effort("Pullups") | rest expires → R2 starts |
| 6 | `userNext` | Rounds · Effort("Pushups") | R2, child 2 |
| 7 | — | Rounds · Rest("*1:00") | forced rest |
| 8 | `advanceClock(60_000)` | Rounds · Effort("Pullups") | R3 starts |
| 9 | `userNext` | Rounds · Effort("Pushups") | R3, child 2 |
| 10 | — | Rounds · Rest("*1:00") | final rest |
| 11 | `advanceClock(60_000)` | — | session ends |

**Assert:** 3 forced rests recorded, all with `completionReason = 'timer-expiry'`.

---

## �🔴 Short Rest Modifier (`.skip`)

```wod
*:30
10 Pullups
```

| Expect |
|--------|
| `*:30` parsed as 30s rest before effort |
| Rest auto-completes then effort pushed |
