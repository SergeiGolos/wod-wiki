# Home Page Walkthrough

Reference for the home page (`/`). The page is a top-to-bottom product walkthrough: a live hero, a 1300vh editor/timer/analytics runway, a six-slide syntax chapter runway, then static registry and reference sections.

## How to read this document

- **Source path** is the path declared by the canvas Markdown. `wods/...` is the runtime asset path; the repository copy lives under `markdown/canvas/...`.
- **Code** is the Markdown source loaded into the slide's editor. The first three home slides and all timer slides use the home demo source.
- **Highlight focus** is the `ring.key` / `ring.tag` target framed by the highlight box. `—` means the slide has no highlight target.
- **Typeahead** identifies whether the slide's intended focus is editor autocomplete. The editor remains capable of editing on later editor slides, but those slides are not typeahead-focused.
- The chapter runway uses a typewriter editor transition. That is **not** the same as typeahead autocomplete.

Implementation entry points:

- `playground/src/views/HomeView.tsx` mounts `HomeTour` for `/`.
- `playground/src/tour/HomeTour.tsx` orders the hero, short-circuit strip, main runway, chapter runway, registry, and reference sections.
- `markdown/canvas/home/README.md` defines the main runway and chapter runway.
- `playground/src/tour/TourCaptions.tsx` supplies the detailed slide text and workout presets.

## Top-to-bottom page order

1. Hero headline and live demo editor.
2. Short-circuit navigation strip.
3. Main parallax runway: editor → timer → analytics.
4. Learn the Language / six-chapter runway.
5. The Movement Registry.
6. Quick Reference.
7. Telemetry consent footer.

## Hero — live demo above the parallax runway

The hero is not one of the normalized runway stages. It is a separate live `welcome-1.md` editor rendered by `TourHero`.

**Visible headline:**

- Write it in **Markdown**
- Run it as a **Timer**
- Own the **Metrics**
- **Explore** your analytics

**Supporting text:** WOD Wiki compiles a <code>```time</code> block into a live Clock timer, then logs every round back to the training journal.

**Typeahead:** No. The hero editor is editable and runnable, but the dedicated typeahead slide is the first main runway slide below.

**Highlight focus:** —

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code loaded:**

```time
0:03 Count Down
10 Pushups
```

The source also includes the Markdown heading and Run hint:

> proposed:  Mark this as editable playground  and the update the logic of the page just for defult rout with no load redirect loads the markdown bellow, but the load route with the zipped still creates the wrapper text (with the hello from the sender if encoded)
````markdown
# 👋 Editable Playground

```time
0:03 Count Down
10 Pushups
```

> Press **Run** ↑ to start the Clock.
````

## Short-circuit strip — direct exits


> proposed: this strip shouldn't be a strip, it should be a seperate  sliding section that should take up about half the height of the view page it should be a visible and eye catching part of the view allowing user to jump to the different sub views.  we shoud provde a predefined link to the feeds, with a note, that this is a work in progress in small sub text for the ection, a collections libary and the create new note with a start your own jounral langage.  

This strip appears immediately below the hero and is navigation rather than a parallax slide.

**Text:** `Know where you're going?` · `Jump to the Library` · `New note` · `— or keep scrolling ↓`

**Source path:** —

**Code:** —

**Highlight focus:** —

**Typeahead:** No.

## Main parallax runway

