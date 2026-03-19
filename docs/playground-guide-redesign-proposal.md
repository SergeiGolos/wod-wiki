# Playground Guide Redesign — Proposal

**Date:** March 18, 2026
**Status:** Draft

---

## 1. Current State Audit

### Pages in the Playground

| Page | Route | Purpose | Sections |
|------|-------|---------|----------|
| `HomePage` | `/` | Marketing / feature showcase | WodScript basics, AMRAP/EMOM/Countdown, Rep tracking, Metrics |
| `GettingStartedPage` | `/getting-started` | "Zero to Hero" tutorial | Markdown basics → Advanced blocks → CTA |
| `SyntaxPage` | `/syntax` | Reference guide | Basics, Timers, Repeaters, Groups, Measurements, Supplemental, Agentic |

### What Each Page Currently Covers

#### GettingStartedPage (Zero to Hero)
The progressive tutorial leads with **Markdown features first**:
1. Headers & Text
2. Markdown Tables
3. Checklists
4. → _then_ WOD Block code fence
5. → Metadata JSON block
6. Smart Intervals (4-round tabata example)

**Problem:** Leading with generic Markdown before WodScript means users must read through the workspace/notes framing before they learn the core language. This is backwards for someone wanting to write workouts.

#### SyntaxPage
Covers the language breadth but treats each topic as equal-weight:
1. WOD Block code fence basics
2. Timers & Intervals (AMRAP, EMOM, Tabata)
3. Repeaters (21-15-9, sets)
4. Groups & Nesting
5. Measurements (weights, distance units)
6. Supplemental Data (rest, actions, unknown weight `?lb`)
7. Agentic Skill (LLM extraction)

**Problem:** No visual feedback on _what the parser actually sees_. Examples just show the editor running live, but there is no explanation of how a line is decomposed into metrics/metrics. A learner cannot tell why `10 Pushups` and `Pushups 10` behave differently, or what the `^` or `*` prefix on a timer does.

---

## 2. Full WodScript Syntax Inventory

Drawn from `src/grammar/wodscript.grammar`, the parser metrics, and the compiler strategies.

### 2.1 Statement Structure

Every non-blank line in a `wod` block is a **Block** composed of:

```
[Lap] Fragment Fragment Fragment ...
```

**Lap marker** (optional first token):
| Token | Meaning |
|-------|---------|
| `-` | Sub-item / child statement (indented list item) |
| `+` | Additive lap marker |

### 2.2 Fragment Types

| Fragment | Syntax Examples | Metric Produced | Notes |
|----------|----------------|----------------|-------|
| **Duration** | `5:00`, `:30`, `1:30:00` | `duration` | Countdown if explicit, count-up otherwise |
| **Duration (count-up)** | `^5:00` | `duration` (count-up) | `^` forces count-up even with value |
| **Duration (rest marker)** | `*5:00` | `duration` + rest flag | `*` marks this timer as a rest period |
| **Collectible Timer** | `:?` | `duration` (hinted) | Captures actual elapsed time at runtime |
| **Rounds** | `(3)`, `(5 Rounds)`, `(21-15-9)` | `rounds` + `rep[]` | Parenthesized group; sequences create rep scheme |
| **Quantity (reps)** | `10`, `@10` | `rep` | `@` prefix variant |
| **Quantity (distance)** | `400m`, `1.5km`, `100ft`, `0.5 miles` | `distance` | Units: m, km, ft, mile, miles |
| **Quantity (weight)** | `95lb`, `60kg`, `bw` | `resistance` | Units: lb, kg, bw |
| **Quantity (unknown)** | `?lb`, `?kg`, `?` | `resistance` (hinted) | Unknown value — prompt user |
| **Effort** | `Pushups`, `Air Squats`, `Clean & Jerk` | `effort` | Exercise name / movement |
| **Action** | `[Rest]`, `[Setup Barbell]`, `[Chalk Up]` | `action` | Square-bracket non-movement step |
| **Text (comment)** | `// Notes go here` | `text` | Inline annotation; hidden in display |

