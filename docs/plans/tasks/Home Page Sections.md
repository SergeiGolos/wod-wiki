# Home Page — Content & Narrative Plan

_How each section should feel, what story it tells, and suggested copy direction — with sticky viewport annotations for the canvas DSL._

---

## Canvas Architecture Overview

The home page uses the **canvas DSL** (`template: canvas`) to create a scroll-driven two-column layout:

```
┌─────────────────────────────┬──────────────────────────────────┐
│  scrolling text + buttons   │  sticky editor / runtime panel   │
│  (left)                     │  (right, 45–48% width)           │
└─────────────────────────────┴──────────────────────────────────┘
```

### Key DSL Primitives

- **`{sticky}`** — heading attribute that pins the section's text alongside the viewport while the user scrolls.
- **`{full-bleed}`** — heading attribute that makes the section span full width (no right panel visible — useful for hero and CTA sections).
- **`{dark}`** — heading attribute that applies a dark background variant.
- **`view` block** — declares the sticky panel's initial state: editor source, alignment, width, and optional inline buttons.
- **`command` block** — scroll-triggered pipeline that fires when the section becomes the most-visible in the viewport (IntersectionObserver ratio-map). Used to swap the editor source, change panel state (note / track / review), or navigate.
- **`button` block** — explicit user-action button rendered in the prose column. Fires its pipeline on click.

### Viewport State Machine

The sticky panel cycles through three states per the canvas runtime:

| State | What the user sees | Triggered by |
|-------|--------------------|--------------|
| `note` | Monaco editor with syntax-highlighted script | Default, or `set-state: note` command |
| `track` | Live workout timer (inline or fullscreen) | `set-state: track` command or button |
| `review` | Analytics panel with per-block breakdown | `set-state: review` command, or auto after workout completes |

### Design Principle

**Every scroll step should change what's in the sticky panel.** The left column tells the story; the right column shows it. The visitor never reads prose about a concept without simultaneously seeing it in the editor or runtime.

---

## 1. Hero

**What it answers:** "What is this? Should I care?"

The hero has one job — stop the scroll. Lead with the outcome, not the technology. The visitor is a coach, trainer, or serious home-gym athlete who plans sessions in their head (or on a whiteboard) and loses track of it all later.

**Layout:** `{full-bleed}` — no sticky panel yet. The hero spans full width so the headline gets maximum visual weight. The sticky viewport activates starting with the Cycle section below.

**Suggested headline:**

> Your workout, written once — run, tracked, and remembered forever.

**Sub-headline:**

> WOD Wiki turns plain-text workout plans into a live timer, an automatic log, and a growing library of your training history. No spreadsheets. No apps. Just write and go.

**CTAs (three clear paths for three kinds of visitor):**
- `▶ Start Planning` → opens the editor (for the ready-to-go coach)
- `See Examples` → jumps to the First Example / Live Demo section below (for the curious)
- `↓ How it Works` → smooth-scrolls to the cycle section (for the methodical reader)

**Viewport annotation:** None. The hero is `{full-bleed}` — the sticky panel is not visible here. This keeps the first impression clean and text-focused.

---

## 2. The Cycle — Plan · Execute · Evolve

**What it answers:** "What problems does this actually solve?"

**Layout:** `{sticky}` — this is where the sticky viewport activates. A `view` block in this section initializes the editor panel with the "3 × 10 Pushups" script. The three sub-sections below each fire a `command` that updates the panel to match the narrative.

### Viewport Activation

```view
name:    home-demo
state:   note
source:  markdown/canvas/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
button:  ▶ Try It | set-state: track | open: view
```

The panel appears to the right of the prose. It starts in `note` (editor) state showing the sample script. An inline "Try It" button on the panel lets impatient visitors jump straight to the timer.

### Sticky Viewport Behavior Across Sub-Sections

Each sub-section below fires a scroll-triggered `command` that updates the `home-demo` panel. As the visitor scrolls through the Cycle cards, the panel swaps content or state to match:

- **Plan sub-section** → `set-source` loads the raw script, `set-state: note` shows the editor
- **Execute sub-section** → `set-state: track` launches the inline timer
- **Evolve sub-section** → `set-state: review` shows the analytics panel

This means the visitor reads about "Plan" while seeing the editor, reads about "Execute" while seeing the timer run, and reads about "Evolve" while seeing results — all in the same sticky panel without clicking anything.

---

