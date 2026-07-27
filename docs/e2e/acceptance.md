# Storybook Acceptance Tests

These six specs cover Storybook acceptance tests for the EffortDetailPage, EffortsCatalogPage, Planner NoteEditor, FullscreenTimer organism, and HomeView landing page. They are collected by `playwright.config.ts` (`testMatch: '**/*.e2e.ts'`) and run against the local Storybook served at `https://localhost:6006` (the default `baseURL` from `storybookBaseURL`).

## How this group runs

- **Config:** `playwright.config.ts` — `bun run test:e2e` (collects `e2e/**/*.e2e.ts` except `live-app/**` and `smoke/**`, serial-per-file, fully parallel across files).
- **Runs against:** **Storybook** — the component catalog in `stories/`; each test loads a story iframe (`/iframe.html?id=...`). Locally the config auto-starts the dev server (`bun run storybook`) at `https://localhost:6006` (protocol from `HTTPS_CERT` in `.env.local`), reusing a running instance.
- **CI/CD:** not wired into any GitHub workflow — local/pre-merge only. If run with `CI` set (or `E2E_STORYBOOK_URL` exported), tests target the deployed Storybook at `https://storybook.wod.wiki` and no local server is started (see `e2e/utils/url-helpers.ts`).

## `effort-detail-page.e2e.ts`

Validates the note-based `EffortDetailPage` rendered by `JournalPageShell`.

> Shared setup: `EffortDetailPage — Bundled Effort` tests load `catalog-pages-effortdetailpage--bundled-effort` in `beforeEach`; `EffortDetailPage — High Intensity` tests load `catalog-pages-effortdetailpage--high-intensity-effort`; `EffortDetailPage — With Modifiers` tests load `catalog-pages-effortdetailpage--with-modifiers`; mobile tests set viewport to `375×667` and load `catalog-pages-effortdetailpage--mobile`.

### `bundled: story loads without errors`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:42`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Start console/page error capture → `gotoStory(bundled)`.
- **Asserts:** No errors logged; `body` is not empty.

### `highIntensity: story loads without errors`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:42`
- **Target:** `catalog-pages-effortdetailpage--high-intensity-effort`
- **Actions:** Start console/page error capture → `gotoStory(highIntensity)`.
- **Asserts:** No errors logged; `body` is not empty.

### `withModifiers: story loads without errors`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:42`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Start console/page error capture → `gotoStory(withModifiers)`.
- **Asserts:** No errors logged; `body` is not empty.

### `mobile: story loads without errors`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:42`
- **Target:** `catalog-pages-effortdetailpage--mobile`
- **Actions:** Start console/page error capture → `gotoStory(mobile)`.
- **Asserts:** No errors logged; `body` is not empty.

### `sticky header shows title and actions on desktop`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:56`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** `gotoStory(bundled)` (default desktop viewport).
- **Asserts:** Title heading contains `Rowing`; actions bar is visible; clone button is visible; origin badge contains `Bundled`; edit button is hidden.

### `index sidebar is not rendered when effort has no headings`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:67`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Set viewport to `2048×1080` → `gotoStory(bundled)`.
- **Asserts:** Index sidebar has count `0`.

### `main editor renders the bundled effort content`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:75`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Set viewport to `2048×1080` → `gotoStory(bundled)`.
- **Asserts:** Editor content is visible and contains `label: Rowing`, `slug: rowing`, and `met: 7`.

### `with modifiers story shows the resolved toggle and widget`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:86`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Set viewport to `2048×1080` → `gotoStory(withModifiers)`.
- **Asserts:** Show-resolved button is visible; resolved widget is visible and contains `Effective MET` and `Discipline Factor`.

### `displays effort label and slug`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:107`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits `beforeEach` that loads `catalog-pages-effortdetailpage--bundled-effort`.
- **Asserts:** Title heading contains `Rowing`; editor content contains `slug: rowing`.

### `shows bundled origin badge`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:113`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits bundled story load.
- **Asserts:** Origin badge contains `Bundled`.

