# Parent-Child Fragment/Metric Relationships in WODs

This document outlines various scenarios of parent-child relationships based on code fragments and their associated metrics within the WOD Wiki markdown syntax. These relationships define how workouts are structured and executed.

## Key Concepts

*   **Parent Fragments:** Typically define a block or a repeating structure (e.g., `RoundsFragment`, `TimerFragment` for an AMRAP).
*   **Child Fragments:** Represent individual exercises, actions, or timed efforts within a parent block (e.g., `EffortFragment`, `RepFragment`, `TimerFragment` for a hold).
*   **Lap Fragments (`+`, `-`):** Control how child statements are grouped and sequenced within a parent's iteration.
    *   `+` (Compose): Links subsequent statements to be performed as a single complex within the current round/lap.
    *   `-` (Round/Break): Marks the completion of a composed set of exercises, often signaling the end of a lap or round before moving to the next or a rest.
*   **Metrics:** Data associated with fragments (e.g., count for `RoundsFragment`, time for `TimerFragment`, reps for `RepFragment`).

---

## Scenario 1: Simple Rounds with Single Exercises

**Description:** A set number of rounds, each containing one or more distinct exercises performed sequentially.

*   **Parent:** `RoundsFragment` (defining total rounds)
*   **Children (per round, default 'repeat' lap behavior):**
    *   `EffortFragment` + `RepFragment` (e.g., 10 Push-ups)
    *   `EffortFragment` + `DistanceFragment` (e.g., Run 200m)
    *   `EffortFragment` + `TimerFragment` (e.g., 30s Plank)

**Markdown Example:**

```
(3)
  Push-ups 10
  Run 200m
  Plank :30s
```

**Relationship:** The `RoundsFragment (3)` is the parent. Each line inside is a child statement. The children are executed in order for each of the 3 rounds. The `LapFragment` is implicitly 'repeat' for each child if not specified.

---

## Scenario 2: Rounds with Composed Exercises (using `+` and `-`)

**Description:** A set number of rounds, where each round consists of a "complex" or a sequence of exercises that are grouped together. The `+` lap marker links exercises into a compose group, and `-` typically marks the end of that group for the round.