The main runway is declared in the first <code>```scroll</code> block in [`markdown/canvas/home/README.md`](../markdown/canvas/home/README.md). It spans normalized progress `0.0` to `1.0` over `1300vh`. The same source is loaded into the editor for the editor and timer slides.

> proposed: i  want to split this up into 4 different sections with a pre header section  about the have screen size to scroll past with a high level summary of each  this correlates closely to the  4 levels addressed int he tagline, and reuse the formating before each section in that header fomr 
 Write it in **Markdown**
  Run it as a **Timer**
  Own the **Metrics**
  **Explore** your analytics
>  

## Slide 1 — Blank Page & Typeahead

**Progress:** `0.00–0.12`

**Screen:** Editor

**Label:** Blank Page & Typeahead

**Text:** Start with a Blank Page. Freeform entry & WOD fences. WOD Wiki notes are freeform Markdown. To get live timer execution and metric tracking, open a fenced block with triple backticks — <code>```time</code> for workouts or <code>```wql</code> for queries.

**Typeahead:** **Yes — this is the dedicated typeahead slide.** The caption says live type-ahead autocomplete completes the workout as the user types. The slide also exposes the choose-your-own-adventure preset combobox.

**Highlight focus:** `editor.window` — **Live Editor**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 2 — Every Line Collects Metrics

**Progress:** `0.12–0.24`

**Screen:** Editor

**Label:** Every Line Collects Metrics

**Text:** Every line collects metrics: reps, distance, load resistance, and timed rest. The detailed caption calls out rep scaling such as `21-15-9`, distance such as `400m Run`, load such as `24kg` or `225lb`, and `*:30 Rest`.

**Typeahead:** **No.** This is a metric-interpretation slide, not an autocomplete slide.

**Highlight focus:** `editor.wodBlock` — **Line Metrics**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 3 — Press Run to Start

**Progress:** `0.24–0.36`

**Screen:** Editor

**Label:** Press Run to Start

**Text:** Press Run to execute the block. The working clock launches and the script becomes an active workout.

**Typeahead:** **No.** The focus is the Run action.

**Highlight focus:** `editor.runButton` — **Run Button**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 4 — What Happens When It Runs

**Progress:** `0.36–0.47`

**Screen:** Timer

**Label:** What Happens When It Runs

**Text:** The script becomes the clock. The Clock runs the exact script, stepping through reps, distance, and load without forced countdown caps.

**Typeahead:** **No.** The editor has been replaced by the timer screen.

**Highlight focus:** `timer.floor` — **Clock**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 5 — Advance Rounds with Next

**Progress:** `0.47–0.57`

**Screen:** Timer

**Label:** Advance Rounds with Next

**Text:** Each Next click advances to the next movement or round and locks elapsed time into the collected metrics as a split. Completing the run moves into analytics.

**Typeahead:** **No.** The focus is timer progression and split recording.

**Highlight focus:** `timer.nextButton` — **Next Button**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 6 — Cast to the Big Screen

**Progress:** `0.57–0.65`

**Screen:** Timer

**Label:** Cast to the Big Screen

**Text:** The running Clock mirrors to Chromecast or a shared screen. The receiver shows the movement stack and live Clock so the room follows the same rep.

**Typeahead:** **No.** The focus is casting and shared pacing.

**Highlight focus:** `timer.castButton` — **Cast**

**Source path declared by the page:** `wods/examples/home/welcome-1.md`

**Repository source:** [`../markdown/canvas/home/welcome-1.md`](../markdown/canvas/home/welcome-1.md)

**Code:**

```time
0:03 Count Down
10 Pushups
```

## Slide 7 — Query What You Just Did

**Progress:** `0.65–0.72`

**Screen:** Analytics

**Label:** Query what you just did

**Text:** WQL turns the journal into queryable facts. Choose an aggregator and metric, filter by tag, group by a dimension, and roll up over time. The same query elements drive every analytics presentation in the window.

**Typeahead:** **No.** This is the analytics vocabulary slide.

**Highlight focus:** `analytics.vocab` — **WQL elements**

**Source path:** —. Analytics uses the live journal/query showcase rather than a source Markdown workout file.

**Code:** —

## Slide 8 — Read It as a List

**Progress:** `0.72–0.79`

**Screen:** Analytics

**Label:** Read it as a list

**Text:** One aggregator, one metric, and one dimension can produce a ranked table, such as total reps grouped by effort. Query chips show the parsed vocabulary.

**Typeahead:** **No.** The focus is table presentation.

**Highlight focus:** `analytics.table` — **Table list**

**Source path:** —

**Code:** —

## Slide 9 — See It as Trends

**Progress:** `0.79–0.86`

**Screen:** Analytics

**Label:** See it as trends

**Text:** Roll the same facts up by week and they become a timeseries. The graph is a rollup of queryable facts rather than a separate data feature.

**Typeahead:** **No.** The focus is timeseries presentation.

**Highlight focus:** `analytics.graphs` — **Graphs**

**Source path:** —

**Code:** —

## Slide 10 — Compose a Dashboard

**Progress:** `0.86–0.93`

**Screen:** Analytics

**Label:** Compose a dashboard

**Text:** A dashboard is N queries on one screen. Mix values, lists, and graphs; each tile is its own WQL statement.

**Typeahead:** **No.** The focus is composing query tiles.

**Highlight focus:** `analytics.dashboard` — **Dashboard**

**Source path:** —

**Code:** —

## Slide 11 — It’s Your Data

**Progress:** `0.93–1.00`

**Screen:** Analytics

**Label:** It’s your data

**Text:** Every widget executes against the live journal. Until the user has logged work, the showcase displays sample answers. The user can open Dashboards to query anything their way.

**Typeahead:** **No.** The focus is live-data ownership.

**Highlight focus:** —. The final stage has no `ring` target in the Markdown spec.

**Source path:** —

**Code:** —

## Learn the Language — chapter runway

After the main runway, the page renders the second <code>```scroll:chapters</code> block from the home Markdown. It is a six-slide syntax runway with an editor window, typewriter transitions, chapter badges, and chapter quest progress. These slides are **not typeahead-focused**; their editor content is a runnable example for the chapter.


> proposed : this is where we need to wrapp this up, it is getting too long.  the rest of the examples shgold be a link from the learn the languge.  what i inveision,  you replace all the slide past examples with a single slide that has eac of the chapers as stiulaized doule buytton a select as a primary that makes the example load in a single eddtors that is shared and a second smallar link out button that takes you to learn more on the special documents section that walks though the syntaxin detail for it.  

## Slide 12 — Basics

**Progress:** `0.000–0.166` within the chapter runway

**Screen:** Editor