### `shows MET and discipline in YAML document`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:118`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits bundled story load.
- **Asserts:** Editor content contains `met: 7` and `discipline: rowing`.

### `renders aliases in YAML document`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:124`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits bundled story load.
- **Asserts:** Editor content contains `aliases:`, `row`, and `rower`.

### `clone button is visible for bundled efforts`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:131`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits bundled story load.
- **Asserts:** Clone button is visible.

### `edit button is hidden for bundled efforts`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:136`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** Inherits bundled story load.
- **Asserts:** Edit button is not visible.

### `displays effort label in header`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:150`
- **Target:** `catalog-pages-effortdetailpage--high-intensity-effort`
- **Actions:** Inherits `beforeEach` that loads `catalog-pages-effortdetailpage--high-intensity-effort`.
- **Asserts:** Title heading contains `Kettlebell Snatch`.

### `shows high intensity tier in YAML document`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:155`
- **Target:** `catalog-pages-effortdetailpage--high-intensity-effort`
- **Actions:** Inherits high-intensity story load.
- **Asserts:** Editor content contains `intensityTier: high`.

### `shows elevated MET in YAML document`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:160`
- **Target:** `catalog-pages-effortdetailpage--high-intensity-effort`
- **Actions:** Inherits high-intensity story load.
- **Asserts:** Editor content contains `met: 12`.

### `shows resolved toggle`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:174`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Inherits `beforeEach` that loads `catalog-pages-effortdetailpage--with-modifiers`.
- **Asserts:** Show-resolved button is visible.

### `shows effective resolution widget`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:179`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Inherits modifiers story load → click show-resolved.
- **Asserts:** Resolved widget is visible; `Effective Resolution` heading is visible.

### `displays effective MET`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:186`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Inherits modifiers story load → click show-resolved.
- **Asserts:** Resolved widget contains `Effective MET` and `7.0`.

### `displays discipline factor`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:193`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Inherits modifiers story load → click show-resolved.
- **Asserts:** Resolved widget contains `Discipline Factor`.

### `hiding resolved widget restores the editor view`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:199`
- **Target:** `catalog-pages-effortdetailpage--with-modifiers`
- **Actions:** Inherits modifiers story load → click show-resolved → click hide-resolved.
- **Asserts:** Resolved widget is hidden after showing; editor content still contains `met: 7` after hiding.

### `clone enters edit mode with NoteEditor visible`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:213`
- **Target:** `catalog-pages-effortdetailpage--bundled-effort`
- **Actions:** `gotoStory(bundled)` → click clone → wait for NoteEditor.
- **Asserts:** NoteEditor is visible; editor content contains `Rowing (Custom)` and `rowing-custom`.

### `editor content is visible on mobile`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:235`
- **Target:** `catalog-pages-effortdetailpage--mobile`
- **Actions:** Inherits mobile viewport (`375×667`) and mobile story load.
- **Asserts:** Editor content is visible and contains `met: 7`.

### `sticky header is hidden on mobile`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:241`
- **Target:** `catalog-pages-effortdetailpage--mobile`
- **Actions:** Inherits mobile viewport and story load.
- **Asserts:** Title heading and actions bar are not visible.

### `index sidebar is hidden on mobile`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:247`
- **Target:** `catalog-pages-effortdetailpage--mobile`
- **Actions:** Inherits mobile viewport and story load.
- **Asserts:** Index sidebar has count `0`.

### `clone button is not visible on mobile`
- **Location:** `e2e/acceptance/effort-detail-page.e2e.ts:252`
- **Target:** `catalog-pages-effortdetailpage--mobile`
- **Actions:** Inherits mobile viewport and story load.
- **Asserts:** Clone button is not visible.

## `efforts-catalog-page.e2e.ts`

Validates the EffortsCatalogPage Storybook stories for header, effort rows, filters, and search.