### ✍️ Plan

> Coaches think in reps, rounds, and loads — not dropdowns and forms. Write your session the way it lives in your head: `3 rounds · 10 Kettlebell Swings 24kg · :30 rest`. WOD Wiki reads it instantly.

_The plan is the source of truth. Everything else flows from it._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/sample-script.md
  - set-state: note
```

When this section becomes the most visible, the panel shows the **editor** with the sample script loaded. The visitor can see syntax highlighting on each token — round count, rep count, exercise label, rest duration. No interaction required; the scroll itself drives the demo.

---

### ⏱ Execute

> Hit run. The smart timer steps through every block in order — counting down rest, advancing rounds, keeping you in the flow state. You focus on the work; WOD Wiki watches the clock.

_No finger-tapping the stopwatch. No mental math mid-set._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/sample-script.md
  - set-state: track
open: view
```

When this section enters the viewport, the panel **launches the inline timer** (`open: view` keeps it in the sticky panel rather than fullscreen). The visitor sees the workout timer counting through rounds in real time. The timer auto-advances between blocks — rest counts down, the round badge increments.

**Note:** Because the timer runs in real time, the visitor needs to scroll into this section for it to start. If they scroll past quickly, the timer starts and runs in the background. This is intentional — it demonstrates that the timer "just works" with zero configuration.

---

### 📈 Evolve

> The moment the last round finishes, your results are already there — volume, time under load, intensity. Compare today to last week. See the trend. Know when to push and when to back off.

_Training data that earns its keep, without any manual entry._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-state: review
```

When this section enters the viewport, the panel switches to the **review/analytics state**. The visitor sees per-round segments, total volume, work time, and rest time — all generated automatically from the two-line script they saw in the Plan section. If the timer from the Execute section is still running, it completes first and the review appears when it finishes.

**Key insight to surface:**
The same script that planned the workout now explains the results. WOD Wiki closes the loop — write once, run it, see the data, refine the plan.

---

## 3. First Example — 3 × 10 Pushups

**What it answers:** "Show me, don't tell me."

Walk a single, ultra-simple workout through the entire lifecycle. Start with the most approachable script imaginable so nothing about the syntax gets in the way of understanding the cycle.

```
3 rounds
  10 Pushups
```

This example is the backbone of the whole live-demo section. Each scroll step advances one phase.

**Layout:** `{sticky}` — continues the same sticky viewport from the Cycle section. The `home-demo` view persists. Each sub-step fires a `command` that changes the panel state or source to match the narrative.

### Why a Separate Section from the Cycle?

The Cycle section introduces the three phases at a conceptual level with the KB Swings script (a realistic workout). This section strips it down further — "3 × 10 Pushups" — and walks through each phase **pedagogically**, surfacing explicit "key insights" the visitor should take away. The Cycle sells the concept; the Example teaches it.

---

### Step 1 — Create Metrics in the Editor (Plan)

> Type it like you'd whiteboard it. Two lines. WOD Wiki parses every token automatically — `3 rounds` becomes a repeater, `10 Pushups` becomes a tracked rep block. No configuration needed.

_Visual cue: the editor with syntax highlighting on each token — round count · rep count · exercise label._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/example-pushups.md
  - set-state: note
```

The panel loads a new, simpler source file (`example-pushups.md`) containing only the pushup script. The editor shows syntax highlighting so the visitor can see how each token is classified.

**The key insight to surface:**
Every line produces a **metric** — a named value the timer will count and the journal will record. The plan is not just text; it is the schema for your session's data.

---

### Step 2 — Annotate with Time in the Workout Timer (Execute)

> Press run. The timer walks the script top-to-bottom: start of round 1, 10 pushups counting up, rest, round 2, … Each transition is automatic. The overlay shows where you are in the workout at all times.

_Visual cue: live timer panel with the rep counter ticking toward 10, then the round badge advancing._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/example-pushups.md
  - set-state: track
open: view
```

The panel launches the inline timer for the pushup script. The visitor sees the timer counting reps and advancing rounds — same mechanism as the Cycle section, but with a script so simple there's zero cognitive overhead.

**The key insight to surface:**
The smart timer does not just count — it **annotates** each rep with a timestamp. When you finish, WOD Wiki knows exactly how long each set took. That annotation is what turns raw reps into training data.

---

### Step 3 — Seeing Results (Evolve)

> Three rounds of 10 pushups: 30 total reps, spread across N minutes and M seconds. The review panel shows the breakdown automatically — time per round, total work time, rest time. All from those two lines of text.

_Visual cue: the review/analytics panel with per-round segments and a total volume summary._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-state: review
```

