# Live-App E2E Tests

Specs that exercise the real playground app routes (journal, playground, widgets, efforts, landing) rather than Storybook stories.

## How this group runs

- **Config:** `playwright.journal.config.ts` — `bun run test:e2e:journal` (collects `e2e/live-app/**/*.e2e.ts`; serial, one worker, 45s timeout).
- **Runs against:** the **playground app** — the Vite dev server (`bun run dev:app`) at `http://localhost:5173`, or `https://<HTTPS_HOST>:5173` when `.env.local` sets `HTTPS_HOST` (self-signed certs tolerated via `ignoreHTTPSErrors`). The config auto-starts the dev server, reusing a running instance.
- **CI/CD:** runs in PR CI via `_verify.yml` → `e2e` job (`bun x playwright test --config playwright.journal.config.ts`, `workers: 1`). Exception: `playground-widget-block-preview.e2e.ts` also runs in CI via `playwright.preview.config.ts`, invoked by the `Preview Deploy` workflow (`.github/workflows/preview-deploy.yml`) after each PR preview deploy, against `https://<branch-slug>.preview.wod.wiki`; the HTML report (with per-test screenshots) is published to the same S3 prefix at `/e2e-report/index.html` and linked from the PR comment. `preview-e2e.yml` also remains manually dispatchable against any URL.

# Vite dev app (:5173) — Journal & persistence

These specs exercise the live app's journal note lifecycle, workout runtime trigger, and IndexedDB result persistence.

## `e2e/live-app/collection-new-note-result.e2e.ts`

Dogfoods the full collection-workout → journal → timer → result persistence flow, asserting that results are saved under the full `journal/<date>` key and that no `NOTE_NOT_FOUND` errors surface.

### `clicking "Now" on a collection workout navigates to today's journal and opens the timer`
- **Location:** `e2e/live-app/collection-new-note-result.e2e.ts:112`
- **Target:** `/workout/crossfit-girls/fran` → `/journal/<today>`
- **Actions:** Clear today's note and results; goto collection workout; wait for blocks; click first `Now` button; navigate to today's journal.
- **Asserts:** URL matches `/journal/<today>`; journal note is created in `wodwiki-db` and contains `fran`; timer close button is visible; no `NOTE_NOT_FOUND` errors.

### `result is saved under journal/<date> key in wodwiki-db after workout complete`
- **Location:** `e2e/live-app/collection-new-note-result.e2e.ts:158`
- **Target:** `/journal/<today>`
- **Actions:** Clear results; goto today's journal; inject a completed result into `wodwiki-db` with `noteId: journal/<today>`; navigate away and back.
- **Asserts:** Result is retrievable under the full `journal/<date>` key; result survives navigation and is not wiped on journal load.

### `completing a workout on JournalPage does not throw NOTE_NOT_FOUND`
- **Location:** `e2e/live-app/collection-new-note-result.e2e.ts:207`
- **Target:** `/journal/<today>`
- **Actions:** Clear results; goto today's journal (which does not exist in `wodwiki-db`); wait for page load.
- **Asserts:** No `NOTE_NOT_FOUND` errors occur during journal page load.

### `full flow: collection workout → journal created → timer opens without errors`
- **Location:** `e2e/live-app/collection-new-note-result.e2e.ts:232`
- **Target:** `/collections` → `/collections/crossfit-girls` → `/workout/crossfit-girls/fran` → `/journal/<today>`
- **Actions:** Clear state; navigate via collections to the Fran workout; click `Now`; wait for journal page and timer.
- **Asserts:** Journal note is created; timer close button is visible; no `NOTE_NOT_FOUND` errors during the entire flow.

## `e2e/live-app/note-persistence-save-load.e2e.ts`

Exercises the note persistence seam end-to-end through IndexedDB: content round-trips, workouts start without persistence errors, results survive reloads, and static pages do not trigger `NOTE_NOT_FOUND`.

### `note content persists across navigation and reload`
- **Location:** `e2e/live-app/note-persistence-save-load.e2e.ts:104`
- **Target:** `/journal/2099-08-01`
- **Actions:** Clear stored entry; goto journal date; type unique content; wait for debounce; navigate to journal list and back; hard reload.
- **Asserts:** Stored content contains the unique text after navigation and after reload; no `NOTE_NOT_FOUND` or `mutateNote` errors.

