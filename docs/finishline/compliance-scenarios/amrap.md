# AMRAP Scenarios

## 🟢 Classic AMRAP — "Cindy"

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```

| Step | Action                    | Stack                                   | Expect                                                              |
| ---- | ------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| 0    | `startSession`            | SessionRoot · WaitingToStart            | —                                                                   |
| 1    | `userNext`                | SessionRoot · AMRAP · Effort("Pullups") | AMRAP mounted, timer starts (20:00), first child pushed             |
| 2    | `userNext`                | SessionRoot · AMRAP · Effort("Pushups") | child 2                                                             |
| 3    | `userNext`                | SessionRoot · AMRAP · Effort("Squats")  | child 3                                                             |
| 4    | `userNext`                | SessionRoot · AMRAP · Effort("Pullups") | **round 2** — children cycle back                                   |
| 5    | `userNext`                | SessionRoot · AMRAP · Effort("Pushups") | continues cycling                                                   |
| …    | `userNext` × N            | …                                       | rounds keep incrementing                                            |
| N    | `advanceClock(1_200_000)` | —                                       | timer hits 20:00 → auto-clears children → AMRAP pops → session ends |

**Key behaviors:**
- `CountdownTimerBehavior` — manages 20:00 countdown
- `ChildSelectionBehavior` — cycles through children
- `ReEntryBehavior` — loops back to first child after last
- Timer expiry clears children → forces pop chain → **no `userNext` needed to end**

---

## 🟢 Short AMRAP

```wod
2:00 AMRAP
  5 Burpees
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | AMRAP · Effort | child pushed |
| 2 | `userNext` | AMRAP · Effort | round 2 |
| 3 | `advanceClock(120_000)` | — | 2:00 expiry, auto-terminate |

**Assert:** ≥ 2 rounds completed before expiry.

---

## 🟢 Single-Exercise AMRAP

```wod
10:00 AMRAP
  1 Snatch
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 1 | `userNext` | AMRAP · Effort | round 1 |
| 2 | `userNext` | AMRAP · Effort | round 2 (same child re-pushed) |
| N | `advanceClock(600_000)` | — | timer expires |

**Assert:** single child loops correctly; no index-out-of-bounds on child rotation.

---

## � AMRAP with `-` Sequential Grouping

Each `-` child is compiled into its own child group. Every `userNext` advances to the next individual child. The round counter increments only after **all** `-` children have been cycled through once.

```wod
20:00 AMRAP
  - 5 Pullups
  - 10 Pushups
  - 15 Air Squats
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · AMRAP · Effort("Pullups") | AMRAP starts, **round 1**, child 1 pushed |
| 2 | `userNext` | SessionRoot · AMRAP · Effort("Pushups") | child 2, round still 1 |
| 3 | `userNext` | SessionRoot · AMRAP · Effort("Squats") | child 3, round still 1 |
| 4 | `userNext` | SessionRoot · AMRAP · Effort("Pullups") | cycle complete → **round 2**, back to child 1 |
| 5 | `userNext` | SessionRoot · AMRAP · Effort("Pushups") | child 2, round 2 |
| 6 | `userNext` | SessionRoot · AMRAP · Effort("Squats") | child 3, round 2 |
| 7 | `userNext` | SessionRoot · AMRAP · Effort("Pullups") | cycle complete → **round 3** |
| N | `advanceClock(1_200_000)` | — | timer expires, AMRAP pops |

**Key behaviors:**
- 3 separate child groups → 3 `userNext` calls per round
- `ChildSelectionBehavior.advanceRound()` fires once per full cycle (after child 3 pops and childIndex wraps to 0)
- Behavior is **semantically identical** to the undecorated Cindy example; the `-` prefix makes the grouping intent explicit

**Assert:** `round` memory value equals `Math.floor(completedNextCount / 3)` at all times.

---

## 🟢 AMRAP with `+` Composed Grouping (Complex / Superset)

Lines prefixed with `+` are merged into a **single composite block** by the parser. One `userNext` advances through the entire composed group as an atomic unit. The round counter increments after that single composite block completes — one `userNext` = one round.