The panel switches to review state, showing the results from the pushup workout. The visitor sees total volume (30 reps), time per round, and total duration — all from two lines of text.

**The key insight to surface:**
The same script that planned the workout now explains the results. WOD Wiki closes the loop — write once, run it, see the data, refine the plan.

---

## 4. Features

**What it answers:** "What else can it do? Can I trust it?"

**Layout:** `{sticky full-bleed dark}` — the features section can use `{full-bleed}` to give the cards more room, or `{sticky}` to keep the viewport active. **Recommended: `{sticky}`** so the viewport remains visible and can showcase a different aspect of WOD Wiki for each feature.

### Viewport Strategy for Features

Rather than a static set of cards, the features section should continue using the sticky viewport to **show, not tell**. Each feature card or sub-section loads a different source or state into the panel:

| Feature | Viewport State | What the visitor sees |
|---------|---------------|----------------------|
| 🔒 Your Data Stays with You | `note` state, journal source | The journal page loaded in the editor — shows that everything is a local file |
| 📺 Chromecast | Cast button visible on panel | The editor panel with the cast icon active — hints at TV casting capability |
| 📓 Automatic Journaling | `review` state, completed workout | The analytics panel from a previously-run workout — proves auto-logging works |
| 📊 Data Analysis & Trends | `review` state, rich analytics | A more complex workout's review panel — shows intensity graph and per-block breakdown |
| 🔗 Link Sharing | `note` state, shared workout URL | The editor with a "Share" action visible — demonstrates URL-based sharing |

This means each feature scroll-step changes the panel to demonstrate that specific capability, keeping the page experiential rather than descriptive.

**Implementation note:** The features section would need additional source files in `markdown/canvas/home/` for each viewport state (e.g., `features-journal.md`, `features-analytics.md`). Alternatively, a single rich source file could be used with different `set-state` commands.

---

### 🔒 Your Data Stays with You

> WOD Wiki stores everything in your browser's local storage — IndexedDB on your device. There is no account, no server, no cloud sync unless you choose to export. Your training history belongs to you.

_Speaks to privacy-aware users and anyone burned by a platform shutting down._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/features-journal.md
  - set-state: note
```

Panel shows a journal entry in the editor. The visitor can see that the journal is just another markdown file — no cloud, no sync indicator, no login prompt. The message is implicit but clear: this lives on your machine.

---

### 📺 Chromecast — Built for Home Gyms

> Cast the live timer to any TV in your gym with one click. Full-screen display, readable from across the room. No app to install on the TV — just cast from your phone or laptop.

_Speaks to home-gym owners who need hands-free visibility._

**Viewport annotation:** No state change needed — the existing panel with the cast button visible is sufficient. The cast icon on the panel chrome serves as the visual proof point. Optionally, a `set-state: track` command here re-launches the timer so the visitor can see the cast button in its active context.

---

### 📓 Automatic Journaling

> Every session you run is automatically logged with date, script, and results. Open any past entry, add notes, and update load records — all in the same notation. Your journal is a living record of your training, not a filing cabinet.

_Speaks to coaches and athletes who care about long-term progression._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/features-journal-entry.md
  - set-state: review
```

Panel loads a journal entry from a past workout and shows it in review state. The visitor sees actual results — not a mockup — proving that sessions are logged automatically.

---

### 📊 Data Analysis & Trends

> Pre-run: estimated total volume and time so you can calibrate intensity before you start. Post-run: actual vs. estimated, intensity over time, per-block breakdown. The numbers are always there; you decide what to do with them.

_Speaks to data-driven athletes and coaches who want evidence, not intuition._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/features-complex-workout.md
  - set-state: review
```

Panel loads a more complex workout (multiple movement types, timers, groups) in review state. The visitor sees a richer analytics panel — per-block breakdown, intensity graph — demonstrating the depth of data available.

---

### 🔗 Link Sharing

> Share any workout script with a URL. The recipient opens the link and the script is already in the editor, ready to run. No login, no account — just a link.

_Speaks to coaches who program for clients and communities._

**Viewport annotation:**

```command
target: home-demo
pipeline:
  - set-source: markdown/canvas/home/features-shared-workout.md
  - set-state: note