### `starting a workout opens a runtime session without persistence errors`
- **Location:** `e2e/live-app/note-persistence-save-load.e2e.ts:140`
- **Target:** `/journal/2099-08-02`
- **Actions:** Clear stored entry and results; goto journal date; replace editor content with a WOD block; open the Actions menu; click the workout play button.
- **Asserts:** Fullscreen timer appears; no `NOTE_NOT_FOUND` or persistence errors on start.

### `a seeded workout result survives a page reload`
- **Location:** `e2e/live-app/note-persistence-save-load.e2e.ts:183`
- **Target:** `/journal/2099-08-02`
- **Actions:** Clear stored entry and results; goto journal date; seed a completed result directly into `wodwiki-db`; navigate away and back; hard reload.
- **Asserts:** Result count remains 1 after navigation and reload; no `NOTE_NOT_FOUND` or `RESULT_NOT_FOUND` errors.

### `multiple workouts accumulate results without overwriting previous ones`
- **Location:** `e2e/live-app/note-persistence-save-load.e2e.ts:244`
- **Target:** `/journal/2099-08-03`
- **Actions:** Clear stored entry and results; pre-seed two results in `wodwiki-db`; goto journal date.
- **Asserts:** Both results remain in `wodwiki-db` after page load; no results are overwritten or deleted.

### `visiting a static syntax page causes no NOTE_NOT_FOUND errors`
- **Location:** `e2e/live-app/note-persistence-save-load.e2e.ts:285`
- **Target:** `/syntax`
- **Actions:** Reset error log; goto static syntax page; focus the read-only editor; wait.
- **Asserts:** Editor is attached; no `NOTE_NOT_FOUND` errors surface.

## `e2e/live-app/journal-entry.e2e.ts`