### 2.3 Timer Direction Rules

| Syntax | Direction | Logic |
|--------|-----------|-------|
| `5:00 Pushups` | Countdown | Explicit duration → counts down |
| `^5:00 Pushups` | Count-up | `^` overrides; counts up from 0 |
| `:?` | Count-up | Collectible — records elapsed until user completes |
| `Pushups` (no timer) | Count-up (stopwatch) | No duration → just a stopwatch |

### 2.4 Workout Protocols (Dialect Layer)

The CrossFit dialect recognizes these keywords and applies behavior rules automatically:

| Keyword | Pattern | Behavior |
|---------|---------|---------|
| `AMRAP` | Timer + `AMRAP` keyword | Countdown timer, **unbounded** rounds |
| `EMOM` | Timer + `EMOM` keyword | Per-interval countdown, **fixed** rounds |
| `FOR TIME` | `FOR TIME` keyword | Count-up stopwatch, completion target |
| `TABATA` | `TABATA` keyword | 20s work / 10s rest preset |
| _(implicit EMOM)_ | Rounds + Timer + children | Auto-detected as EMOM pattern |

### 2.5 Grouping & Repeater Structures

```
(3 Rounds)           → 3 iterations of children
(21-15-9)            → rep scheme: 21 reps first, then 15, then 9
(AMRAP 10:00)        → 10-minute AMRAP
(EMOM 10:00)         → 10x 1:00 intervals
((3) :40 Work :20 Rest) → nested: 3 rounds of Tabata-style
```

### 2.6 Measurement Units

| Category | Units |
|----------|-------|
| Weight | `lb`, `kg`, `bw` |
| Distance | `m`, `km`, `ft`, `mile`, `miles` |
| Time | `:SS`, `M:SS`, `H:MM:SS` |

### 2.7 Markdown Integration

WodScript sits _inside_ a Markdown document. Everything outside a ` ```wod ``` ` fence is standard Markdown:

- Headings (`# H1`, `## H2`)
- Prose / notes
- Tables
- Checklists (`- [ ]`, `- [x]`)
- Links, bold, italic
- Other code blocks (` ```json ``` ` for metadata)

This means WOD.WIKI is a **workspace**, not just a workout runner.

---

## 3. Gap Analysis

Features in the grammar / runtime that are **missing or under-explained** in the current playground:

| Feature | Gap Level | Notes |
|---------|-----------|-------|
| `^` count-up modifier on a timed block | ❌ Not shown | Critical for "open" timers with a reference duration |
| `*` rest prefix | ❌ Not shown | Marks auto-generated rest timing behavior |
| `:?` collectible timer | ❌ Not shown | Records actual effort; key for logging real times |
| `[Action]` syntax vs `Effort` syntax | ⚠️ Barely mentioned | Users don't understand the `[]` delimiter |
| `// text comment` inside WOD blocks | ❌ Not shown | Inline annotations — useful for coach notes |
| `@` quantity prefix | ❌ Not shown | Alternative rep syntax |
| `FOR TIME` keyword | ❌ Not shown | Unlike AMRAP/EMOM which are shown |
| Implicit EMOM (Rounds + Timer pattern) | ⚠️ Only shown as `EMOM` keyword | Implicit detection is the more common author pattern |
| Timer formats (`:30` vs `30:00` vs `1:30:00`) | ⚠️ Mixed but not explained | Rules unclear to learners |
| Rep sequences `(21-15-9)` mechanism | ⚠️ Shown but unexplained | No visual breakdown of how the sequence produces 3 rounds |
| Debug / parse view | ❌ Entirely absent | "What does the parser actually see?" |
| Statement anatomy diagram | ❌ Absent | No "exploded view" of a single line |
| Lap markers (`-`, `+`) | ❌ Not explained | These are structural markers, not bullet points |
| Markdown as workspace | ✅ In GettingStartedPage — but placed too early | Should be _after_ learning the core language |

