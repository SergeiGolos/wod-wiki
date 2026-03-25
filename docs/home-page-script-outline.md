# WOD Wiki — Home Page Script Outline

_Planning document for the redesigned home page experience._

---

## Purpose

Guide a visitor from "I've never heard of this" → "I understand what it does" → "I want to use it" in one scrolling experience. Every section should answer a specific question the visitor is implicitly asking.

---

## Page Structure

```
[HERO]           → What is this? Should I care?
[VALUE PILLARS]  → What problems does it solve?
[LIVE DEMO]      → How does it feel to use it?
  Act 1: Write    → Markdown-style editor (the plan)
  Act 2: Track    → Smart timer running against the plan
  Act 3: Review   → Metrics and analytics output
[FEATURES]       → Key capabilities at a glance
  ├─ Smart Timer
  ├─ Analytics (pre/post)
  ├─ Chromecast (Home Gym)
  └─ Collections / Library
[EXPLORE]        → Browse workout collections (inline search)
[DEEP DIVE CTA]  → Zero to Hero syntax tour
[JOURNAL CTA]    → Start your first entry
```

---

## Section Scripts

### HERO

**Headline:**
> "Your workout — written once, run forever."

**Sub-headline:**
> WOD Wiki is a workout studio for coaches, trainers, and home gym enthusiasts. Write your session in a simple notation, hit play, and let the timer do the rest. Every rep, every round, tracked automatically.

**Primary CTA:** `▶ Try it Now` (scrolls to Live Demo)
**Secondary CTA:** `Open Journal →` (navigates to /journal)

---

### VALUE PILLARS (3-column cards)

| Icon | Headline | Copy |
|------|----------|------|
| ✍️ | **Write Like a Coach** | Plan sessions in plain text, exactly the way coaches whiteboard workouts — reps, rounds, distances, rest. No forms, no dropdowns. |
| ⏱ | **Smart Timer Runs the Show** | Hit play and follow along. The timer knows when each round ends, when to rest, and what's coming next. |
| 📊 | **Analytics That Make Sense** | See your work calculated — total volume, time under load, intensity. Pre-workout estimates, post-workout totals. |

---

### LIVE DEMO (3-Act Walkthrough)

This replaces the current parallax acts and follows a single simple example through the full lifecycle. Use the existing `Act1EditorSection` / `Act2TrackSection` / `Act3RestSection` / `Act4ReviewSection` components but tighten the narrative.

#### Sample Script (used throughout all acts)
```
# Morning Strength
3 rounds
  10 Kettlebell Swings 24kg
  :30 Rest
```

---

#### ACT 1 — Write the Plan

**Scroll-step 1 — The Editor**
> Start with what you're going to do. WOD Wiki reads like a whiteboard — rounds, reps, load, or time. That's it.

_Show: editor with the sample script. Syntax highlights as the user scrolls._

**Scroll-step 2 — Parsing**
> Under the hood, each line becomes a typed statement. Reps are counted. Weights are tracked. Timers are discovered automatically.

_Show: green token highlights appearing over each part of the script (rep · exercise · load)._

**Scroll-step 3 — Pre-processing (Dialects)**
> Dialects let WOD Wiki understand shorthand — CrossFit notation, swim yard totals, kettlebell volume. The same syntax works for every discipline.

_Show: dialect badge appearing next to the exercise name._

---

#### ACT 2 — Track the Workout

**Scroll-step 4 — Timer Starts**
> Hit run. The smart timer counts down each block, advances automatically, and keeps you in the flow state.

_Show: live timer panel with ring / countdown._

**Scroll-step 5 — Live Metrics**
> As you work, values are collected per block. Total reps accumulate. An overlay shows your progress through the workout.

_Show: rep counter ticking up in the live panel._

---

#### ACT 3 — Review the Results

**Scroll-step 6 — Metrics Output**
> When the last round finishes, your results appear immediately. Volume, intensity, durations — all ready without any manual entry.

_Show: review panel with segments and totals._

**Scroll-step 7 — Share or Save**
> Results live in your browser's local IndexedDB — your data, your device, no account required. Export anywhere, anytime.

_Show: export button / share link._

---

### FEATURES SPOTLIGHT

Four visual feature cards, each with a short demo or screenshot:

#### ⏱ Smart Timer
- Counts up / down / interval based on your script
- Automatic advance between blocks
- Audio and visual cues for transitions
- Full-screen mode during workouts

