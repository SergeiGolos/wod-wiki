# Timer Scenarios

## 🟢 Countdown Timer

```wod
5:00 Run
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Timer("5:00 Run") | timer starts, direction = `down` |
| 2 | `advanceClock(150_000)` | SessionRoot · Timer | mid-timer: elapsed ~150s, block still active |
| 3 | `advanceClock(150_000)` | — | timer expires at 300s, block auto-pops, session ends |

---

## 🟢 Short Timer (`:30` format)

```wod
:30 Plank
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Timer(":30 Plank") | timer = 30s |
| 2 | `advanceClock(30_000)` | — | auto-pops at 30s |

---

## 🟢 Timer — Exact Boundary

```wod
1:00 Row
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Timer | timer running |
| 2 | `advanceClock(60_000)` | — | expires at exactly 60s, no over-run |

---

## 🟢 Timer — Mid-Stream Check

```wod
2:00 Bike
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Timer | timer running |
| 2 | `advanceClock(60_000)` | SessionRoot · Timer | **still active**, elapsed = 60s |
| 3 | `advanceClock(60_000)` | — | expires at 120s |

---

## 🟢 Sequential Timers

```wod
5:00 Run
3:00 Row
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Timer("Run") | first timer starts |
| 2 | `advanceClock(300_000)` | SessionRoot · Timer("Row") | first expires, second auto-pushes |
| 3 | `advanceClock(180_000)` | — | second expires, session ends |

---

## � Timer — Normal (Skippable by Default)

All plain countdown timers can be dismissed early by `userNext`. The timer records however much time elapsed and closes with `completionReason = 'user-advance'`.

```wod
5:00 Run
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Timer("5:00 Run") | timer starts (5:00 countdown) |
| 2a | `userNext` _(early skip)_ | — | timer dismissed at current elapsed, `completionReason = 'user-advance'` |
| 2b | `advanceClock(300_000)` _(wait)_ | — | timer expires at 0:00, `completionReason = 'timer-expiry'` |

**Assert:** either path produces one output statement with elapsed time captured.

---

## 🔴 Forced Timer — Cannot Skip (`*` prefix)

Prefixing a timer with `*` makes it **required** — `userNext` is suppressed until the countdown reaches zero. Use this to enforce minimum work intervals, mandatory rest, or legally required holds.

```wod
*5:00 Run
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Timer("*5:00 Run") | **forced** timer starts |
| 2 | `userNext` _(attempt skip)_ | SessionRoot · Timer("*5:00 Run") | **no-op** — block stays, countdown continues |
| 3 | `advanceClock(300_000)` | — | timer expires → auto-pop, session ends |

**Syntax note:** `*` prefix applies to any timer format: `*:30`, `*1:00`, `*5:00 Run`, `*30:00 AMRAP`.

**Assert:**
- `userNext` during forced timer produces zero stack changes
- `completionReason` is always `'timer-expiry'`
- Parser sets `required: true` on the `DurationMetric`

---

## �🔴 Collectible Timer (`.skip`)

```wod
:? Sprint
```

| Step | Expect |
|------|--------|
| 1 | Timer starts with no fixed duration |
| 2 | `userNext` manually completes, captured time recorded |