Validates the `/journal/:date` route against the intended empty-date UX (#698): an unseeded date shows an empty state — NO auto-seeded template, NO editor. Tests seed a journal note first (`seedJournalNote` in `e2e/helpers/wodwikiDb.ts`, which writes the V10/V11 `page` → `notes.pageId` → `segments` rows a date-page query needs), then drive the editor.

### `loads the note content for a seeded date`
- **Location:** `e2e/live-app/journal-entry.e2e.ts:58`
- **Target:** `/journal/2099-06-01`
- **Actions:** Clear stored entry; seed a journal note; goto journal date.
- **Asserts:** Editor contains the seeded content; no page errors.

### `saves content after waiting for debounce then navigating away` *(quarantined — #705)*
- **Location:** `e2e/live-app/journal-entry.e2e.ts:75`
- **Target:** `/journal/2099-06-02`
- **Actions:** Seed note; type unique text; wait 700ms; navigate to journal list.
- **Asserts:** Stored content contains the unique text; returning to the date shows the saved text.
- **Quarantined:** journal save corrupts stored content (segment pile-up on repeated saves) — defect #705.

### `saves content when navigating away before 500ms debounce fires` *(quarantined — #705)*
- **Location:** `e2e/live-app/journal-entry.e2e.ts:104`
- **Target:** `/journal/2099-06-03`
- **Actions:** Seed note; type unique text; immediately navigate to journal list.
- **Asserts:** Stored content contains the unique text despite the quick navigation.
- **Quarantined:** #705.

### `content persists across a hard page reload` *(quarantined — #705)*
- **Location:** `e2e/live-app/journal-entry.e2e.ts:130`
- **Target:** `/journal/2099-06-04`
- **Actions:** Seed note; type unique text; wait 700ms; hard reload.
- **Asserts:** Editor still contains the unique text after reload.
- **Quarantined:** #705.

### `page title reflects the journal date`
- **Location:** `e2e/live-app/journal-entry.e2e.ts:152`
- **Target:** `/journal/2099-06-01`
- **Actions:** Seed note; goto journal date; read title element.
- **Asserts:** Title text includes the year `2099`.

## `e2e/live-app/wod-index-play-button.e2e.ts`

Validates that a seeded WOD block on the journal date page starts a runtime session via the block's start-workout control.

### `shows play button in Actions menu and starts runtime session`
- **Location:** `e2e/live-app/wod-index-play-button.e2e.ts:32`
- **Target:** `/journal/2099-12-31`
- **Actions:** Seed a journal note containing a WOD block; goto journal date; DOM-click the block's `[data-testid="editor-start-workout"]` ("Run") control; wait for the timer overlay.
- **Asserts:** Timer overlay (`button[title="Close"]`) mounts; the seeded `Timer: 10:00` shows ~`10:0x`; no page errors.

## `e2e/live-app/results-widget-inlay.e2e.ts`

Seeds notes and results into `wodwiki-db` and verifies that the WOD results widget inlay renders after reload across journal, playground, and canvas routes.

### `shows .cm-wod-results-inlay after reload for journal, playground, and canvas routes`
- **Location:** `e2e/live-app/results-widget-inlay.e2e.ts:195`
- **Target:** `/` (seeds routes: `/journal/seed`, `/playground/seed`, `/canvas/seed`)
- **Actions:** Goto root; seed note + result for journal, playground, and canvas routes; reload each route and check for the result widget inlay.
- **Asserts:** Result widget inlay is visible on each route after reload; no `NOTE_NOT_FOUND`, persistence, IndexedDB, CodeMirror plugin, or exception messages.

# Vite dev app (:5173) — Playground & widgets

These specs validate the `/playground` route, CodeMirror editing, widget interactions, and full widget integration. They run under `playwright.journal.config.ts` against the local Vite dev server on `http://localhost:5173`.

## `e2e/live-app/playground-full-integration.e2e.ts`

Validates the `/playground/:id` route with the complete widget integration, including widget rendering, code-example annotations, responsive syntax-group grid, workout runtime, theme switching, performance budget, and mobile viewport rendering.

### `renders visible widgets and wod block on the playground note page`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:77`
- **Target:** `/playground/e2e-full-integration`
- **Actions:** Clear all notes; goto the playground page; wait for CodeMirror; verify attention, code-example, and run-tip widgets; check WOD play button.
- **Asserts:** Editor contains `Wod.Wiki Playground` and ````widget:attention`; code-example heading and run button are visible; run-tip text is visible; `Play` button is visible; no console/page errors.

### `code-example widget displays annotations and run button`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:114`
- **Target:** `/playground/e2e-full-integration`
- **Actions:** Goto the playground page; wait for CodeMirror and widgets.
- **Asserts:** Annotation text (`repeat the indented workout block 3 times`, `reps · movement · load`, `rest timer between rounds`) is visible; no console/page errors.

### `syntax-group grid is responsive on <desktop/tablet/mobile>`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:132`
- **Target:** `/playground/e2e-full-integration` (desktop 1440×900, tablet 768×1024, mobile 375×812)
- **Actions:** Set viewport; goto the playground page; scroll to syntax reference section.
- **Asserts:** At least one syntax-group widget card is visible; no horizontal overflow; no console/page errors.

### `starts a workout from the wod block`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:164`
- **Target:** `/playground/e2e-full-integration` → `/tracker/:runtimeId`
- **Actions:** Goto the playground page; wait for React parsing; click the first `Play` button; wait for tracker URL; start the workout.
- **Asserts:** URL matches `/tracker/`; tracker shows `Ready to Start`; pause button is visible; no console/page errors.

### `switches between dark and light mode`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:203`
- **Target:** `/playground/e2e-full-integration`
- **Actions:** Goto the playground page; open Actions menu; toggle theme twice.
- **Asserts:** Code-example heading remains visible after theme switches; filtered console errors (hydration, nested buttons, CodeMirror crashes) are empty; no page errors.

### `meets performance budget (FCP < 1s, LCP < 2s)`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:247`
- **Target:** `/playground/e2e-full-integration`
- **Actions:** Clear resource timings; goto the playground page; wait for LCP; capture paint timings; sample 60 animation frames.
- **Asserts:** FCP < 1000ms and LCP < 2000ms when present; average frame rate ≥ 60fps; no console/page errors.

### `mobile viewport renders touch-friendly UI`
- **Location:** `e2e/live-app/playground-full-integration.e2e.ts:299`
- **Target:** `/playground/e2e-full-integration` (mobile 375×812)
- **Actions:** Set mobile viewport; goto the playground page; wait for widgets; measure the `Run this example` button bounding box.
- **Asserts:** Code-example heading and run button are visible; button height ≥ 32px; no horizontal overflow; no console/page errors.

## `e2e/live-app/playground-widget-block-preview.e2e.ts`

Validates the default `/playground` landing experience: widget rendering, navigation buttons, and scroll/performance behavior.

### `renders attention, code-example, and syntax-group widgets on <desktop/mobile>`
- **Location:** `e2e/live-app/playground-widget-block-preview.e2e.ts:10`
- **Target:** `/playground` (desktop 1440×900 and mobile 375×812)
- **Actions:** Set viewport; goto `/playground`; verify hero heading, CTA buttons, code-example widget, and syntax cards; click `Jump to workout`; sample 60 animation frames.
- **Asserts:** Hero heading, `Jump to workout`, and `Open search` buttons are visible; code-example heading and `Run this example` button are visible; three syntax cards are present; workout widget surface is in viewport; average FPS ≥ 60; no horizontal overflow; no console/page errors.

## `e2e/live-app/widget-edit-behavior.e2e.ts`

Validates inline widget editing on the `/playground` landing page: edit mode, save, auto-save, invalid JSON handling, keyboard shortcuts, and undo.

### `enters edit mode via pencil button, saves, and persists changes`
- **Location:** `e2e/live-app/widget-edit-behavior.e2e.ts:13`
- **Target:** `/playground` (desktop 1440×900 and mobile 375×812)
- **Actions:** Focus first widget block; click edit button; fill textarea with `{"title":"Updated"}`; click save; reload the page.
- **Asserts:** Editor hidden, preview surface visible; preview contains `Updated` after reload; no console errors.

### `auto-saves valid JSON on blur`
- **Location:** `e2e/live-app/widget-edit-behavior.e2e.ts:47`
- **Target:** `/playground` (desktop and mobile)
- **Actions:** Focus first widget block; click edit; fill textarea with `{"title":"BlurSaved"}`; press Tab to blur.
- **Asserts:** Editor hidden; preview surface contains `BlurSaved`.

### `shows error inlay and undo on invalid JSON blur`
- **Location:** `e2e/live-app/widget-edit-behavior.e2e.ts:64`
- **Target:** `/playground` (desktop and mobile)
- **Actions:** Focus first widget block; click edit; fill textarea with incomplete `{"title":`; press Tab to blur; click undo.
- **Asserts:** Error inlay is visible; undo button is visible; after undo, error inlay is hidden and editor is hidden.

### `keyboard flow: Enter to edit, Escape to discard, Ctrl+Enter to save`
- **Location:** `e2e/live-app/widget-edit-behavior.e2e.ts:86`
- **Target:** `/playground` (desktop and mobile)
- **Actions:** Focus widget block; press Enter to edit; type `{"title":"Discarded"}`; press Escape; focus again; press Enter; type `{"title":"CtrlSaved"}`; press Ctrl+Enter.
- **Asserts:** Discarded text not in preview; after Ctrl+Enter, preview contains `CtrlSaved`.

### `undo button discards invalid edits and restores preview`
- **Location:** `e2e/live-app/widget-edit-behavior.e2e.ts:113`
- **Target:** `/playground` (desktop and mobile)
- **Actions:** Focus widget block; click edit; fill textarea with incomplete JSON; press Tab to blur; click undo button.
- **Asserts:** Error inlay hidden; editor hidden.

## `e2e/live-app/codemirror-wod-editing.e2e.ts`

Regression test for CodeMirror editing inside `wod` code fences.

### `CodeMirror accepts typing and Enter inside wod code fences`
- **Location:** `e2e/live-app/codemirror-wod-editing.e2e.ts:4`
- **Target:** `/playground/codemirror-wod-editing-regression`
- **Actions:** Seed a playground note with a `wod` fence; goto the page; wait for CodeMirror; position cursor inside `Timer: 1:00`; type `X`, press Enter, type `Y`.
- **Asserts:** Initial doc matches seeded content; final doc contains `TimerX\nY: 1:00`; selection moved forward; no CodeMirror plugin or tree-buffer crashes.

# Vite dev app (:5173) — Landing & navigation

These specs validate the landing page, static syntax pages, and click-handler navigation across the live app. They run under `playwright.journal.config.ts` against the local Vite dev server on `http://localhost:5173`.

## `e2e/live-app/concept-3-landing-page.e2e.ts`

Validates the redesigned home landing page (`/`), mobile adaptation, and preservation of the legacy landing page at `/legacy`.

### `renders the grounded storytelling hero, pillars, and runtime toggle`
- **Location:** `e2e/live-app/concept-3-landing-page.e2e.ts:14`
- **Target:** `/`
- **Actions:** Goto home; assert hero, sandbox button, syntax docs button, and feature copy; verify editor panel and scroll progress; click `Start workout`; scroll to bottom.
- **Asserts:** Hero heading, sandbox CTA, syntax docs CTA, `wod`/`log`/`wiki` text, big-screen casting copy, editor panel, and scroll progress are visible; runtime toggle shows `Return to editor` and `Pause`; scroll progress width is not `0%`; no page errors.

### `collapses into a single column on mobile and keeps the sandbox CTA visible`
- **Location:** `e2e/live-app/concept-3-landing-page.e2e.ts:47`
- **Target:** `/` (mobile 375×812)
- **Actions:** Set mobile viewport; goto home; click mobile editor CTA.
- **Asserts:** Hero heading visible; mobile editor CTA visible; `Start workout` visible; editor panel visible after click; no page errors.

### `preserves the previous playground landing page at /legacy and does not render onboarding UI`
- **Location:** `e2e/live-app/concept-3-landing-page.e2e.ts:63`
- **Target:** `/legacy`
- **Actions:** Goto `/legacy`.
- **Asserts:** Legacy heading and `Run this example` button are visible; no `Step 1 of N` or `Getting started` text; no page errors.

## `e2e/live-app/canvas-editor-frontmatter.e2e.ts`

Verifies that static syntax pages do not expose YAML frontmatter in the read-only CodeMirror editor.

### `does not show YAML frontmatter on syntax pages`
- **Location:** `e2e/live-app/canvas-editor-frontmatter.e2e.ts:4`
- **Target:** `/syntax/basics`
- **Actions:** Goto `/syntax/basics`; wait for CodeMirror editor; collect all editor inner texts.
- **Asserts:** Editor text contains `Pushups`; editor text does not start with `---`; does not contain `search: hidden` or `title: Just a Movement`; no page errors.

## `e2e/live-app/dead-click-handlers.e2e.ts`

Validates that collection and journal navigation click handlers route correctly on both desktop and mobile viewports.

### `collection workout cards navigate to the workout editor on <desktop/mobile>`
- **Location:** `e2e/live-app/dead-click-handlers.e2e.ts:20`
- **Target:** `/collections?categories=crossfit` → `/collections/crossfit-games-2020` → `/collections?categories=crossfit` → `/collections/crossfit-girls` → `/workout/crossfit-girls/annie` → `/workout/crossfit-girls/fran`
- **Actions:** Set viewport; navigate collection pages; click category, collection, and workout buttons; open mobile sidebar when needed.
- **Asserts:** URL changes match expected routes; active workout button has `bg-primary/10` class; related buttons are visible; full-page screenshot saved.

### `journal plan-a-workout slots open the selected date editor on <desktop/mobile>`
- **Location:** `e2e/live-app/dead-click-handlers.e2e.ts:55`
- **Target:** `/journal` → `/journal/<tomorrow>`
- **Actions:** Set viewport; compute tomorrow's date; goto `/journal`; click the plan-a-workout slot matching tomorrow's date.
- **Asserts:** URL matches `/journal/<tomorrow>`; `my workout` text is visible; full-page screenshot saved.

# Vite dev app (:5173) — Efforts

These specs validate the `/efforts` catalog and `/effort/:slug` detail pages, including bundled/custom effort CRUD, filters, markdown seed rendering, and navigation panel behavior. They run under `playwright.journal.config.ts` against the local Vite dev server on `http://localhost:5173`.

## `e2e/live-app/efforts-ui.e2e.ts`

Validates the full Efforts UI surface: catalog loading, filtering, search, detail attributes, and custom effort create/clone/edit/delete flows.

### `loads and displays bundled efforts`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:52`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; wait for catalog to load.
- **Asserts:** `Efforts` heading, catalog description, and `Rowing` are visible; no captured errors.

### `shows search and filter controls`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:63`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; wait for catalog to load.
- **Asserts:** Search input is visible; `All`, `Bundled`, and `Custom` filter buttons are visible.

### `filtering by custom shows empty state initially`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:74`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; click `Custom` filter.
- **Asserts:** Empty state text (`No efforts match your filters`) is visible.

### `filtering by bundled shows efforts`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:83`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; click `Bundled` filter.
- **Asserts:** `Rowing` is visible.

### `search filtering narrows results`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:92`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; fill search with `Rowing`; wait.
- **Asserts:** `Rowing` is visible.

### `search with no matches shows empty state`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:102`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; fill search with `xyznonexistent`; wait.
- **Asserts:** Empty state text is visible.

### `clicking an effort navigates to detail page`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:112`
- **Target:** `/efforts` → `/effort/rowing`
- **Actions:** Goto `/efforts`; click the `Rowing` row.
- **Asserts:** URL matches `/effort/rowing`; `Rowing` is visible.

### `displays bundled effort attributes`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:125`
- **Target:** `/effort/rowing`
- **Actions:** Goto `/effort/rowing`; wait.
- **Asserts:** `Rowing` and `Bundled` are visible; MET value `7.0` is visible; `Clone` button is visible; `Edit` button is not visible; no errors.

### `shows high-intensity effort correctly`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:138`
- **Target:** `/effort/kettlebell-snatch`
- **Actions:** Goto `/effort/kettlebell-snatch`; wait.
- **Asserts:** `Kettlebell Snatch` heading, MET `12.0`, and `High` intensity are visible.

### `shows effort with aliases`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:147`
- **Target:** `/effort/rowing`
- **Actions:** Goto `/effort/rowing`; wait.
- **Asserts:** Alias text `row` and `rower` are visible.

### `creates a new custom effort`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:161`
- **Target:** `/efforts` → `/effort/new?mode=create` → `/effort/<slug>`
- **Actions:** Goto `/efforts`; click `Create Custom`; fill editor with YAML frontmatter; save; return to catalog.
- **Asserts:** URL matches `/effort/<slug>`; `E2E Test Effort`, `Custom`, and MET `8.5` are visible; new effort appears in catalog; no errors.

### `clones a bundled effort`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:208`
- **Target:** `/effort/rowing` → `/effort/<cloneSlug>`
- **Actions:** Goto `/effort/rowing`; click `Clone`; fill editor with derived YAML; save.
- **Asserts:** URL matches `/effort/<cloneSlug>`; `Rowing Clone` heading, `Custom`, and MET `7.5` are visible; no errors.

### `edits and deletes a custom effort`
- **Location:** `e2e/live-app/efforts-ui.e2e.ts:253`
- **Target:** `/effort/new?mode=create` → `/effort/<slug>` → `/efforts`
- **Actions:** Create custom effort; click Edit; update YAML to new label and MET; save; reload; click Edit; click Delete.
- **Asserts:** After edit, `Edited Effort` and MET `6.0` are visible; after delete, URL is `/efforts` and `Edited Effort` is gone; no errors.

## `e2e/live-app/effort-detail.e2e.ts`

Validates the `/effort/:slug` detail page: bundled effort rendering, custom effort clone/edit/delete lifecycle, cancel behavior, and not-found state.

### `renders bundled effort inside the aligned note shell`
- **Location:** `e2e/live-app/effort-detail.e2e.ts:41`
- **Target:** `/effort/burpee`
- **Actions:** Goto `/effort/burpee`.
- **Asserts:** Label is `Burpee`; source is `Bundled`; notebook editor contains `slug: burpee`, `label: Burpee`, and `burpees`; aliases/attributes/analytics placeholders are absent; no errors.

### `clone, save, edit, and delete a custom effort`
- **Location:** `e2e/live-app/effort-detail.e2e.ts:59`
- **Target:** `/effort/burpee` → `/effort/<slug>` → `/effort/<slug>-v2` → `/efforts`
- **Actions:** Clone bundled burpee; save custom version; edit slug/label/body; save; delete effort.
- **Asserts:** URLs and labels match at each stage; updated body text visible; deleted effort row no longer in catalog; no errors.

### `cancel returns from edit mode without mutating the bundled effort`
- **Location:** `e2e/live-app/effort-detail.e2e.ts:99`
- **Target:** `/effort/burpee`
- **Actions:** Goto `/effort/burpee`; click Clone; click Cancel.
- **Asserts:** Label remains `Burpee`; clone button is visible; notebook editor is hidden; no errors.

### `renders a not-found state for unknown effort slugs`
- **Location:** `e2e/live-app/effort-detail.e2e.ts:115`
- **Target:** `/effort/nonexistent-effort-12345`
- **Actions:** Goto a nonexistent effort slug.
- **Asserts:** Not-found indicator is visible; `Back to efforts` button is visible; no errors.

## `e2e/live-app/effort-markdown-seed.e2e.ts`

Verifies that bundled effort detail pages render the markdown body seeded in the effort catalog.

### `renders seeded burpee markdown body on the detail page`
- **Location:** `e2e/live-app/effort-markdown-seed.e2e.ts:24`
- **Target:** `/effort/burpee`
- **Actions:** Goto `/effort/burpee`.
- **Asserts:** Burpee description and seed-visibility text are visible; no errors.

### `renders seeded kettlebell swing markdown body on the detail page`
- **Location:** `e2e/live-app/effort-markdown-seed.e2e.ts:36`
- **Target:** `/effort/kettlebell-swing`
- **Actions:** Goto `/effort/kettlebell-swing`.
- **Asserts:** Kettlebell swing description and scaling text are visible; no errors.

## `e2e/live-app/efforts-catalog.e2e.ts`

Validates the `/efforts` catalog page: chrome, bundled efforts, search, navigation to detail, and the create-custom flow.

### `loads catalog chrome and shows bundled efforts`
- **Location:** `e2e/live-app/efforts-catalog.e2e.ts:24`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`.
- **Asserts:** Search input and create-custom button are visible; `burpee` and `rowing` rows are visible; more than 10 rows present; no errors.

### `filters the catalog by search text`
- **Location:** `e2e/live-app/efforts-catalog.e2e.ts:39`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; search for `burpee`; clear search.
- **Asserts:** `burpee` row visible and only one row during search; `rowing` visible after clearing search; no errors.

### `opens effort detail when a catalog row is clicked`
- **Location:** `e2e/live-app/efforts-catalog.e2e.ts:55`
- **Target:** `/efforts` → `/effort/burpee`
- **Actions:** Goto `/efforts`; click the `burpee` row.
- **Asserts:** URL matches `/effort/burpee`; detail label is `Burpee`; no errors.

### `opens create-custom flow from the catalog CTA`
- **Location:** `e2e/live-app/efforts-catalog.e2e.ts:68`
- **Target:** `/efforts` → `/effort/new?mode=create`
- **Actions:** Goto `/efforts`; click create-custom button.
- **Asserts:** URL matches `/effort/new?mode=create`; detail root, notebook editor, save, and cancel buttons are visible; no errors.

## `e2e/live-app/efforts-nav-panel.e2e.ts`

Validates the efforts navigation panel: origin/discipline filters on the catalog route, custom-effort filtering, and recent workouts on the detail route.

### `shows origin and discipline filters on the catalog route`
- **Location:** `e2e/live-app/efforts-nav-panel.e2e.ts:24`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; open navigation panel if present; select `kettlebell` discipline.
- **Asserts:** `All` origin and `kettlebell` discipline filter buttons are visible; `kettlebell-swing` row is visible; `burpee` row is absent; no errors.

### `filters to custom efforts when a user-defined effort exists`
- **Location:** `e2e/live-app/efforts-nav-panel.e2e.ts:41`
- **Target:** `/efforts`
- **Actions:** Goto `/efforts`; clear user efforts; seed a custom effort; reload; select `Custom` origin.
- **Asserts:** Custom effort row is visible; exactly one row is shown; no errors.

### `shows recent workouts for the current effort on the detail route`
- **Location:** `e2e/live-app/efforts-nav-panel.e2e.ts:66`
- **Target:** `/effort/burpee` → `/journal/2026-05-20`
- **Actions:** Goto `/effort/burpee`; clear recent results; seed a recent workout; reload; open navigation panel; click first recent workout item.
- **Asserts:** Recent workout list has one item; navigation lands on `/journal/2026-05-20`; no errors.


# Preview deploys — Playground widget landing

This spec runs under `playwright.preview.config.ts` against preview deployments, validating the playground widget landing experience.

## `e2e/live-app/playground-widget-block-preview.e2e.ts`

Validates the default `/playground` landing experience when run against preview deploys: widget rendering, navigation buttons, and scroll/performance behavior. (This same file is also collected by `playwright.journal.config.ts` for local Vite-dev runs.)

### `renders attention, code-example, and syntax-group widgets on <desktop/mobile>`
- **Location:** `e2e/live-app/playground-widget-block-preview.e2e.ts:10`
- **Target:** `/playground` (desktop 1440×900 and mobile 375×812)
- **Actions:** Set viewport; goto `/playground`; verify hero heading, CTA buttons, code-example widget, and syntax cards; click `Jump to workout`; sample 60 animation frames.
- **Asserts:** Hero heading, `Jump to workout`, and `Open search` buttons are visible; code-example heading and `Run this example` button are visible; three syntax cards are present; workout widget surface is in viewport; average FPS ≥ 60; no horizontal overflow; no console/page errors.

# Vite dev app (:5173) — Wayfinder e2e expansion (#690)

Behavioral coverage added by the 2026-07 wayfinder stages: review surface (#692), error-path resilience (#693), cast sender↔receiver round-trip (#695). Production smoke deepening (#694) lives in `e2e/smoke/` (see `smoke.md`).

## `e2e/live-app/review-surface.e2e.ts`

Adopts the `e2e/pages/ReviewPage.ts` page object. Asserts `/review/:runtimeId` renders the result a real workout completion produced (movements + note label from the recorded `WorkoutResult`, not fixtures), plus the defensive states for absent / empty / malformed result records.

### `completed workout → review matches the executed script`
- **Location:** `e2e/live-app/review-surface.e2e.ts:122`
- **Target:** `/playground/:id` → `/run/:runtimeId` → `/review/:runtimeId`
- **Actions:** Seed a 2-round wod note; Play; advance through completion to `/review`; read via `ReviewPage`.
- **Asserts:** Review overlay mounts; Workout Log + grid visible; executed movements (Burpees, Squats) render; no pageerror.

### `absent result id → defensive "Result not found." state`
- **Location:** `e2e/live-app/review-surface.e2e.ts:139`
- **Target:** `/review/<random-uuid>`
- **Asserts:** "Result not found." renders; no review grid; no pageerror.

### `result with empty logs → review mounts an empty grid, no crash`
- **Location:** `e2e/live-app/review-surface.e2e.ts:149`
- **Target:** `/review/<seeded-id>`
- **Actions:** Put a result row with `data.logs: []` into the `results` store; open its review.
- **Asserts:** Overlay + Workout Log mount; no crash; no pageerror.

### `result with malformed logs → defensive state, no unhandled error`
- **Location:** `e2e/live-app/review-surface.e2e.ts:163`
- **Target:** `/review/<seeded-id>`
- **Actions:** Put a result row with `data.logs: "not-an-array"`; open its review.
- **Asserts:** Either "Failed to load result." or a mounted overlay (both defensive branches); no pageerror.

## `e2e/live-app/error-states.e2e.ts`

Resolves which graceful degradations already exist vs which are defects. Documents: bad timer values are tolerated-and-dropped (post-#691), not surfaced as errors; `/journal/not-a-date` redirects to `/journal`.

### `unclosed wod fence does not crash the editor`
- **Location:** `e2e/live-app/error-states.e2e.ts:58`
- **Asserts:** Editor stays mounted; no pageerror.

### `syntactically broken wod block surfaces a lint marker or disables Play`
- **Location:** `e2e/live-app/error-states.e2e.ts:66`
- **Actions:** Seed `\`\`\`wod (2 ...` (unclosed round directive).
- **Asserts:** wod-linter marker OR no Play button; no pageerror.

### `bad timer value is tolerated (dropped), not surfaced as an error`
- **Location:** `e2e/live-app/error-states.e2e.ts:77`
- **Actions:** Seed `Timer: banana`.
- **Asserts:** Play still present (block valid); no pageerror.

### `IndexedDB rejection degrades without an unhandled pageerror`
- **Location:** `e2e/live-app/error-states.e2e.ts:88`
- **Actions:** `addInitScript` sets `window.indexedDB = undefined`; goto `/`.
- **Asserts:** `#root` not empty (React mounts, no white-screen); no pageerror. Fixed in #703: the `IndexedDBService` constructor now guards `typeof indexedDB === 'undefined'` and defers a handled rejection to first use instead of throwing synchronously at module scope (which took down the whole bundle).

### `/journal/not-a-date redirects to a handled state`
- **Location:** `e2e/live-app/error-states.e2e.ts:118`
- **Asserts:** URL resolves to `/journal`; `#root` not empty; no pageerror.

## `e2e/live-app/cast-roundtrip.e2e.ts`

The only behavioral coverage of `src/components/organisms/cast`. Harness: LocalTabBackend dual-tab (dev default) — the real Cast button opens `/receiver-rpc.html?local=<id>`; the popup is captured via the context `page` event.

### `cast handshake connects the receiver popup to the sender session`
- **Location:** `e2e/live-app/cast-roundtrip.e2e.ts:66`
- **Target:** `/playground/:id` → `/run/:runtimeId`; popup `/receiver-rpc.html?local=<id>`
- **Actions:** Start a workout; click the timer-overlay `Cast to TV` control; capture the popup.
- **Asserts:** Popup URL matches `/receiver-rpc.html?local=`; receiver leaves the waiting screen and renders the active track panel (UP NEXT); no pageerror on either side.

### `sender block transitions mirror to the connected receiver` *(quarantined — #704)*
- **Location:** `e2e/live-app/cast-roundtrip.e2e.ts:95`
- **Asserts (desired):** after the sender advances into `Timer: 1:00`, the receiver mirrors `1:00`. **Quarantined:** the receiver connects and mirrors the initial session but does not propagate the sender's live block/timer transitions — defect #704.
