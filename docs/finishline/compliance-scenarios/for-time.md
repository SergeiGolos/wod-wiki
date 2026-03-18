# For Time Scenarios

## 🟢 Single Movement

```wod
30 Clean & Jerk 135lb
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort | effort mounted |
| 2 | `userNext` | — | effort pops, session ends |

**Assert:** no timer involved. Purely user-driven. Metrics include `135lb`.

---

## 🟢 Multi-Movement with Rep Scheme

```wod
21-15-9 For Time
  Thrusters 95 lb
  Pull-ups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | Rounds · Effort("Thrusters") | R1 (21 reps), child 1 |
| 2 | `userNext` | Rounds · Effort("Pull-ups") | R1, child 2 |
| 3 | `userNext` | Rounds · Effort("Thrusters") | R2 (15 reps), child 1 |
| 4 | `userNext` | Rounds · Effort("Pull-ups") | R2, child 2 |
| 5 | `userNext` | Rounds · Effort("Thrusters") | R3 (9 reps), child 1 |
| 6 | `userNext` | Rounds · Effort("Pull-ups") | R3, child 2 |
| 7 | `userNext` | — | 3 rounds × 2 children = 6 pushes, session ends |

**Assert:** rep count changes per round (21 → 15 → 9). Total outputs paired.

---

## 🟢 Classic "Fran"

```wod
21-15-9
  Thrusters 95 lb
  Pull-ups
```

Same as above but without explicit "For Time" keyword — should compile identically.

---

## 🟡 For Time with Skippable Rest

A rest period between movements can be skipped early by the athlete if they recover quickly.

```wod
  21 Thrusters 95 lb
  :30 Rest
  21 Pull-ups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort("Thrusters") | effort 1 mounted |
| 2 | `userNext` | SessionRoot · Rest(":30") | rest starts |
| 3a | `userNext` _(skip)_ | SessionRoot · Effort("Pull-ups") | rest dismissed, `completionReason = 'user-advance'` |
| 3b | `advanceClock(30_000)` _(wait)_ | SessionRoot · Effort("Pull-ups") | rest expires, `completionReason = 'timer-expiry'` |
| 4 | `userNext` | — | effort 2 done, session ends |

**Assert:** total elapsed time reflects actual time spent (rest may be shorter if skipped).

---

## 🔴 For Time with Forced Rest (Cannot Skip)

When a coach mandates minimum recovery, prefix the rest with `*`. The athlete cannot advance until the timer fires.

```wod
  21 Thrusters 95 lb
  *:30 Rest
  21 Pull-ups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort("Thrusters") | effort 1 mounted |
| 2 | `userNext` | SessionRoot · Rest("*:30") | **forced** rest starts |
| 3 | `userNext` _(attempt skip)_ | SessionRoot · Rest("*:30") | **no-op** — block stays |
| 4 | `advanceClock(30_000)` | SessionRoot · Effort("Pull-ups") | timer fires → rest auto-pops → effort 2 |
| 5 | `userNext` | — | session ends |

**Assert:** `completionReason = 'timer-expiry'` on rest; `'user-advance'` is never emitted.