**Text:** Statements and metrics — how a workout line reads, from rounds to reps.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Basics example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/examples/syntax/single-movement.md`

**Repository source:** [`../markdown/canvas/syntax/single-movement.md`](../markdown/canvas/syntax/single-movement.md)

**Code:**

```time
Pushups
```

## Slide 13 — Protocols

**Progress:** `0.166–0.333` within the chapter runway

**Screen:** Editor

**Text:** Countdowns, AMRAPs, and EMOMs — timing protocols that pace a workout.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Protocols example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/examples/syntax/timers-rest.md`

**Repository source:** [`../markdown/canvas/syntax/timers-rest.md`](../markdown/canvas/syntax/timers-rest.md)

**Code:**

```time
5:00 Run
*:30 Rest
10 Burpees
```

## Slide 14 — Structure

**Progress:** `0.333–0.500` within the chapter runway

**Screen:** Editor

**Text:** Rounds, groups, and nesting — how blocks compose a workout.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Structure example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/examples/syntax/groups-1.md`

**Repository source:** [`../markdown/canvas/syntax/groups-1.md`](../markdown/canvas/syntax/groups-1.md)

**Code:**

```time
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
```

## Slide 15 — Custom Metrics

**Progress:** `0.500–0.666` within the chapter runway

**Screen:** Editor

**Text:** Reps, loads, and custom metrics — what gets tracked per movement.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Custom Metrics example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/syntax/custom-metrics-1.md`

**Repository source:** [`../markdown/canvas/syntax/custom-metrics-1.md`](../markdown/canvas/syntax/custom-metrics-1.md)

**Code:**

```time
5 Back Squat 225lb {"intensity": 80}
```

## Slide 16 — Dialects

**Progress:** `0.666–0.833` within the chapter runway

**Screen:** Editor

**Text:** Run, climb, and strength dialect tags specialize a block.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Dialects example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/examples/syntax/dialect-climb-bouldering.md`

**Repository source:** [`../markdown/canvas/syntax/dialect-climb-bouldering.md`](../markdown/canvas/syntax/dialect-climb-bouldering.md)

**Code:**

```log:climbing
date: 2026-05-26
location: "Sender One LAX"
discipline: bouldering
duration: 2.5
rpe: 8
energy: 7

(Warmup)
  [Slab Warmup] V0 flash @1 // quiet feet
  [Jug Ladder] V2 flash @1

(Project)
  [The Shield] V7 redpoint @12 // engage core before crux reach
```

## Slide 17 — Complex Workouts

**Progress:** `0.833–1.000` within the chapter runway

**Screen:** Editor

**Text:** Multi-set swimming intervals with rest recovery.

**Typeahead:** **No.** Typewriter editor transition only.

**Highlight focus:** `ring.tag` — **Complex example**. No `ring.key` is declared in the home Markdown.

**Source path declared by the page:** `wods/examples/syntax/complex-swimming.md`

**Repository source:** [`../markdown/canvas/syntax/complex-swimming.md`](../markdown/canvas/syntax/complex-swimming.md)

**Code:**

```time
(4) Power Sprints
  25m Freestyle Sprint
  1:30 Rest

(6) IM Main Set
  100m IM
  :45 Rest

150m Cooldown
```

## Static section — Learn the Language progress footer

The chapter runway header is **Learn the Language**. It provides Start Lesson 1, a Cheat sheet link, and progress chips for the six chapter guides. It is part of the chapter section rather than a separate slide.

**Source path:** —

**Code:** —

**Highlight focus:** —

**Typeahead:** No.

## Static section — The Movement Registry

> proposed: This needs to be a more promanat section that lives right under know wher eyou going? section and ebfore the first of the proposed 4 sections about the readme.    it needs to be re-imagined as a  about metrics and efforts that explain what metrics and efforts are using the slide in over with the box with a 3 slide section to add to the abote lising of the 4... basicllse 
> 
> header section: everything is a well structured subheading that expaint that everything is a metrics associated with efforts and micro data points that are copmosed into the felxables analytics engine.
> 
> slide 1: shows some example time section with some obviaes examples of effort ahgve the box highlight over the effort as it slide in, explaint hat they tracking this  is effort,
> 
    Slide 2 and have some metrics like weight or distance in teh xample and  
Slide 3and identify how ther compoiunds as efforts against the metrics and the runtime mesuremnts for creating reach analitics log
> the resutn to the firs sections about the Mrkadown.
> 

**Text:** The Movement Registry. Every movement your metrics speak in. The section previews strength, gymnastics, rowing, kettlebell, running, swimming, and a `+4` count, with a Browse the registry link.

**Source path:** —

**Code:** —

**Highlight focus:** —

**Typeahead:** No.

## Static section — Quick Reference

> Propose: don't need this seciton remove

**Text:** Quick Reference. Look it up in seconds. The construct grid is followed by Search everything (`⌘/`) and Open the cheat sheet.

**Source path:** —

**Code:** —

**Highlight focus:** —

**Typeahead:** No.

## Static section — Telemetry consent footer
> Propose: don't need this seciton remove

The page ends with `TelemetryConsentFooter`. It is not a slide and has no workout source or highlight box.