> Shared setup: `EffortsCatalogPage — Default` tests load `catalog-pages-effortscatalogpage--default` in `beforeEach`; `EffortsCatalogPage — Mobile` tests load `catalog-pages-effortscatalogpage--mobile`.

### `default: story loads without errors`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:51`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Start console/page error capture → `loadStory(default)`.
- **Asserts:** No errors logged; `body` is not empty.

### `mobile: story loads without errors`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:51`
- **Target:** `catalog-pages-effortscatalogpage--mobile`
- **Actions:** Start console/page error capture → `loadStory(mobile)`.
- **Asserts:** No errors logged; `body` is not empty.

### `displays page header with title`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:68`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** `Efforts` title and `Catalog of all registered efforts` subtitle are visible.

### `shows Create Custom button`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:73`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** `Create Custom` button is visible.

### `renders bundled effort rows`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:77`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** A `Rowing` heading is visible.

### `shows effort metadata (slug and MET)`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:82`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** Rowing row is visible; `rowing` slug and `MET 7.0` are visible.

### `shows origin filter buttons`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:90`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** `All`, `Bundled`, and `Custom` filter buttons are visible.

### `shows search input`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:96`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load.
- **Asserts:** `Search by name` input is visible.

### `filtering to bundled origin keeps efforts visible`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:100`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load → click `Bundled` filter → wait 300ms.
- **Asserts:** `Rowing` heading remains visible.

### `filtering to custom origin shows empty state`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:106`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load → click `Custom` filter → wait 300ms.
- **Asserts:** Empty state text `No efforts match your filters` is visible.

### `search filtering narrows results`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:112`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load → fill search with `Rowing` → wait 300ms.
- **Asserts:** `Rowing` heading is visible.

### `search with no matches shows empty state`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:119`
- **Target:** `catalog-pages-effortscatalogpage--default`
- **Actions:** Inherits default story load → fill search with `xyznonexistent` → wait 300ms.
- **Asserts:** Empty state text `No efforts match your filters` is visible.

### `renders header and search on mobile`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:134`
- **Target:** `catalog-pages-effortscatalogpage--mobile`
- **Actions:** Inherits mobile story load.
- **Asserts:** `Efforts` title and `Search by name` input are visible.

### `shows origin filters on mobile`
- **Location:** `e2e/acceptance/efforts-catalog-page.e2e.ts:139`
- **Target:** `catalog-pages-effortscatalogpage--mobile`
- **Actions:** Inherits mobile story load.
- **Asserts:** `All` and `Bundled` filter buttons are visible.

## `canvas-effort-frontmatter-editing.e2e.ts`

Validates the effort companion overlay for editing effort frontmatter inside the NoteEditor canvas.

> Shared setup: both tests run in a loop over `desktop` (`1280×900`) and `mobile` (`375×812`) viewports, loading `catalog-pages-planner--note-editor-effort-frontmatter`.

### `renders effort companion overlay on desktop`
- **Location:** `e2e/acceptance/canvas-effort-frontmatter-editing.e2e.ts:12`
- **Target:** `catalog-pages-planner--note-editor-effort-frontmatter`
- **Actions:** Set viewport to `1280×900` → capture console/page errors → `goto` frontmatter story → wait for editor attachment/content → click `rowing-intervals` → wait 400ms.
- **Asserts:** Frontmatter contains `Rowing Intervals`; companion overlay is visible with `Effort`, `Rowing Intervals`, and `7.0`; on desktop the slug input has value `rowing-intervals`, the MET number input has value `7.0`, and the intensity select has value `high`; no errors logged.

### `renders effort companion overlay on mobile`
- **Location:** `e2e/acceptance/canvas-effort-frontmatter-editing.e2e.ts:12`
- **Target:** `catalog-pages-planner--note-editor-effort-frontmatter`
- **Actions:** Set viewport to `375×812` → capture console/page errors → `goto` frontmatter story → wait for editor attachment/content → click `rowing-intervals` → wait 400ms.
- **Asserts:** Frontmatter contains `Rowing Intervals`; companion overlay is visible with `Effort` header; no errors logged.

