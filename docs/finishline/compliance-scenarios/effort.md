# Effort Scenarios

## 🟢 Single Effort

```wod
10 Pullups
```

| Step | Action | Stack (top→) | Expect |
|------|--------|-------------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | depth = 2 |
| 1 | `userNext` | SessionRoot · Effort("10 Pullups") | effort mounted, depth = 2 |
| 2 | `userNext` | — | effort pops, session ends, depth = 0 |

---

## 🟢 Effort with Weight

```wod
10 Clean & Jerk 135 lb
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort | metrics include quantity `135 lb` |
| 2 | `userNext` | — | clean termination |

---

## 🟢 Effort with Bodyweight

```wod
20 Pushups bw
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Effort | metrics include `bw` marker |
| 2 | `userNext` | — | clean termination |

---

## 🟢 Sequential Efforts (no nesting)

```wod
10 Pullups
15 Pushups
20 Air Squats
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort("Pullups") | first child pushed |
| 2 | `userNext` | SessionRoot · Effort("Pushups") | second child pushed |
| 3 | `userNext` | SessionRoot · Effort("Squats") | third child pushed |
| 4 | `userNext` | — | session ends, outputs ≥ 8 |

---

## 🔴 Effort with Distance (`.skip`)

```wod
400 m Run
```

| Step | Action     | Expect                           |
| ---- | ---------- | -------------------------------- |
| 1    | `userNext` | metrics include distance `400 m` |
| 2    | `userNext` | clean termination                |

---

## 🟢 Effort — `userNext` Is Always Skippable

A plain effort block (no timer prefix) is **always user-driven**. `userNext` immediately completes it regardless of how much time has elapsed. There is no concept of a minimum hold time on a bare effort.

```wod
10 Pullups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | SessionRoot · Effort | effort mounted |
| 2 | `userNext` _(any time)_ | — | effort pops immediately, no minimum enforced |

**Assert:** `completionReason = 'user-advance'` always.

---

## 🟡 Effort with Timed Rest After (Skippable)

A plain timer child (`:30 Rest`) auto-pops when its countdown expires **or** when the user calls `userNext` early. The rest is advisory — skipping is permitted.

```wod
10 Pullups
:30 Rest
10 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort("Pullups") | effort 1 mounted |
| 2 | `userNext` | SessionRoot · Rest(":30") | rest starts |
| 3a | `userNext` _(skip)_ | SessionRoot · Effort("Pushups") | rest dismissed early, effort 2 pushed |
| 3b | `advanceClock(30_000)` _(wait)_ | SessionRoot · Effort("Pushups") | rest auto-pops, effort 2 pushed |
| 4 | `userNext` | — | effort 2 done, session ends |

**Assert:** Rest `completionReason` is `'user-advance'` (skip) or `'timer-expiry'` (waited).

---

## 🔴 Effort with Forced Rest After (Cannot Skip)

Prefixing a rest timer with `*` marks it as **required**. `userNext` during the countdown is silently swallowed — the block can only exit when the timer expires.

```wod
10 Pullups
*:30 Rest
10 Pushups
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · Effort("Pullups") | effort 1 mounted |
| 2 | `userNext` | SessionRoot · Rest("*:30") | **forced** rest starts |
| 3 | `userNext` _(attempt skip)_ | SessionRoot · Rest("*:30") | **no-op** — stack unchanged |
| 4 | `advanceClock(30_000)` | SessionRoot · Effort("Pushups") | timer fires → rest auto-pops → effort 2 pushed |
| 5 | `userNext` | — | effort 2 done, session ends |

**Syntax note:** `*` prefix on any timer line (`*:30`, `*1:00`, `*2:00 Recovery`) makes it required.

**Assert:**
- `userNext` during forced rest produces zero stack changes
- Rest `completionReason` is always `'timer-expiry'`, never `'user-advance'`
