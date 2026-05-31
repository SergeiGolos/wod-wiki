# 02 — `wod` Block Syntax Reference

A workout file is plain Markdown. WOD Wiki only interprets the contents of fenced code
blocks tagged `wod`:

````markdown
## WOD

```wod
(10) :60 EMOM
  + 2 Burpees
  + 5 Push Ups
  + 7 Air Squats
```
````

Everything outside the fence (headings, prose, frontmatter, tables) is normal Markdown
and is preserved for display. This reference is grounded in the grammar
(`src/grammar/whiteboardscript.grammar`) and in the real workouts under `/markdown`.

---

## 1. The shape of a line

Inside a `wod` block, **each line is a Statement**. A statement is an optional **lap
marker** followed by one or more **fragments**:

```
[lap]  fragment  fragment  fragment …
```

**Indentation creates hierarchy.** A less-indented line is the parent; more-indented
lines beneath it are its children. This is how rounds wrap their movements:

```wod
(3)              ← parent: 3 rounds
  10 Air Squats  ← child
  10 Push Ups    ← child
```

---

## 2. Fragment types

Each fragment is recognized as one of these kinds. Multiple fragments combine on one
line.

| Fragment | Looks like | Meaning |
|----------|-----------|---------|
| **Duration** | `5:00`, `1:00`, `:60`, `:30` | A planned time target (timer). `:60` = 60s, `1:00` = 1 min |
| **Rounds** | `(3)`, `(10)` | Repeat the child block N times |
| **Rep scheme** | `(21-15-9)`, `(100-80-60-40-20)`, `(15-20)` | A sequence of round sizes / descending ladder |
| **Quantity (reps)** | `10`, `50` | A repetition count for the effort on the line |
| **Quantity (distance)** | `400m`, `1000m`, `0.5mile`, `1/4 mile`, `250m` | A distance with unit (`m`, `km`, `ft`, `mile`, `miles`) |
| **Quantity (load)** | `16kg`, `24kg`, `15lb`, `225lb`, `bw` | External resistance with unit (`kg`, `lb`, `bw` = bodyweight) |
| **Effort** | `Burpees`, `Double KB Clean & Jerk`, `Run` | The movement / exercise name (free text) |
| **Action** | `[:start]`, `[:rest]` | A control action token |
| **Metric object** | `{ rpe: 8, note: "felt strong" }` | Inline structured metric data |
| **Text / comment** | `// scale as needed` | A non-executing note |
| **Property** | `Category: zombie-fit` (outside fence too) | Key/value metadata for the block |

### Modifiers (single-character prefixes/suffixes)

| Symbol | Name | Effect |
|--------|------|--------|
| `+` | **lap (compose)** | Marks a line as part of a composed/superset group with its siblings (see "On the minute" EMOM example) |
| `-` | **lap** | Alternate lap marker |
| `@` | **at** | Prefixes a quantity, binding it as resistance/at-value |
| `?` | **placeholder** | An unknown/athlete-chosen value to be filled in (e.g. `10:00 ? KB Snatch 16kg`) |
| `:?` | **collectible timer** | A timer whose value is *collected* during execution rather than counted down (`100m Quadrupedal Movement :?`) |
| `^` | **trend** | Marks a value as a trend/progression target |
| `*` | **rest** | Marks a rest interval (used in Tabata-style `Quadrupedal Movement*`) |

---

## 3. Worked examples (from `/markdown`)

### Rounds wrapping movements

```wod
(3)
  10 Air Squats
  10 Push Ups
  10 Sit Ups
```
*Three rounds of the three movements.*

### EMOM (Every Minute On the Minute)

```wod
(10) :60 EMOM
  + 2 Burpees
  + 5 Push Ups
  + 7 Air Squats
```
*10 intervals of 60 seconds. Each minute, perform the composed (`+`) set. `EMOM` is a
keyword the CrossFit dialect recognizes.*

### AMRAP (As Many Rounds As Possible)

```wod
10:00 AMRAP
  5 Pull Ups
  10 Push Ups
  15 Air Squats
```
*A 10-minute clock; complete as many rounds of the child block as possible.*

### Descending rep ladder

```wod
(100-80-60-40-20)
  Double KB Swing 24kg
```
*Five rounds of decreasing reps: 100, then 80, … then 20.*

### Distance + interval intervals (swimming)

```wod
(8) Power Sprints
  25m Freestyle Sprint
  1:30 Rest
```
*8 rounds: a 25 m sprint then 90 s rest. `Power Sprints` is a label fragment on the
rounds line.*

### Load progression (kettlebell)

```wod
(5)
  8 KB Deadlift 16kg
  :30 Rest
```
*5 rounds of 8 reps at 16 kg, with 30 s rest between rounds.*

### Athlete-chosen value with placeholder

```wod
10:00 ? Double KB Clean & Jerk 24kg
```
*A 10-minute effort; the `?` marks the rep count as something the athlete fills in.*

### Choices / substitutions

```wod
Run 1/4 mile OR Bike 1/2 mile OR Row 250m
```
*Free-text efforts may include `OR` alternatives; they parse as effort text the runtime
can present as options.*

---

## 4. Block-level properties & frontmatter

Outside the fence, YAML-style frontmatter and `Key: Value` properties describe the
workout:

```markdown
---
Category: zombie-fit
Type: EMOM
Difficulty: Beginner
date: 2011-08-09
---
```

Inside a `wod` block, an `Identifier: value` line is parsed as a **Property** fragment
and becomes a `Custom`/property metric on the block.

---

## 5. Quick grammar summary

From `whiteboardscript.grammar` (simplified):

```
Program   → (Property | Block | newline)*
Block     → Lap? Fragment+ newline
Lap       → '-' | '+'
Fragment  → Duration | Rounds | Action | Text | Quantity | Effort | MetricObject
Duration  → (Trend '^' | Rest '*')? (CollectibleTimer ':?' | Timer)
Quantity  → '@'? ( ('?' | Number) (DistanceUnit | WeightUnit)? | (DistanceUnit | WeightUnit) )
Rounds    → '(' (Identifier | Sequence) ')'
Sequence  → Number ('-' Number)*
Action    → '[' ':' name ']'
Effort    → (Identifier | symbol | '-')+
Text      → '// …'
```

Units: distance `m | ft | mile | km | miles`; weight `kg | lb | bw`.

➡ How each fragment turns into a metric: [03 — Domain Model](./03-domain-model.md).
