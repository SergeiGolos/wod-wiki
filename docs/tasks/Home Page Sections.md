# Home Page — Content & Narrative Plan

_How each section should feel, what story it tells, and suggested copy direction._

---

## 1. Hero

**What it answers:** "What is this? Should I care?"

The hero has one job — stop the scroll. Lead with the outcome, not the technology. The visitor is a coach, trainer, or serious home-gym athlete who plans sessions in their head (or on a whiteboard) and loses track of it all later.

**Suggested headline:**
> Your workout, written once — run, tracked, and remembered forever.

**Sub-headline:**
> WOD Wiki turns plain-text workout plans into a live timer, an automatic log, and a growing library of your training history. No spreadsheets. No apps. Just write and go.

**CTAs (three clear paths for three kinds of visitor):**
- `▶ Start Planning` → opens the editor (for the ready-to-go coach)
- `See Examples` → jumps to the First Example / Live Demo section below (for the curious)
- `↓ How it Works` → smooth-scrolls to the cycle section (for the methodical reader)

---

## 2. The Cycle — Plan · Execute · Evolve

**What it answers:** "What problems does this actually solve?"

Three cards arranged side-by-side. Each card names one phase of a training cycle and explains the pain it removes. Together they frame the whole product in one glance.

---

### ✍️ Plan

> Coaches think in reps, rounds, and loads — not dropdowns and forms. Write your session the way it lives in your head: `3 rounds · 10 Kettlebell Swings 24kg · :30 rest`. WOD Wiki reads it instantly.

_The plan is the source of truth. Everything else flows from it._

---

### ⏱ Execute

> Hit run. The smart timer steps through every block in order — counting down rest, advancing rounds, keeping you in the flow state. You focus on the work; WOD Wiki watches the clock.

_No finger-tapping the stopwatch. No mental math mid-set._

---

### 📈 Evolve

> The moment the last round finishes, your results are already there — volume, time under load, intensity. Compare today to last week. See the trend. Know when to push and when to back off.

_Training data that earns its keep, without any manual entry._

---

## 3. First Example — 3 × 10 Pushups

**What it answers:** "Show me, don't tell me."

Walk a single, ultra-simple workout through the entire lifecycle. Start with the most approachable script imaginable so nothing about the syntax gets in the way of understanding the cycle.

```
3 rounds
  10 Pushups
```

This example is the backbone of the whole live-demo section. Each scroll step advances one phase.

---

### Step 1 — Create Metrics in the Editor (Plan)

> Type it like you'd whiteboard it. Two lines. WOD Wiki parses every token automatically — `3 rounds` becomes a repeater, `10 Pushups` becomes a tracked rep block. No configuration needed.

_Visual cue: the editor with syntax highlighting on each token — round count · rep count · exercise label._

**The key insight to surface:**
Every line produces a **metric** — a named value the timer will count and the journal will record. The plan is not just text; it is the schema for your session's data.

---

### Step 2 — Annotate with Time in the Workout Timer (Execute)

> Press run. The timer walks the script top-to-bottom: start of round 1, 10 pushups counting up, rest, round 2, … Each transition is automatic. The overlay shows where you are in the workout at all times.

_Visual cue: live timer panel with the rep counter ticking toward 10, then the round badge advancing._

**The key insight to surface:**
The smart timer does not just count — it **annotates** each rep with a timestamp. When you finish, WOD Wiki knows exactly how long each set took. That annotation is what turns raw reps into training data.

---

### Step 3 — Seeing Results (Evolve)

> Three rounds of 10 pushups: 30 total reps, spread across N minutes and M seconds. The review panel shows the breakdown automatically — time per round, total work time, rest time. All from those two lines of text.

_Visual cue: the review/analytics panel with per-round segments and a total volume summary._

**The key insight to surface:**
The same script that planned the workout now explains the results. WOD Wiki closes the loop — write once, run it, see the data, refine the plan.

---

## 4. Features

**What it answers:** "What else can it do? Can I trust it?"

Four short capability cards. Each one names a real concern a serious athlete or coach would have and answers it concisely.

---

### 🔒 Your Data Stays with You

> WOD Wiki stores everything in your browser's local storage — IndexedDB on your device. There is no account, no server, no cloud sync unless you choose to export. Your training history belongs to you.

_Speaks to privacy-aware users and anyone burned by a platform shutting down._

---

### 📺 Chromecast — Built for Home Gyms

> Cast the live timer to any TV in your gym with one click. Full-screen display, readable from across the room. No app to install on the TV — just cast from your phone or laptop.

_Speaks to home-gym owners who need hands-free visibility._

---

### 📓 Automatic Journaling

> Every session you run is automatically logged with date, script, and results. Open any past entry, add notes, and update load records — all in the same notation. Your journal is a living record of your training, not a filing cabinet.

_Speaks to coaches and athletes who care about long-term progression._

---

### 📊 Data Analysis & Trends

> Pre-run: estimated total volume and time so you can calibrate intensity before you start. Post-run: actual vs. estimated, intensity over time, per-block breakdown. The numbers are always there; you decide what to do with them.

_Speaks to data-driven athletes and coaches who want evidence, not intuition._

---

### 🔗 Link Sharing

> Share any workout script with a URL. The recipient opens the link and the script is already in the editor, ready to run. No login, no account — just a link.

_Speaks to coaches who program for clients and communities._

---

## Tone Notes

- **Direct.** Coaches don't hedge. State facts, not possibilities.
- **Specific.** "30 total pushups in 4:12" beats "see your results."
- **Short sentences.** One idea per line. Write like a whiteboard, not a manual.
- **Cycle language.** Use **Plan → Execute → Evolve** consistently as the through-line across all three sections so the visitor internalises the loop by the time they reach the Features section.