```

Panel loads a workout that was "shared via link" (simulated via a pre-authored source file). The editor shows it ready to run. The implicit message: this is what your recipients see when you share.

---

## 5. Browse the Library

**What it answers:** "Is there real content here, or is this vaporware?"

**Layout:** `{sticky}` — the viewport switches from editor/runtime to a **collection browser** view.

### Viewport Annotation

```view
name:    browse-demo
state:   browse
source:  markdown/collections/
runtime: in-memory
launch:  host
align:   full
```

The panel transitions to a full-width collection browser showing real workout cards. The visitor can click any card to load it in the editor. This provides immediate proof of content volume and variety.

**Why this section matters:** After several sections of scroll-driven demo, the visitor may wonder if WOD Wiki is a real product with real workouts. The library browser answers that question before the page ends.

---

## 6. Closing CTAs

**What it answers:** "What do I do next?"

Two final full-bleed sections with clear calls to action:

### "Ready to write your own?"

**Layout:** `{full-bleed dark}`

```button
label:  Start Zero to Hero →
pipeline:
  - navigate: /getting-started
```

### "Start your training journal."

**Layout:** `{full-bleed}`

```button
label:  Open Today's Journal →
pipeline:
  - navigate: query:today-journal
```

> No cloud required. Your data stays on your device. Export or import any time.

**Viewport annotation:** None — `{full-bleed}` sections hide the sticky panel. The final impression is a clean CTA with a privacy reassurance line.

---

## Viewport Flow Summary

The sticky viewport tells a parallel story to the prose. Here's the complete state flow as the visitor scrolls top-to-bottom:

| Section | Heading Attrs | Viewport State | Source | What the visitor sees |
|---------|--------------|----------------|--------|----------------------|
| Hero | `{full-bleed}` | — | — | No panel. Full-width headline + CTAs. |
| Cycle: Plan | `{sticky}` | `note` | `sample-script.md` | Editor with KB Swings script |
| Cycle: Execute | `{sticky}` | `track` | `sample-script.md` | Inline timer running the workout |
| Cycle: Evolve | `{sticky}` | `review` | — | Analytics panel from the completed workout |
| Example: Step 1 | `{sticky}` | `note` | `example-pushups.md` | Editor with simplified pushup script |
| Example: Step 2 | `{sticky}` | `track` | `example-pushups.md` | Inline timer running pushups |
| Example: Step 3 | `{sticky}` | `review` | — | Analytics panel from pushup workout |
| Feature: Privacy | `{sticky}` | `note` | `features-journal.md` | Journal entry in editor |
| Feature: Chromecast | `{sticky}` | `track` or unchanged | — | Timer with cast button visible |
| Feature: Journaling | `{sticky}` | `review` | `features-journal-entry.md` | Past workout results |
| Feature: Analytics | `{sticky}` | `review` | `features-complex-workout.md` | Rich analytics from complex workout |
| Feature: Sharing | `{sticky}` | `note` | `features-shared-workout.md` | "Shared" workout in editor |
| Browse Library | `{sticky}` | `browse` | `collections/` | Collection browser cards |
| CTA: Getting Started | `{full-bleed dark}` | — | — | No panel. Full-width CTA. |
| CTA: Journal | `{full-bleed}` | — | — | No panel. Full-width CTA. |

### Source Files Needed

To support this flow, the following new source files should be created in `markdown/canvas/home/`:

| File | Purpose |
|------|---------|
| `sample-script.md` | KB Swings workout (already exists) |
| `example-pushups.md` | `3 rounds / 10 Pushups` — simplest possible script |
| `features-journal.md` | A journal entry showing auto-logged session |
| `features-journal-entry.md` | A past workout with results for review state |
| `features-complex-workout.md` | Multi-movement workout for rich analytics demo |
| `features-shared-workout.md` | A workout presented as if received via shared link |

---

## Tone Notes

- **Direct.** Coaches don't hedge. State facts, not possibilities.
- **Specific.** "30 total pushups in 4:12" beats "see your results."
- **Short sentences.** One idea per line. Write like a whiteboard, not a manual.
- **Cycle language.** Use **Plan → Execute → Evolve** consistently as the through-line across all three sections so the visitor internalises the loop by the time they reach the Features section.
- **Show, then tell.** Every concept is paired with a viewport state change. The visitor reads about it *and* sees it simultaneously. The panel is never idle while prose is being read.