*   **Parent:** `RoundsFragment`
*   **Children (linked by `+`, ended by `-` or end of block for the round):**
    *   `+ EffortFragment` + `RepFragment`
    *   `+ EffortFragment` + `RepFragment`
    *   `- EffortFragment` + `RepFragment` (or just `EffortFragment` + `RepFragment` if it's the last in the compose group for that round)

**Markdown Example:**

```
(5)
+ Thrusters 10 @ 45kg
+ Burpees 5
- Rest :60s
```
Or, for a complex that is one "item" per round:
```
(3)
+ Power Clean 1 @ 70kg
+ Front Squat 2 @ 70kg
- Jerk 3 @ 70kg
```

**Relationship:** `RoundsFragment (5)` is the parent.
The `+` prefixed lines form a compose group. `Thrusters` and `Burpees` are performed, then `Rest`. This entire sequence is one round. The `-` on "Rest" (or if it were the last item without a `+` before it in the round's scope) signifies the end of the composed set for that round.

---

## Scenario 3: Timed Block (e.g., AMRAP, For Time with Cap)

**Description:** A block of exercises performed for a specific duration. The goal is often to complete as many rounds or reps as possible (AMRAP) or to complete a set amount of work within the time (For Time with a cap).

*   **Parent:** `TimerFragment` (defining total block duration)
*   **Children (within the timed block):**
    *   `EffortFragment` + `RepFragment`
    *   `EffortFragment` + `DistanceFragment`
    *   These children may themselves be structured with `+` / `-` if they form a round to be repeated within the AMRAP.

**Markdown Example (AMRAP):**

```
10:00 AMRAP
  + Pull-ups 5
  + Push-ups 10
  - Air Squats 15
```

**Markdown Example (For Time with a Cap, work is defined once):**
```
:20m For Time
  Run 1 mile
  Deadlifts 50 @ 100kg
  Run 1 mile
```
*(Note: The "For Time" aspect is often implied by the structure if not explicitly stated as an effort. The system might treat this as a `TimedGroupBlock` where children are iterated through once, but the timer runs for the whole group.)*

**Relationship:** The `TimerFragment (:10m)` is the parent, defining the boundary for the children. The children `Pull-ups`, `Push-ups`, `Air Squats` form a round that is repeated as many times as possible within 10 minutes.

---

## Scenario 4: EMOM (Every Minute On the Minute)

**Description:** A specific exercise or set of exercises performed at the start of each minute for a set number of minutes (or rounds).

*   **Parent:** `RoundsFragment` (total minutes/rounds) and/or `TimerFragment` (implicitly 1 minute per round, or could be explicit if intervals are different e.g. E2MOM)
*   **Children (performed each minute/interval):**
    *   `EffortFragment` + `RepFragment`
    *   Or a compose group using `+`

**Markdown Example (Simple EMOM):**

```
(10) EMOM // Assuming parser understands EMOM to imply 1-minute intervals
  Power Snatches 3 @ 60kg
```
If EMOM is not a special keyword, it might be structured as:
```
(10) // 10 rounds
  :1m // Each round is 1 minute
    Power Snatches 3 @ 60kg
    // Rest for remainder of the minute (often implied)
```

**Relationship:** `RoundsFragment (10)` is the primary parent. Each round represents a minute. The child `Power Snatches` is performed at the start of that minute. The `TimerFragment (:1m)` if present explicitly defines the interval for each round's "slot".

---

## Scenario 5: Efforts with Multiple Metrics

**Description:** A single exercise line that includes multiple types of metrics.

*   **Parent:** Can be `RoundsFragment`, `TimerFragment` (AMRAP), or none (sequential).
*   **Child (as a single statement):**
    *   `EffortFragment` + `RepFragment` + `ResistanceFragment`
    *   `EffortFragment` + `DistanceFragment` + `TimerFragment` (e.g., Run 400m in under :90s - though "in under" is more complex logic)

**Markdown Example:**

```
(3)
  Deadlifts 5 @ 100kg
  Bench Press 8 @ 70kg
```

**Relationship:** The `EffortFragment` ("Deadlifts") is associated directly with `RepFragment (5)` and `ResistanceFragment (@ 100kg)` within the same statement. This statement is then a child of the `RoundsFragment (3)`.

---

## Scenario 6: Incrementing/Decrementing Metrics

**Description:** Metrics that change (increase or decrease) over rounds or sets.

*   **Parent:** Typically `RoundsFragment`.
*   **Child:** `EffortFragment` + (e.g., `RepFragment`, `ResistanceFragment`) + `IncrementFragment`

**Markdown Example (Increasing Reps):**

```
(5) // 5 rounds
  ^ Push-ups 10 // Starts at 10, increases by 1 each round (10, 11, 12, 13, 14)
```

**Markdown Example (Increasing Weight):**
```
(3) // 3 sets
  ^ Deadlift 5 @ 100kg // Assuming increment applies to weight if not specified for reps (100kg, 101kg, 102kg - or a defined step)
  // For more specific increment on weight: Deadlift 5 @ 100kg ^5kg (hypothetical syntax for specific increment value)
```
*(Note: The exact application of `IncrementFragment` (which metric it applies to by default, and how to specify the increment value if not just `+1/-1`) depends on parser/runtime logic.)*

**Relationship:** The `IncrementFragment (^)` modifies a metric (e.g., reps or weight) of its sibling fragments within the child statement. This modification occurs at each iteration of the parent `RoundsFragment`.

---

## Scenario 7: Actions and Textual Notes

**Description:** Non-metric instructions or notes within a workout structure.

*   **Parent:** Any structural fragment (`RoundsFragment`, `TimerFragment`) or none.
*   **Child:** `ActionFragment` or `TextFragment`

**Markdown Example:**

```
Warm-up
  Row 500m
  [Action: Grab a PVC pipe]
  Shoulder Dislocates 10

Main Set
(3)
  Clean and Jerk 5 @ 60kg
  // Rest as needed between sets
```

**Relationship:** `ActionFragment` (`[Action: Grab a PVC pipe]`) and `TextFragment` (`// Rest as needed...`) are children in the sequence. They provide instructions or context but don't typically have metrics that affect scoring or timing directly (unless an action implies a timed transition, handled by runtime).

---

## Scenario 8: Nested Structures

**Description:** Parent fragments containing other parent fragments.

*   **Outer Parent:** e.g., `RoundsFragment`
*   **Inner Parent (Child of Outer):** e.g., `TimerFragment` (for an AMRAP within each round)
*   **Grandchildren (Children of Inner):** Exercises within the inner AMRAP.

**Markdown Example:**

```
(3) // 3 Rounds
  Run 400m
  :2m AMRAP // 2-minute AMRAP within each of the 3 rounds
    + Wall Balls 10
    - Double Unders 20
  Rest :90s
```

**Relationship:** The outer `RoundsFragment (3)` controls the overall sets. Within each set, there's a sequence: `Run 400m`, then a `TimerFragment (:2m AMRAP)` which acts as an inner parent for `Wall Balls` and `Double Unders`, followed by `Rest :90s`.

---

This list covers common scenarios. The flexibility of the fragment system may allow for other combinations and interpretations by the runtime.