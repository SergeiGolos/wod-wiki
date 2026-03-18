# Metric Inheritance Scenarios

> These tests use `RuntimeTestBuilder` for isolated metric assertion.

## 🟢 Weight Cascading — Parent to Children

```wod
95 lb
(3)
  Clean & Jerk
```

| Block       | Metrics           | Expect                    |
| ----------- | ----------------- | ------------------------- |
| Rounds      | quantity: `95 lb` | defined at root           |
| Effort (R1) | quantity: `95 lb` | **inherited** from parent |
| Effort (R2) | quantity: `95 lb` | inherited                 |
| Effort (R3) | quantity: `95 lb` | inherited                 |

**Assert:** all child efforts carry `95 lb` without re-specifying.

---

## 🟢 Weight Override — Child Overrides Parent

```wod
95 lb
  Clean 135 lb
  Snatch
```

| Block | Metrics | Expect |
|-------|---------|--------|
| Group | quantity: `95 lb` | parent default |
| Effort("Clean") | quantity: `135 lb` | **overridden** — child wins |
| Effort("Snatch") | quantity: `95 lb` | **inherited** — no override |

**Assert:** override only affects the specific child, siblings still inherit parent.

---

## 🟢 Rep Scheme Promotion

```wod
(21-15-9)
  Thrusters
  Pull-ups
```

| Round | Child | Rep Count | Expect |
|-------|-------|-----------|--------|
| R1 | Thrusters | 21 | from sequence[0] |
| R1 | Pull-ups | 21 | same round, same count |
| R2 | Thrusters | 15 | from sequence[1] |
| R2 | Pull-ups | 15 | same round, same count |
| R3 | Thrusters | 9 | from sequence[2] |
| R3 | Pull-ups | 9 | same round, same count |

**Assert:** rep count from the sequence propagates to all children within each round.

---

## 🟢 Weight Inside AMRAP

```wod
10:00 AMRAP
  5 Thrusters 95 lb
  10 Pushups
```

| Block | Metrics | Expect |
|-------|---------|--------|
| Effort("Thrusters") | quantity: `95 lb`, reps: `5` | explicitly set |
| Effort("Pushups") | reps: `10`, no weight | no weight to inherit (sibling, not parent) |

**Assert:** weight on one sibling does NOT bleed to other siblings.

---

## 🔴 Distance Unit Inheritance (`.skip`)

```wod
400 m
(3)
  Run
```

| Expect |
|--------|
| Each child effort inherits `400 m` distance |

---

## 🔴 Three-Level Promotion (`.skip`)

```wod
75 kg
(5) 1:00 EMOM
  (3)
    Clean
```

| Expect |
|--------|
| Weight `75 kg` propagates: root → EMOM → Rounds → Effort |
| All `Clean` efforts at all nesting levels show `75 kg` |
