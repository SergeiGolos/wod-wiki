# State Transitions — Clock & User-Driven

## Clock-Driven Transitions

### 🟢 Exact Boundary Expiry

```wod
1:00 Row
```

| Step | Action | Clock | Stack | Expect |
|------|--------|-------|-------|--------|
| 1 | `userNext` | 0ms | Timer | running |
| 2 | `advanceClock(60_000)` | 60,000ms | — | expires at **exactly** boundary, no overshoot |

---

### 🟢 Past-Boundary Expiry

```wod
1:00 Row
```

| Step | Action | Clock | Stack | Expect |
|------|--------|-------|-------|--------|
| 1 | `userNext` | 0ms | Timer | running |
| 2 | `advanceClock(75_000)` | 75,000ms | — | expires, no error from overshooting by 15s |

---

### 🟢 Incremental vs. Bulk Advance

```wod
1:00 Row
```

**Test A — 10 small advances:**

| Advances | Total | Expect |
|----------|-------|--------|
| 10 × `advanceClock(6_000)` | 60,000ms | timer expires after 10th advance |

**Test B — 1 bulk advance:**

| Advances | Total | Expect |
|----------|-------|--------|
| 1 × `advanceClock(60_000)` | 60,000ms | identical outcome to Test A |

**Assert:** both paths produce same stack state, same outputs.

---

### 🔴 Pause / Resume (`.skip`)

```wod
5:00 Run
```

| Step | Action | Clock | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | 0ms | timer running |
| 2 | `advanceClock(120_000)` | 120s | elapsed = 120s |
| 3 | `simulateEvent('pause')` | 120s | timer paused |
| 4 | `advanceClock(60_000)` | 180s | elapsed **still** 120s (paused) |
| 5 | `simulateEvent('resume')` | 180s | timer resumes |
| 6 | `advanceClock(180_000)` | 360s | elapsed = 300s → expires |

---

## User-Driven Transitions

### 🟢 `userNext` on Effort → Parent Pushes Next Child

```wod
(2)
  10 Pullups
  15 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort("Pullups") | child 1 |
| 2 | `userNext` | Rounds · Effort("Pushups") | **parent auto-pushes** next child |

---

### 🟢 `userNext` on Last Child → Round Increments

```wod
(3)
  10 Pullups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Rounds · Effort | R1 |
| 2 | `userNext` | Rounds · Effort | R2 — child re-pushed, round counter +1 |
| 3 | `userNext` | Rounds · Effort | R3 |
| 4 | `userNext` | — | rounds exhausted, done |

---

### 🟢 `userNext` on Empty Stack — Graceful No-Op

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | run to completion | — | stack empty |
| 1 | `userNext` | — | **no crash**, no error, depth stays 0 |

---

### 🟢 Rapid Double `userNext`

```wod
10 Pullups
15 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | Effort("Pullups") | — |
| 2 | `userNext` | Effort("Pushups") | first pops, second pushes |
| 3 | `userNext` immediately | — | no duplicate pop, clean termination |