### `edits effort slug and commits to frontmatter on desktop`
- **Location:** `e2e/acceptance/canvas-effort-frontmatter-editing.e2e.ts:83`
- **Target:** `catalog-pages-planner--note-editor-effort-frontmatter`
- **Actions:** Set viewport to `1280×900` → `goto` frontmatter story → wait for editor → click `rowing-intervals` → wait 400ms → fill slug input with `updated-rowing` → blur → wait 300ms.
- **Asserts:** Editor content contains `updated-rowing`.

### `edits effort slug and commits to frontmatter on mobile`
- **Location:** `e2e/acceptance/canvas-effort-frontmatter-editing.e2e.ts:83`
- **Target:** `catalog-pages-planner--note-editor-effort-frontmatter`
- **Actions:** Set viewport to `375×812` → `goto` frontmatter story → wait for editor → click `rowing-intervals` → wait 400ms; if the slug input is visible, fill it with `updated-rowing` and blur.
- **Asserts:** If the slug input was visible, editor content contains `updated-rowing`.

## `cursor-focus-panel.e2e.ts`

Validates the cursor-focus metric panel that renders at the bottom of the NoteEditor viewport without polluting the document content.

> Shared setup: the test runs in a loop over `desktop` (`1280×900`) and `mobile` (`375×812`) viewports, loading `catalog-pages-planner--note-editor-default`.

### `renders at the bottom of the editor viewport without inserting into document content on desktop`
- **Location:** `e2e/acceptance/cursor-focus-panel.e2e.ts:12`
- **Target:** `catalog-pages-planner--note-editor-default`
- **Actions:** Set viewport to `1280×900` → `goto` default note-editor story → click `.cm-content` → click `Thrusters`.
- **Asserts:** Panel anchor is visible and contains `Exercise`, `Weight`, and `Ctrl+. · edit`; only one `.cm-wod-metric-panel` exists and it is inside the anchor; clicking `Fran` hides the anchor.

### `renders at the bottom of the editor viewport without inserting into document content on mobile`
- **Location:** `e2e/acceptance/cursor-focus-panel.e2e.ts:12`
- **Target:** `catalog-pages-planner--note-editor-default`
- **Actions:** Set viewport to `375×812` → `goto` default note-editor story → click `.cm-content` → click `Thrusters`.
- **Asserts:** Panel anchor is visible and contains `Exercise`, `Weight`, and `Ctrl+. · edit`; only one `.cm-wod-metric-panel` exists and it is inside the anchor; clicking `Fran` hides the anchor.

## `fullscreen-wallclock-close.e2e.ts`

Exercises the FullscreenTimer overlay in the Ready-to-Start state and asserts that the Close button dismisses it promptly.

### `dismisses the runner overlay when Close is clicked in the Ready state`
- **Location:** `e2e/acceptance/fullscreen-wallclock-close.e2e.ts:19`
- **Target:** `catalog-organisms-fullscreentimer--simple-timer`
- **Actions:** `goto` FullscreenTimer story → wait for `Open` button → click `Open` → wait for `Ready to Start` heading → wait for `title="Close"` button → click Close.
- **Asserts:** `Ready to Start` heading is hidden within 250ms; `Open` button is visible again.

## `home-feature-card-markdown.e2e.ts`

Validates that the HomeView feature cards render markdown as real formatted list content with working links and CTAs.

### `renders feature markdown as formatted list content`
- **Location:** `e2e/acceptance/home-feature-card-markdown.e2e.ts:7`
- **Target:** `catalog-pages-homeview--default`
- **Actions:** `goto` HomeView story.
- **Asserts:** Tracked list (with `Rounds` link) is visible and has 5 list items; links `Rounds`, `Movement`, `Reps`, `Load`, and `Timers` are visible; rendered text does not contain `**` or `- **`; headings `Learn the Syntax` and `What's Next` are visible; `Run Workout` and `View Results` buttons are visible.