---

## 4. Proposed Content Progression

### Guiding Philosophy

> **"Inside-out"**: learn how to express a single workout statement, then scale to groupings, then to a full document.

The current structure leads with the document (Markdown workspace) and ends with syntax depth. We propose reversing this: start with the atom (a single WodScript line), build to molecules (groups), and only then reveal the document layer.

---

### Revised Guide Architecture

```
Level 0 — What is a Statement?        (the atom)
Level 1 — The Basic Line              (effort + quantity)
Level 2 — Adding Time                 (duration, direction)
Level 3 — Measuring Effort            (metrics: reps, weight, distance)
Level 4 — Grouping & Repeating        (rounds, sequences)
Level 5 — Workout Protocols           (AMRAP, EMOM, FOR TIME, Tabata)
Level 6 — Supplemental Syntax         (actions, rest, comments, unknowns)
Level 7 — The Document Layer          (Markdown workspace, headers, notes, checklists)
```

---

### Detailed Outline

#### Level 0 — What is a Statement?

**Goal:** Show a user a single line and explain how it is decomposed.

> Every line in a `wod` block is a **statement** made of **metrics**.

Example:
```wod
10 Pushups
```

**Debug view shows:**
```
Quantity(rep)  → value: 10
Effort         → value: "Pushups"
```

No timer = stopwatch mode. This is the simplest possible workout.

---

#### Level 1 — The Basic Line

