# Session Lifecycle Scenarios

## 🟢 Full Session — Start to Finish (Effort)

```wod
10 Pullups
```

| Step | Action | Stack | Outputs |
|------|--------|-------|---------|
| 0 | `startSession` | SessionRoot · WaitingToStart | segment(SessionRoot, L1) + segment(WaitingToStart, L2) |
| 1 | `userNext` | SessionRoot · Effort | completion(WaitingToStart, L2) + segment(Effort, L2) |
| 2 | `userNext` | — | completion(Effort, L2) + completion(SessionRoot, L1) |

**Assert:**
- Stack transitions: 2 → 2 → 0
- All outputs paired (segment + completion for each block)
- SessionRoot is first mounted, last completed

---

## 🟢 Full Session — Timer Auto-Complete

```wod
1:00 Row
```

| Step | Action | Stack | Outputs |
|------|--------|-------|---------|
| 0 | `startSession` | SessionRoot · WaitingToStart | 2 segments |
| 1 | `userNext` | SessionRoot · Timer | WaitingToStart completes, Timer segments |
| 2 | `advanceClock(60_000)` | — | Timer completes, SessionRoot completes |

**Assert:**
- No `userNext` needed to end — timer expiry cascades
- Final stack depth = 0
- `assertPairedOutputs()` passes

---

## 🟢 Full Session — Multi-Block

```wod
(3)
  10 Pullups
  15 Pushups
```

| Phase | Action | Stack depth | Running output count |
|-------|--------|-------------|---------------------|
| Start | `startSession` | 2 | 2 |
| Dismiss gate | `userNext` | 3 | 4 (gate completes, R1/child1 mounts) |
| R1 child 2 | `userNext` | 3 | 6 |
| R2 child 1 | `userNext` | 3 | 8 |
| R2 child 2 | `userNext` | 3 | 10 |
| R3 child 1 | `userNext` | 3 | 12 |
| R3 child 2 | `userNext` | 3 | 14 |
| End | `userNext` | 0 | ≥ 16 (rounds + session complete) |

**Assert:**
- Output count ≥ 16
- All outputs paired
- Stack empties cleanly

---

## 🔴 Early Termination / Abort (`.skip`)

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
```

| Step | Action | Expect |
|------|--------|--------|
| 1-3 | normal start, do 1 round | AMRAP running |
| 4 | `simulateEvent('abort')` | AMRAP force-pops |
| 5 | — | stack empties, all open segments get completion outputs |
| 6 | — | `assertPairedOutputs()` still passes |
