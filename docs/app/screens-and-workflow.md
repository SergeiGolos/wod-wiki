# Application Screens & Workflow

The WOD Wiki application follows a continuous loop: **Plan → Track → Analyze**. The same metric flows seamlessly from authoring, to live clock execution, to long-term analytics.

---

## 1. PLAN — Author & Structure Work

* **Universal Note Editor (`/notes/:noteId`, `/playground/:id`)**:
  - Live CodeMirror 6 markdown editor with syntax highlighting, inline button decorations, and real-time linting.
  - Side companion panel for frontmatter metadata, embed previews (YouTube, Strava), and typed tags typeahead chips.
  - Quick-run launcher for any fenced ` ```time ` workout block.
* **Collections Library (`/collections`, `/c/:slug`)**:
  - Curated workout libraries and historical programs (e.g. CrossFit Girls, Steve Cotter Kettlebell, Swim WODs).
  - Inspect workouts, clone them to your personal journal, or launch directly on the clock.
* **Effort Movement Catalog (`/efforts`, `/effort/:slug`)**:
  - Explore movements with physiological MET multipliers, discipline tags, and intensity tiers.

---

## 2. TRACK — Execute on the Clock

* **Fullscreen Timer & Clock (`/run/:runtimeId`)**:
  - JIT-compiled execution runtime managing timer countdowns, round increments, and interval transitions.
  - Sound cues (chimes, 3-2-1 countdowns) and casting integration.
  - Live input for completed reps, load adjustments, and subjective RPE ratings.
* **Stream Capture**:
  - Every completed segment emits raw output statements streaming directly into IndexedDB `EventRecord` rows.

---

## 3. ANALYZE — Review & Query

* **Session Detail (`/sessions/:sessionId`)**:
  - Breakdown of round splits, completed reps, and total elapsed duration.
  - Tabular output statement view and derived session load.
* **Journal History (`/journal`, `/journal/:date`)**:
  - Calendar stream grouping workouts onto daily date pages (`/journal/YYYY-MM-DD`).
  - Powered by the `page_notes` junction table.
* **Composed Dashboards (`/dashboard`, `/dashboard/:slug`)**:
  - Visual charts (timeseries, bar, toplist, summary cards) powered by embedded WQL queries.
  - Real-time filtering by effort, discipline, or custom tag dimensions.
* **Settings & Tags Management (`/settings`, `/settings/tags`)**:
  - Appearance and audio preferences.
  - Registered tag types CRUD and full filterable/editable tags table.
