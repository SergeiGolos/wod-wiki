# Dogfood Report: WOD Wiki (wod.wiki)

**Date:** 2026-10-09
**Target:** https://wod.wiki (GitHub Pages, `server: GitHub.com`, HTTP 200; local DB `v1791515911111 · schema 7`, per Settings → System)
**Scope:** Full site — landing page/canvas, guide chapters, journal note CRUD, properties/tags/YAML, note relationships & named pages, clone, workout clock (Run/Next/Stop/Exit), Sessions, Efforts, Playgrounds, Collections, Catalogs, Dashboards, Settings, command palette (⌘K), sidebar WQL/text search, 404/deep-link behavior, edge cases (long text, XSS-style title, rapid clicking), mobile viewport (390×844)
**Tester:** Agent (exploratory QA)

## Executive Summary

WOD Wiki is a polished local-first workout-wiki SPA. Note creation/editing/persistence, markdown+` ```time ` rendering, properties/tags with YAML frontmatter, form validation, empty states, search views, and mobile layout all work well — including graceful handling of an XSS-style note title and 40k-character notes. However, one core promise is broken: **completed workout runs are never persisted** — the clock claims "N results logged" and docs say "Stop to save your results", yet the Sessions store stays empty (silent data loss). Unknown routes render a completely blank white page instead of a 404 view. A few smaller data-consistency and UX issues exist around cloning, journal list counts, and search affordances.

The single most important fix: make run results actually persist (and show in Sessions), or stop telling the user results were logged.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 1 |
| Medium   | 3 |
| Low      | 3 |
| **Total**| 8 |

| Category | Count |
|----------|-------|
| Functional    | 4 |
| UX            | 3 |
| Console       | 1 |
| Visual        | 0 |
| Accessibility | 0 |
| Content       | 0 |

## Issues

### 1. Completed workout runs are never persisted ("results logged" but Sessions store stays empty)

- **Severity:** Critical
- **Category:** Functional
- **URL:** https://wod.wiki/notes/<note-id> (Run overlay) → https://wod.wiki/sessions
- **Description:** Running a ` ```time ` block to completion shows "5 results logged" in the clock UI, and the onboarding copy says "Use Stop to save your results". After clicking Stop (and separately Exit), the note is unchanged, no save confirmation/toast appears, the Sessions page shows "No completed session results recorded in this period" (also with time window removed / All time), and IndexedDB inspection shows the `sessions` object store count = 0 after three complete runs. The guide (Run, Track & Capture) says recorded values "land in the fact store", so persistence is the intended behavior. Completed workout data is silently lost.
- **Steps to reproduce:**
  1. Create a journal note containing a ` ```time ` block (e.g. `0:03 Count Down` / `10 Pushups`).
  2. Click **Run**, then **Next** through countdown and pushups until "End of section" (UI shows "5 results logged").
  3. Click **Stop** (repeat also with **Exit**).
  4. Open Sessions (`/sessions`) — 0 of 0, "No completed session results recorded in this period."
  5. (Verification) `indexedDB` `wodwiki-db` → `sessions` store count is 0; `events` store also 0.
- **Expected:** Stopping/completing a run persists the session and its recorded metrics; Sessions lists it; some save confirmation is shown.
- **Actual:** Nothing is persisted; UI claimed "results logged".
- **Console errors:** Only SPA-fallback 404 resource errors (see issue 8); no JS exception observed.
- **Screenshot:** screenshots/21-timer-running.png, screenshots/40-run2-end.png (end state, "5 results logged"), screenshots/42-sessions-after-run.png, screenshots/43-sessions-alltime.png
- **Note:** Verified across 3 full runs (Stop ×2, Exit ×1). If a distinct "save" affordance exists, it is undiscoverable in the clock UI.

### 2. Unknown routes render a completely blank white page (no 404 UI)

- **Severity:** High
- **Category:** UX
- **URL:** https://wod.wiki/definitely-not-a-page-xyz (any unmatched route)
- **Description:** Loading a nonexistent top-level route returns the GitHub Pages 404 fallback and the SPA boots to an entirely empty white page (`document.body.innerText` is empty) — no message, no navigation, no way back except the browser back button. Compare with `/notes/<unknown-uuid>`, which correctly shows "Note not found. Go back". Since all server-side deep links on this site go through the 404 fallback, a mistyped or stale link produces what looks like a crash.
- **Steps to reproduce:**
  1. Open a fresh browser profile.
  2. Navigate directly to https://wod.wiki/definitely-not-a-page-xyz
  3. Observe blank white page (server responds HTTP 404).
- **Expected:** A styled "Page not found" view with a link home (same as the existing "Note not found" view).
- **Actual:** Blank white page; zero UI.
- **Console errors:** 404 resource load error (hosting fallback).
- **Screenshot:** screenshots/48-404-page.png

### 3. Cloning a note keeps the same named-page slug — two notes share one /p/ link

- **Severity:** Medium
- **Category:** Functional
- **URL:** https://wod.wiki/notes/<note-id> (Clone dialog)
- **Description:** The Clone dialog pre-fills "Named page" with the source note's slug (`qa-test-page`). Confirming creates a second note that displays `/p/qa-test-page` in its header, but that URL actually resolves to the *original* note. No duplicate-slug warning or conflict resolution is offered, so the clone advertises a link that points elsewhere.
- **Steps to reproduce:**
  1. On a note, open "Note relationships", set Named page to `qa-test-page`, Save.
  2. Click **Clone** (dialog pre-fills the same slug) and confirm.
  3. The clone's header shows `/p/qa-test-page`; navigating to `/p/qa-test-page` opens the original note, not the clone.
- **Expected:** Clone clears the named-page field by default, or warns/blocks on duplicate slug.
- **Actual:** Duplicate slug silently accepted; misleading link on the clone.
- **Console errors:** None
- **Screenshot:** screenshots/31-clone.png (dialog with pre-filled slug), screenshots/32-clone-result.png (clone showing same slug)

### 4. Journal "All entries" undercounts notes on a day with multiple notes

- **Severity:** Medium
- **Category:** Functional
- **URL:** https://wod.wiki/journal (All entries view)
- **Description:** With two journal notes dated 2026-10-09 (original + clone), the journal day page (`/journal/2026-10-09/`) correctly says "2 notes", but Journal → All entries shows ":note · 1 of 1" and "Today — 1 entry", listing only one. The "All" (catalog-wide) view with a text query correctly shows both ("2 of 2", "Today 2 entries"), so the Journal All-entries query/grouping drops the second note.
- **Steps to reproduce:**
  1. Create two journal notes with the same date (e.g. via Clone keeping the default date).
  2. Open Journal → All entries: 1 entry shown.
  3. Open `/journal/<date>/`: 2 notes shown.
- **Expected:** All entries lists all notes for the day.
- **Actual:** Only one entry listed.
- **Console errors:** None
- **Screenshot:** screenshots/34-all-entries-hover.png ("1 of 1"), screenshots/38-journal-day.png ("2 notes"), screenshots/62-contradictory-count.png (All view shows 2 of 2)

### 5. Command Palette "FIND" searches only static pages; note content queries always return "No results"

- **Severity:** Medium
- **Category:** UX
- **URL:** Any (⌘K / Search palette)
- **Description:** The palette presents itself as "Search and navigate" with WQL scope chips defaulting to `journal|collection`, but its FIND mode matches only static pages (e.g. "First Workout" → /guide/start). Searching for note titles or content that demonstrably exists ("PW Test", "pushup", "fran" — 732–1004 notes in scope) always yields "No results for …". The working content search lives in the sidebar/WQL `text:` filter, so users are directed to a dead end.
- **Steps to reproduce:**
  1. Press Ctrl+K (or click Search…).
  2. Type `pushup` (present in many bundled workouts) → "No results".
  3. Type `First Workout` → page results appear.
  4. Compare: sidebar "Text query..." in the All view with `pushup` → 26 of 1004 results.
- **Expected:** Palette find covers notes/collections per its displayed scope, or clearly indicates it searches pages only.
- **Actual:** "No results" for any note-content query.
- **Console errors:** None
- **Screenshot:** screenshots/17-search-fran.png (no results), screenshots/20-search-firstworkout.png (page results), screenshots/18-all-query.png (WQL text search works)

### 6. Sidebar CONTAINS clause badge shows "0" even when the query has matches

- **Severity:** Low
- **Category:** UX
- **URL:** https://wod.wiki/journal (All view with text query)
- **Description:** After typing a text query, the clause chip shows a "0" badge (e.g. `PW Workout  0`) while the results pane simultaneously reports "2 of 2" matching notes. Contradictory counters in the same panel.
- **Steps to reproduce:** Journal → All → type "PW Workout" in "Text query...".
- **Expected:** Badge reflects the match count (or is omitted).
- **Actual:** Badge always reads 0.
- **Console errors:** None
- **Screenshot:** screenshots/62-contradictory-count.png

### 7. "New effort" validation message is misleading when `met` is misplaced in YAML

- **Severity:** Low
- **Category:** UX
- **URL:** https://wod.wiki/e/new?mode=create
- **Description:** The effort template nests `met` under `baseAttributes:`. Submitting YAML with a top-level `met: 5` fails with "Invalid met: must be a positive number", implying the value is wrong rather than the key placement; the first (empty) submission only lists "Missing required field: slug, label" and never mentions `met`/`baseAttributes`. Valid submission with the default template structure works fine.
- **Steps to reproduce:** Efforts → New effort → replace template with frontmatter containing `slug`, `label`, and top-level `met: 5` → Create Effort.
- **Expected:** Error names the actual problem ("missing baseAttributes.met").
- **Actual:** "Invalid met: must be a positive number" despite a positive number being present.
- **Console errors:** None
- **Screenshot:** screenshots/58-new-effort-empty.png, screenshots/59-effort-created.png (error), screenshots/61-effort-created-ok.png (success)

### 8. Console 404 resource errors on every SPA deep-link boot (hosting fallback noise)

- **Severity:** Low
- **Category:** Console
- **URL:** Any deep link (e.g. /notes/<id>, /collections, /sessions loaded directly)
- **Description:** Every direct load of an app route logs `Failed to load resource: the server responded with a status of 404 ()` before the SPA fallback boots. Functional impact: none (app loads correctly) — this is the known GitHub Pages hosting behavior, recorded for completeness; it can mask real errors in the console.
- **Expected:** Ideally a 200-serving fallback (e.g. hash routing or custom 404 that doesn't error), acceptable as-is.
- **Actual:** Console 404 on each deep-link load.
- **Screenshot:** (console error text recorded; no visual symptom)

## Expected behavior — NOT flagged (per known context)

- Directly loading `/notes/<uuid>` or `/p/<slug>` in a browser lacking the local vault returns server 404 → SPA fallback → "Note not found. Go back". Verified identical to the known description, including for named pages (`/p/qa-test-page` in a fresh browser profile → "Note not found."). Considered expected local-first behavior. Minor observation (not counted as an issue): the app generates "Copy link"/named-page links without any hint that they won't resolve for other browsers/profiles.
- `/guide/*`, `/collections`, `/sessions`, `/journal` deep links return server 404/301 but boot correctly via the SPA fallback — expected.

## What works well (verified, no issues)

- Note create (Blank/Template/Source tabs; Template empty-state "No templates available. Choose Blank or Source." with Create correctly disabled; Source tab validates required collection before enabling Create).
- Editing & persistence across reload (CodeMirror), including a ~40k-character note; no crash or data loss.
- XSS-style note title (`<script>alert(1)</script>`, emoji, quotes, CJK) rendered as escaped plain text — no injection.
- Properties with autocomplete + YAML frontmatter sync (`category: [strength]` verified in "Edit YAML"); Add tag UI present.
- Workout clock: Run → countdown → blocks → Next/Stop/Pause/Exit all functional; calculated metrics (MET-MIN, SESSION LOAD, TIS) render live; fullscreen overlay intercepts rapid repeated Run clicks safely (no duplicate overlays).
- Clone flow otherwise works (journal copies/related workouts backlinks appear).
- WQL views (All, Collections, Catalogs, Efforts, Dashboards) with filters/grouping; graceful handling of invalid input ("No results for @@@invalid wql###"; "ignores 'source:'" hint with supported keys listed).
- Mobile (390×844): responsive layout, no horizontal overflow, hamburger drawer navigation works, search FAB present.
- Footer links (Start the guide, Source, License, Support) resolve; "Collections" footer link 404s only on server HEAD request but boots fine in-app (hosting limitation).
- No pageerrors/uncaught JS exceptions observed in any flow.

## Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Run results never persisted despite "results logged" | Critical | Functional | /notes/<id> Run → /sessions |
| 2 | Unknown routes render blank white page | High | UX | /definitely-not-a-page-xyz |
| 3 | Clone keeps duplicate named-page slug | Medium | Functional | /notes/<id> Clone dialog |
| 4 | Journal All entries undercounts multi-note days | Medium | Functional | /journal |
| 5 | Command Palette FIND ignores note content | Medium | UX | ⌘K palette |
| 6 | CONTAINS clause badge stuck at "0" | Low | UX | /journal (All view) |
| 7 | Misleading "Invalid met" validation message | Low | UX | /e/new |
| 8 | Console 404 noise on SPA deep-link boot | Low | Console | any deep link |

## Testing Notes

**Tested:**
- Landing page + canvas, all 8 guide chapters via sidebar nav, all left-nav sections (Home, Journal, Catalogs, Collections, Playgrounds, Dashboard, Efforts, Sessions, Profile/Settings incl. Appearance/System).
- Journal note lifecycle: create (Blank/Template/Source), edit, markdown + ` ```time ` rendering, reload persistence, properties/tags/YAML, note relationships (journal date, named page /p/<slug>, source note), clone. **Delete:** no per-note delete affordance was found anywhere (note page, list hover/context menu, dialogs) — only the global "Reset & Clear Cache" wipe in Settings → System. If a delete exists, it is undiscoverable.
- Workout clock end-to-end (3 full runs), command palette (valid + invalid + content + page queries), sidebar WQL/text queries, new-effort form (empty, invalid, misplaced-key, valid submissions).
- Edge cases: XSS/emoji/CJK title, ~40k-char note, rapid repeated Run clicks, unknown routes, named-page deep link in a fresh profile, mobile 390×844 viewport.

**Not tested / out of scope:**
- Audio feedback, clipboard "Copy link" payload contents, Markdown export download contents, Dashboard query editing in depth, Playground creation flow (opened but not exercised), multi-tab sync, accessibility audit (no screen-reader tooling).

**Blockers and limitations:**
- **No console-inspection or DOM-snapshot tool in the provided browser toolset** — console findings come from a parallel Playwright-driven Chromium instance (used for editor typing, IndexedDB inspection, and mobile emulation); screenshots 07+ were captured via Playwright because the standalone `browser_screenshot` tool re-navigates and loses SPA state on `/notes/<uuid>` URLs (server 404). Evidence for SPA-state screens was captured via `download_screenshot_path` on interactions where possible.
- The tool browser's `browser_input` does not type into the CodeMirror editor (text silently not entered) — editor testing was done via Playwright instead.
- Session-persistence finding (issue 1) is verified by UI + IndexedDB store counts; if a separate explicit save step exists, it was not discoverable in the clock UI or guide copy.
- Test fixtures (notes "PW Test Note", "QA Test <script>...", effort "qa-effort") remain in the test browser profiles' local vaults; the app offers no per-note delete to clean them up (see Testing Notes above).