```wod
20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · AMRAP · Composed("Pullups + Pushups + Squats") | AMRAP starts, **round 1**, single composite block pushed |
| 2 | `userNext` | SessionRoot · AMRAP · Composed("Pullups + Pushups + Squats") | composite completes → **round 2**, block re-pushed |
| 3 | `userNext` | SessionRoot · AMRAP · Composed("Pullups + Pushups + Squats") | **round 3** |
| N | `advanceClock(1_200_000)` | — | timer expires, AMRAP pops |

**Key behaviors:**
- Parser folds all `+` lines into **one child group** with 3 source statements → compiler emits a single `Composed` block
- `ChildSelectionBehavior` sees only **one child group** → round advances after every single `userNext`
- Output splits the composite block's time proportionally across all source statements (rep-ratio split)

**Assert:**
- `children.length === 1` at compile time (one child group)
- `round` memory increments on every `userNext`
- Each `userNext` produces proportional segment outputs for all 3 exercises (Pullups, Pushups, Squats)

---


## 🟢 AMRAP with Skippable Rest Between Rounds

A plain timer child (`:30 Rest`) starts a countdown but **can be dismissed early** by `userNext`. This lets an athlete who finishes early start the next round immediately.

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  :30 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · AMRAP · Effort("Pullups") | AMRAP starts, **round 1** |
| 2 | `userNext` | SessionRoot · AMRAP · Effort("Pushups") | child 2 |
| 3 | `userNext` | SessionRoot · AMRAP · Rest(":30") | rest countdown starts (30 s) |
| 4a | `userNext` _(early skip)_ | SessionRoot · AMRAP · Effort("Pullups") | rest dismissed early → **round 2** begins |
| 4b | `advanceClock(30_000)` _(wait out)_ | SessionRoot · AMRAP · Effort("Pullups") | rest auto-completes on timer expiry → **round 2** begins |
| N | `advanceClock(1_200_000)` | — | AMRAP timer expires, session ends |

**Key behaviors:**
- `:30 Rest` is a regular `CountdownTimerBehavior` child with mode `complete-block`
- `userNext` on a skippable rest triggers `CompletedBlockPopBehavior` immediately — same as any other block
- Auto-pop path (4b) fires from the `timer:complete` event without any user input

**Assert:**
- Rest block is recorded in output with `completionReason = 'user-advance'` (skip) or `'timer-expiry'` (waited)
- Next child after rest is always child 1 (cycle wraps); round counter increments after rest pops

---

## 🟢 AMRAP with Forced Rest (Cannot Skip)

Prefixing a timer with `*` marks it as **required** — `userNext` is ignored while the countdown is active. The block only pops when the timer expires. This enforces minimum recovery time regardless of athlete readiness.

```wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  *:30 Rest
```

| Step | Action | Stack | Expect |
|------|--------|-------|--------|
| 0 | `startSession` | SessionRoot · WaitingToStart | — |
| 1 | `userNext` | SessionRoot · AMRAP · Effort("Pullups") | AMRAP starts, **round 1** |
| 2 | `userNext` | SessionRoot · AMRAP · Effort("Pushups") | child 2 |
| 3 | `userNext` | SessionRoot · AMRAP · Rest("*:30") | **forced** rest starts; `userNext` is suppressed |
| 4 | `userNext` _(attempt skip)_ | SessionRoot · AMRAP · Rest("*:30") | **no-op** — block stays on stack, timer continues |
| 5 | `advanceClock(30_000)` | SessionRoot · AMRAP · Effort("Pullups") | timer expires → rest auto-pops → **round 2** |
| N | `advanceClock(1_200_000)` | — | AMRAP timer expires, session ends |

**Syntax note:** The `*` prefix on any timer fragment marks the entire block as non-skippable. It applies to any timer-bearing line: `*:30 Rest`, `*1:00`, `*2:30 Recovery`, etc.

**Key behaviors:**
- Parser emits a `required: true` flag on the `DurationMetric` when the `*` prefix is present
- `RequiredTimerBehavior` (or a flag on `CountdownTimerBehavior`) intercepts `onNext()` and returns an empty action list — the event is swallowed
- Block only exits via `timer:complete` → `CompletedBlockPopBehavior`
- Sound cue at T-0 confirms forced pop to user

**Assert:**
- `userNext` during forced rest produces **zero stack changes** (stack depth unchanged)
- Rest output always has `completionReason = 'timer-expiry'`; `'user-advance'` is never set
- `round` increments only after timer fires, never due to `userNext` on rest block
