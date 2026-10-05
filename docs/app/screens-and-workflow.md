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


### Journal notes

Use the `+` in the L1 rail or mobile navigation to create a journal note. Choose a date and start blank, from a stored template, or from a collection or feed item. Creation opens the new note in edit mode. Each note has its own identity and content; notes on the same date share one calendar page at `/journal/YYYY-MM-DD`.

Date pages also offer **New note**, including on empty dates. Open a note's title to reach its individual editor. **Note relationships** changes or clears its calendar date, named-page link, or source note without changing its identity. Changing a named-page link does not rename the shared page or move other notes.

**Clone** creates an independent copy on another date or named page and links back to the original note. Editing the copy leaves the original unchanged. Workout results and attachments are not copied. Mobile forms use bottom sheets with scrolling fields and fixed actions; template selection reports an empty state when no templates are stored.

### Note editing

Properties inputs suggest registered property names and typed tag values. General tag inputs suggest tags across types and exclude existing chips. Focus and Ctrl+Space open all available suggestions; typing filters them. Arrow keys select an option, Enter or Tab accepts it, and Escape closes the list. Add tag focuses an existing tag input or opens a draft; no empty property is saved until a tag commits. Escape cancels the draft, and duplicate tag values are ignored case-insensitively.

Edit YAML reveals the note's frontmatter source without changing its contents. Moving the caret into the body restores the Properties widget. Raw YAML supports property scaffolds and tag completion. Accepting a property opens its value list; deleting a filter to empty shows all values again. Tab accepts a highlighted completion rather than indenting. Enter on an empty inline or list value creates a newline regardless of completion latency. Enter with a typed filter accepts the selected suggestion. Completion stops at the closing frontmatter fence.

Entering edit mode focuses the editor. Arrow keys move between visual rows, including wrapped paragraphs; Shift+ArrowUp extends selection by one row, and Home on an empty line stays there.

Workout metrics refresh on the current line as it changes. Movement names are parsed live, not autocompleted. Newly saved notes retain exact source fragments, including blank lines, fence spelling, trailing whitespace, and line endings; older notes retain their legacy reconstruction until saved.

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

## WQL editing

Find target (`note`, `block`, `effort`, `session`, `segment`, `event`), query kind (Find or Measure), and Where stored (`source:`) are separate choices. Changing storage scope does not change the target. Settings favorites prioritize choices; they do not define valid WQL.

The draft string is authoritative. Chips project its AST; editing one clause preserves unrelated filters, grouping, units, time windows, joins and presentation pipes. Edit WQL retains exact invalid or unsupported text. Invalid drafts cannot execute or save. Kind/target changes that discard incompatible clauses require confirmation.

- Add condition and chip editing use the same searchable value picker. Opening it does not insert an empty clause.
- Arrow keys select an active option; Enter chooses it or the exact typed value. Ctrl/Command+Enter submits the current valid draft. Tab and Shift+Tab move native focus; Escape closes one editor level and returns focus to its opener.
- Empty-input Backspace focuses the preceding chip. Delete/Backspace on that chip removes it; Undo removal restores the previous query.
- Group By is an ordered multi-selection. Move up/down controls change precedence; Done ends field editing without saving a host dialog.
- When WQL supplies grouping, View Settings names the controlling dimensions and offers Edit query. Its saved card-arrangement fallback becomes available again after WQL grouping is removed.

Inline stream edits update the query URL in one scratch history entry per editing spell; subsequent keystrokes replace that entry until an idle checkpoint. Back/Forward restores the explicit URL query without replaying pending text. Stream query dialogs keep a local draft until Apply; Cancel leaves the page unchanged. Explorer Run executes the latest draft, while Save chooses a destination. Widget and note-block editors write only through their final save action; a rejected write leaves the dialog open with its draft and error. Settings saves browser-local defaults and favorites, not the active page query; an explicit URL query takes precedence.

Mobile query dialogs use the existing sheet host: non-input initial focus, explicit Search, large selection targets, and final actions outside the scrolling body. Browser emulation checks layout and focus; it does not establish real iOS/Android keyboard or screen-reader behavior.
