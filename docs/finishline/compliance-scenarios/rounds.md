# Rounds Scenarios

## 🟢 Fixed Rounds

```wod
(3)
  10 Pullups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Rounds · Effort | round 1, child pushed |
| 2 | `userNext` | SessionRoot · Rounds · Effort | round 2, child re-pushed |
| 3 | `userNext` | SessionRoot · Rounds · Effort | round 3, child re-pushed |
| 4 | `userNext` | — | rounds exhausted, session ends |

**Assert:** child was pushed exactly 3 times. Output count ≥ 6 (3 × segment+completion).

---

## 🟢 Rep Scheme Sequence

```wod
(21-15-9)
  Thrusters
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort | round 1: rep count = 21 |
| 2 | `userNext` | Rounds · Effort | round 2: rep count = 15 |
| 3 | `userNext` | Rounds · Effort | round 3: rep count = 9 |
| 4 | `userNext` | — | 3 rounds done, session ends |

**Assert:** each round's effort carries the correct rep count from the sequence.

---

## 🟢 Single Round

```wod
(1)
  10 Pullups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort | one pass |
| 2 | `userNext` | — | done immediately |

---

## 🟢 Rounds with Multiple Children

```wod
(3)
  10 Pullups
  15 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort("Pullups") | R1, child 1 |
| 2 | `userNext` | Rounds · Effort("Pushups") | R1, child 2 |
| 3 | `userNext` | Rounds · Effort("Pullups") | R2, child 1 |
| 4 | `userNext` | Rounds · Effort("Pushups") | R2, child 2 |
| 5 | `userNext` | Rounds · Effort("Pullups") | R3, child 1 |
| 6 | `userNext` | Rounds · Effort("Pushups") | R3, child 2 |
| 7 | `userNext` | — | 3 × 2 = 6 child pushes total |

---

## 🔴 Large Round Count (`.skip`)

```wod
(100)
  5 Burpees
```

| Expect |
|--------|
| Compiles without error |
| 100 iterations complete without memory issues |
| Performance: total execution < 500ms |

---

## 🟡 Rounds with Skippable Rest

A plain `:XX Rest` child can be dismissed early by `userNext`. Athletes who recover quickly can advance before the rest timer expires.

```wod
(3)
  10 Pullups
  15 Pushups
  :60 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort("Pullups") | R1, child 1 |
| 2 | `userNext` | Rounds · Effort("Pushups") | R1, child 2 |
| 3 | — | Rounds · Rest(":60") | rest auto-pushed |
| 4a | `userNext` _(skip)_ | Rounds · Effort("Pullups") | rest dismissed early → R2 |
| 4b | `advanceClock(60_000)` _(wait)_ | Rounds · Effort("Pullups") | rest expires → R2 |
| … | × 2 more rounds | … | … |
| N | `userNext` after R3 Pushups | Rounds · Rest(":60") | final rest |
| N+1 | _skip or wait_ | — | session ends |

**Assert:** rest `completionReason` is `'user-advance'` or `'timer-expiry'` depending on path taken.

---

## 🔴 Rounds with Forced Rest (Cannot Skip)

A `*:XX Rest` child enforces a minimum recovery period. `userNext` during the countdown is silently ignored.

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
| 3 | — | Rounds · Rest("*1:00") | **forced** rest auto-pushed |
| 4 | `userNext` _(attempt skip)_ | Rounds · Rest("*1:00") | **no-op** — stack unchanged |
| 5 | `advanceClock(60_000)` | Rounds · Effort("Pullups") | timer expires → R2 starts |
| 6–8 | same pattern | … | R2 complete, forced rest, R3 |
| 9 | `userNext` ×2 | Rounds · Rest("*1:00") | final forced rest |
| 10 | `advanceClock(60_000)` | — | session ends |

**Assert:** 3 rest outputs, all with `completionReason = 'timer-expiry'`. `userNext` during rest produces zero output events.
