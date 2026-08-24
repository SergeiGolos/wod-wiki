# Whiteboard Language Syntax Reference

A `time` block (or any recognized fence tag) is a sequence of **statements**. Each statement is one line of `[lap] fragment fragment …`, and indentation creates parent/child hierarchy.

## Basic statement

```time
10 Push Ups
```

This statement has:

- a **Rep** metric: `10`
- an **Effort** metric: `Push Ups`

The order of fragments on a line is flexible, but the canonical form is:

```text
[rounds] [duration] [reps] [effort] [load] [distance]
```

## Timers

| You write | It means |
| ----------- | ---------- |
| `5:00` | 5-minute countdown or target duration |
| `:30` | 30 seconds |
| `1:30` | 90 seconds |
| `:?` | Collectible timer — records elapsed, does not count down |

A line can be **just** a timer:

```time
5:00 AMRAP
  5 Pull Ups
```

## Rounds and rep ladders

| You write | It means |
| ----------- | ---------- |
| `(3)` | 3 rounds of children |
| `(3 Rounds)` | 3 rounds with a label |
| `(21-15-9)` | 3 rounds of 21, 15, and 9 reps |
| `(100-80-60-40-20)` | descending rep ladder |

```time
(3)
  10 Push Ups
  15 Air Squats
```

Rep ladders project their round size into child statements each round.

## Reps

Any bare integer is treated as reps unless fused with a unit.

```time
10 Burpees
```

## Distance

```time
400m Run
1000m Row
0.5mile Run
```

Supported units: `m`, `km`, `ft`, `mile`.

## Load / Resistance

```time
16kg KB Swing
225lb Back Squat
bw Pull Up
```

Supported units: `kg`, `lb`, `bw` (bodyweight), `pood`. `@` can also bind a load explicitly:

```time
5 Back Squat @225lb
```

## Rest

`*` marks rest. It can be combined with a duration:

```time
10 Burpees
*:30 Rest
10 Burpees
```

## Lap markers: `+` and `-`

- `+` composes siblings into the same interval/round.
- `-` marks a superset or alternate lap.

```time
(10) :60 EMOM
  + 2 Burpees
  + 5 Push Ups
  + 7 Air Squats
```

## Protocol keywords

The runtime recognizes keywords in **Action** or **Effort** text:

| Keyword | Meaning |
| --------- | --------- |
| `AMRAP` | As many rounds/reps as possible in the stated duration |
| `EMOM` | Every minute on the minute |
| `FOR TIME` | Complete the work as fast as possible |
| `TABATA` | 20s work / 10s rest intervals |
| `STRENGTH` | Heavy loaded block |
| `RUN`, `ROW`, `BIKE`, `SWIM` | Cardio modalities |

```time
10:00 AMRAP
  5 Pull Ups
  10 Push Ups
  15 Air Squats
```

## Choice groups

A pipe separates alternatives of the **same** metric type:

```time
10 Pull Ups | Chest-to-Bar Pull Ups
185/125 lb Deadlift
```

The first alternative is pre-selected. The runner resolves the choice before the clock starts.

## Comments

`//` creates a comment:

```time
10 Back Squat 225lb // last set heavy
```

## Custom metric objects

Curly braces attach arbitrary key/value pairs to a statement:

```time
5 Back Squat 225lb {"intensity": 80, "rpe": 8}
```

These become parser-owned `Custom` metrics.

## Hierarchical indentation

Indent children under a parent. Children inherit context (rounds, timer, AMRAP scope) from the parent.

```time
(4) Power Sprints
  25m Freestyle Sprint
  1:30 Rest

(6) IM Main Set
  100m IM
  :45 Rest

150m Cooldown
```

## Full example

```time
## Cindy

20:00 AMRAP
  5 Pull Ups
  10 Push Ups
  15 Air Squats
```

## Fence tags

The default runnable tag is `time` (alias `whiteboard`). Other tags such as `climb`, `cardio`, `yoga`, and `habits` activate specialized dialects. See [`03-dialects.md`](./03-dialects.md).

## Syntax gotchas

- The parser emits bare numbers and text; **dialects** turn `400m` into `Distance(400, m)`.
- A slash `/` between **different** metric types is dropped; a slash between the **same** type becomes a `Choice` metric.
- `?` marks an athlete-fillable value (`10:00 ? KB Snatch 16kg`).