Topics:
- `Effort` alone (just a movement name)
- `Quantity + Effort` (reps + movement)
- `Effort + Quantity` (order doesn't matter for display but convention is quantity-first)
- Multiple lines = multiple statements executed in sequence

Examples:
```wod
Pushups
10 Pushups
10 Pushups 5 Situps   // two quantities on one line
```

---

#### Level 2 — Adding Time

Topics:
- Countdown timer (`5:00 Run`)
- Seconds-only timer (`:30 Jumping Jacks`)
- Count-up (implicit, no timer: `Run`)
- Forced count-up (`^5:00 Run`) — starts a reference clock that counts up
- Collectible timer (`:? Deadlifts`) — just records elapsed time

Timer format rules:
| Format | Example | Meaning |
|--------|---------|---------|
| `MM:SS` | `5:00` | 5 minutes |
| `:SS` | `:30` | 30 seconds |
| `H:MM:SS` | `1:30:00` | 1 hour 30 minutes |
| `:?` | `:?` | Open-ended, records actual time |

---

#### Level 3 — Measuring Effort

Topics:
- Reps: `10 Pushups`
- Weight: `10 Deadlifts 225lb`, `60kg`, `bw`
- Distance: `400m Run`, `1 mile Run`, `2000m Row`
- Combined: `10 Thrusters 95lb`
- Unknown: `5 Deadlifts ?lb` — prompts user for their working weight

Metric inheritance (parent-to-child):
```wod
(3 Rounds)
  10 Deadlifts    // inherits 225lb from parent if parent specifies
```
vs
```wod
(3 Rounds)
  10 Deadlifts 225lb
```

---

#### Level 4 — Grouping & Repeating

Topics:
- Simple round group: `(3)` or `(3 Rounds)`
- Rep sequence: `(21-15-9)` — three rounds, different target reps each time
- Nesting: rounds inside rounds
- Lap markers: `-` (child statement) vs no marker (top-level)

```wod
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
```

Rep scheme:
```wod
(21-15-9)
  Thrusters 95lb
  Pullups
```
→ Parsed as 3 rounds, with targets [21, 15, 9] applied to all child movements.

---

#### Level 5 — Workout Protocols

Topics:
- **AMRAP** — time-bound, as many rounds as possible
- **EMOM** — every-minute intervals, fixed count
- **FOR TIME** — complete the work, timer runs up
- **Tabata** — 20s work / 10s rest preset
- **Implicit EMOM** — `(10) :60` pattern without keyword

```wod
AMRAP 20:00
  5 Pullups
  10 Pushups
  15 Air Squats

EMOM 10:00
  3 Heavy Clean & Jerk

(8 Rounds)
  :20 Max Effort Burpees
  :10 Rest

FOR TIME
  100 Double Unders
  50 Thrusters 95lb
```

---

#### Level 6 — Supplemental Syntax

Topics:
- **Actions** `[Setup Barbell]` — non-movement steps that appear in the plan
- **Rest marker** `*2:00 Rest` — explicit rest period
- **Text comments** `// coach notes visible in plan`
- **Unknown values** `?lb`, `?reps` — collect from user at runtime
- **`@` quantity** — alternative rep annotation

```wod
(5 Sets)
  5 Back Squat ?lb         // user sets their own weight
  [Adjust plates]          // action checkpoint
  *2:00 Rest               // rest block
  // Focus on bar path     // coach annotation
```

---

#### Level 7 — The Document Layer

Topics:
- Markdown outside wod blocks = notes, structure, metadata
- Use headers to name the session, add goals, reflection
- Tables for equipment lists or tracking
- Checklists for warmup / prep tasks
- JSON blocks for custom metadata / tags
- Multiple wod blocks per document (separate workouts)

This is the **workspace** concept: WodScript lives inside a Markdown document.

```markdown
# Tuesday Upper Body

## Warmup
- [ ] 5 min bike
- [ ] Shoulder CARs

## Main Work

```wod
(5 Sets)
  5 Bench Press 185lb
  *3:00 Rest
```

## Notes
Felt strong today. Consider bumping to 195lb next session.
```

---

## 5. View Type Recommendations

### 5.1 Interactive Editor (Existing)
The current `UnifiedEditor` with live runtime. Keep this as the "do it" view.

### 5.2 Statement Anatomy View (New — High Priority)

A **static exploded diagram** of a single WodScript line. Like a grammar railroad diagram but visual.

```
Input:  10 Thrusters 95lb

┌──────────┬─────────────┬───────────┐
│ Quantity │   Effort    │ Quantity  │
│  (rep)   │             │ (weight)  │
│  10      │  Thrusters  │  95lb     │
└──────────┴─────────────┴───────────┘
```

**Purpose:** Teach the user _what the parser sees_. This demystifies why `10 Pushups` and `Pushups 10` produce the same metrics, and shows which fragment is which type.

**Implementation idea:** A side-by-side layout where:
- Left: editable single-line input
- Right: live-updated fragment breakdown table (type, value, unit)

### 5.3 Parse Tree Debug View (New — Medium Priority)

Show the full list of `ICodeStatement` objects with their metrics. This is the "what did the compiler produce?" view.

```
Statement #1  [parent: root]
  metrics:
    - duration: 300000ms (countdown)
    - effort: "AMRAP"
  children: [#2, #3, #4]

Statement #2  [parent: #1]
  metrics:
    - rep: 5
    - effort: "Pullups"
```

**Purpose:** Help advanced users understand why a workout behaves a certain way, and debug unexpected timer behavior. Also useful in learnig all the runtime strategy features.

**Implementation idea:** A collapsible tree panel next to the editor. Could reuse the existing plan panel infrastructure.

### 5.4 Metric Overlay View (Existing, expose more)

The existing overlay already shows metrics during execution. In the guide context, show it statically _before_ the user hits Run, so learners understand the mapping from script to runtime state.

### 5.5 Plan / Preview View (Partially existing)

A flat linear list of all statements in execution order, with their metrics visible. This is the "what will happen?" view before running. The existing Plan panel does some of this — make it more prominent in guide sections.

### 5.6 Live Results / Segment View

After completing a block, show the recorded output: reps done, time taken, weight used. Already exists in the results system but isn't featured in the guide pages.

---

## 6. Syntax Page Enhancements

The current SyntaxPage should add a **Debug Layer** to each example section:

### Per-Section Enhancement
Each tab in a SyntaxSection would have an optional expandable panel:

```
[ Edit ] [ Parse ] [ Plan ] [ Run ]
```

- **Edit** — the current editor view (default)
- **Parse** — statement anatomy / fragment breakdown (new)
- **Plan** — execution order preview (partially exists)
- **Run** — live execution with timer (current default behavior)

This turns each example from a "live demo" into a "learning moment."

---

## 7. Proposed Page Structure

### Revised SyntaxPage Sections

| # | Section | Key Concepts | New View |
|---|---------|-------------|---------|
| 0 | Statement Anatomy | Fragment types, parsing rules | Statement anatomy diagram |
| 1 | The Basic Line | Effort, Quantity, sequencing | Fragment breakdown table |
| 2 | Timers | Duration, direction, formats, `:?` | Direction indicator |
| 3 | Measuring Effort | Reps, weight, distance, units | Metric list panel |
| 4 | Groupings & Repeaters | Rounds, sequences, nesting | Execution tree |
| 5 | Workout Protocols | AMRAP, EMOM, FOR TIME, Tabata | Behavior tag display |
| 6 | Supplemental | Actions, rest, comments, unknown | Live plan with annotations |
| 7 | The Document | Markdown workspace, notes, checklists | Full document preview |

### Revised GettingStartedPage (Zero to Hero)

Reframe: _start with the workout, end with the workspace_.

| # | Step | Change from current |
|---|------|---------------------|
| 1 | "Your First Statement" | NEW — single line, fragment view |
| 2 | "Adding a Timer" | NEW — countdown basics |
| 3 | "Measuring Your Work" | NEW — reps + weight + distance |
| 4 | "Grouping & Rounds" | NEW — replaces "Advanced Blocks" |
| 5 | "Advanced Protocols" | AMRAP/EMOM (moved from SyntaxPage) |
| 6 | "It's a Notebook" | The Markdown workspace reveal |
| 7 | "Start Building" | CTA (keep) |

---

## 8. Priority Implementation Order

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 P0 | Statement anatomy view — fragment breakdown panel | Medium |
| 🔴 P0 | Reorder GettingStartedPage: workout-first, doc-last | Low |
| 🟠 P1 | Add `^`, `:?`, `*`, `[Action]`, `//` examples to SyntaxPage | Low |
| 🟠 P1 | Add `FOR TIME` protocol section | Low |
| 🟠 P1 | Statement anatomy section as first SyntaxPage section | Medium |
| 🟡 P2 | Parse tree debug panel on SyntaxPage | High |
| 🟡 P2 | Edit / Parse / Plan / Run tab switcher on each example | High |
| 🟢 P3 | Implicit EMOM explanation | Low |
| 🟢 P3 | Lap marker (`-`, `+`) explanation | Low |

---

## 9. Open Questions

1. **Should the Statement Anatomy view be interactive?** i.e., user types a line and the breakdown updates live. This would require hooking the Lezer parser in a lightweight mode outside the full editor. High value, medium complexity.

2. **Where does the Agentic section live?** Currently last on SyntaxPage. Could be removed from there and moved to a dedicated "AI Tools" page since it is a different user flow (uploading a whiteboard photo, etc.) than learning syntax.

3. **Should GettingStartedPage and SyntaxPage merge?** The Getting Started page is currently a subset of the Syntax page with a different progression story. If the Syntax page gains a proper narrative arc (levels 0–7), the Getting Started page might become redundant. Alternatively, Getting Started stays as the "hands-on tutorial" and Syntax becomes the "reference."

4. **Debug view visibility:** Should the Parse/Debug view be visible by default for the first few examples only, and hidden (but opt-in) for later ones? This avoids overwhelming beginners while keeping it accessible for advanced users.