#### 📊 Pre & Post Analytics
- **Pre-run**: estimated time, total reps, projected volume
- **Post-run**: actual vs. estimated, intensity graph, per-block breakdown
- Open-source calculation engine (contribute your own metrics)

#### 📺 Chromecast — Home Gym Ready
- Cast the timer to any TV in your gym with one click
- Full-screen display readable from across the room
- No app install on the TV — just cast from your device

#### 🗂 Collections & Library
- Organize workouts into named collections
- Browse by category (strength, cardio, mobility)
- One-click load into the editor
- Inline search within the Collections view

---

### EXPLORE SECTION (Collections Browse)

**Headline:** "Browse the Library"

> Hundreds of ready-to-run workouts across every discipline. Click any card to load it in the editor and run immediately.

_Implementation: embed the existing `CollectionWorkoutsList` / `ActBrowseSection` component here with its in-page search wired to the browse/command palette._

- Search input at the top (wires to the existing browse search function)
- Category filter pills (Strength · Cardio · Mobility · WOD · etc.)
- Workout cards in a masonry or grid layout
- Each card: title, category tag, estimated time, "Load" button

---

### DEEP DIVE CTA — Zero to Hero

**Headline:** "Ready to write your own?"

> The syntax takes about 10 minutes to learn. The deep-dive guide walks you from your first statement to complex interval protocols — with live examples you can edit and run right here.

**CTA Button:** `Start Zero to Hero →` → `/getting-started`

Additional quick-links:
- [Statement Anatomy →] `/syntax`
- [Timers & Direction →] `/syntax#timers`
- [Groups & Repeaters →] `/syntax#groups`

---

### JOURNAL CTA

**Headline:** "Start your training journal."

> Every workout you run is automatically logged. Open today's journal entry and add your notes, load records, and session intentions — all in the same syntax.

**CTA Button:** `Open Today's Journal →` → `/journal/YYYY-MM-DD` (today)

Supporting copy:
> No cloud required. Your data stays on your device. Export or import any time.

---

## Navigation Changes

### Split Button — "New Entry" in global nav

Every page should show a split button in the top navbar:

```
[ + New  |  📅 ]
```

- **`+ New`** (primary): Creates / opens today's journal entry → `/journal/YYYY-MM-DD`
- **`📅`** (secondary, chevron dropdown): Opens a small date picker dropdown with:
  - "Today" → today's date
  - "Yesterday" → yesterday
  - "Tomorrow" → tomorrow (planning)
  - "Pick date…" → native date input → `/journal/YYYY-MM-DD`

**Placement:** In the `<NavbarSection>` of `App.tsx`, before the search icon.

---

## Three-Act Lifecycle Narrative (Inline Docs)

For the Zero to Hero / Syntax pages, restructure the content into three explicit acts:

### Act 1 — Raw Parser
- What is a statement?
- Token types: rep, timer, label, metric, load, rest
- Parsing a single line: `10 Kettlebell Swings 24kg`
- Show the AST output (CodeStatement fragments)

### Act 2 — Dialects & Pre-Processing
- How dialects extend the base syntax
- Pre-run processing: expanding rounds, inheriting metrics
- Estimating work effort before running
- Why blocks are created this way

### Act 3 — Runtime & Display
- How blocks execute (stack-based runtime)
- Life cycle events: mount → tick → complete → unmount
- How different container types (timer, rep, group) compose
- What the output looks like per container type
- Overrides and custom display logic

---

## Tone & Voice

- **Confident, direct.** Coaches don't hedge.
- **Specific.** "10 Kettlebell Swings 24kg" not "your exercise."
- **No jargon** until the syntax docs section.
- **Short sentences.** Write like a whiteboard, not a manual.

---

## Implementation Notes

1. **Live demo acts** — re-use `Act1EditorSection` / `Act2TrackSection` / `Act4ReviewSection`, tighten the `EDITOR_STEPS` copy in `playground/src/data/parallaxActSteps.ts`.
2. **Collections browse** — `ActBrowseSection` already exists; move it above the deep-dive CTA.
3. **Journal CTA** — use `navigate('/journal/' + todayISO)` where `todayISO = new Date().toISOString().slice(0,10)`.
4. **Split button** — add `NewEntryButton` component to `App.tsx` navbar.
5. **Chromecast section** — `ChromecastSection.tsx` already exists in `playground/src/sections/`; integrate it into the feature spotlight.
