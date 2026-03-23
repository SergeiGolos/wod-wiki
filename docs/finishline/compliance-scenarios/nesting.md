# Nesting & Sequential Scenarios

## 🟢 Rounds Containing Timed Exercise

```wod
(3)
  5:00 Run
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Timer("Run") | R1: timer starts (5:00) |
| 2 | `advanceClock(300_000)` | Rounds · Timer("Run") | R1 expires → R2 timer auto-starts |
| 3 | `advanceClock(300_000)` | Rounds · Timer("Run") | R2 expires → R3 |
| 4 | `advanceClock(300_000)` | — | R3 expires → session ends |

**Assert:** 3 timer cycles, no `userNext` needed after initial start. Total time = 15:00.

---

## 🟢 Sequential Mixed Types

```wod
10 Pullups
5:00 Run
1:00 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Effort("Pullups") | effort |
| 2 | `userNext` | SessionRoot · Timer("Run") | timer starts |
| 3 | `advanceClock(300_000)` | SessionRoot · Rest | timer expires, rest auto-pushed |
| 4 | `advanceClock(60_000)` | — | rest expires, session ends |

**Assert:** three different block types in sequence, each with correct transition behavior.

---

## 🟢 Effort → AMRAP → Effort

```wod
10 Pullups
2:00 AMRAP
  5 Burpees
20 Air Squats
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Effort("Pullups") | — |
| 2 | `userNext` | SessionRoot · AMRAP · Effort("Burpees") | AMRAP starts, 2:00 timer |
| 3 | `userNext` | SessionRoot · AMRAP · Effort("Burpees") | round 2 |
| 4 | `advanceClock(120_000)` | SessionRoot · Effort("Squats") | AMRAP expires, next sibling pushed |
| 5 | `userNext` | — | session ends |

**Assert:** AMRAP is sandwiched between two efforts. Session continues after AMRAP expires.

---

## 🟢 EMOM Containing Rounds

```wod
(5) 1:00 EMOM
  (3)
    5 Pullups
```

| Expect |
|--------|
| Each minute: 3 rounds of `userNext` for Pullups |
| Timer expiry at 60s forces advancement regardless |
| 3-level stack: EMOM · Rounds · Effort |

---

## 🟢 AMRAP Inside For Time

```wod
21-15-9 For Time
  3:00 AMRAP
    10 Pushups
```

| Expect |
|--------|
| 3 rounds of For Time, each containing a 3:00 AMRAP |
| AMRAP auto-terminates at 3:00, then next round begins |
| 3+ nesting levels |

---

## 🟢 Back-to-Back AMRAPs

```wod
10:00 AMRAP
  5 Pullups
  10 Pushups
5:00 AMRAP
  3 Thrusters
```

| Expect |
|--------|
| First AMRAP runs 10:00, auto-terminates |
| Second AMRAP auto-starts, runs 5:00 |
| No user action required between the two |
