# 009 — Dogfood QA cleanup plan (2026-08-30)

Source: exploratory QA session against https://wod.wiki (v0.35.2045 → v0.35.2046 mid-session), 2026-08-30.
Scope: landing scroll tour, timer run/log loop, Library (All/Collections/Feeds), collection detail, dashboards, command palette, guide pages, journal creation, mobile 390×844.

**Excluded from this plan (maintainer decision):** the original report's issue 1 — "all deep links return HTTP 404" — and issue 10 ("no custom 404 page"), which shares its premise. Both are artifacts of how the test was performed: GitHub Pages serves `404.html` as the SPA fallback, so `curl` sees a 404 status while every real browser load boots the app and renders the correct view; unknown paths reach the app shell the same way. In-app handling of unmatched paths is out of scope for this plan.

Each finding below pairs the QA observation with the code-level root cause (verified at HEAD, `e3dcf1fc`) and a proposed cleanup.

## Headline findings

### H1 — Guide deep links land on the generic "Home" notebook (high · fix class: route normalization)

**QA saw:** "Start Lesson 1" and `/guide/behaviors` render a page titled **Home** containing `# My Workout Notebook`, breadcrumb "Syntax / Home", while sidebar navigation to e.g. Timer Behaviors works.

**Root cause (verified live on v0.35.2046 and in code).** GitHub Pages 301-redirects every directory-style URL to a trailing slash (`/guide/syntax/basics` → `/guide/syntax/basics/`), so **every hard load of a guide URL** — bookmarks, shared links, refreshes — arrives with a trailing slash. `findCanvasPage` (`apps/playground/app/canvas/canvasRoutes.ts:55-57`) is an exact-string `Map.get(pathname)` with no normalization; the registered routes have no trailing slash. The miss flows through `useRouteView.ts:24` → `routeView.ts` `deriveWorkout`, whose final fallback (`routeView.ts:226-228`) silently substitutes `{ name: 'Home', content: PLAYGROUND_CONTENT }`. Client-side `<Link>` clicks (pushState, no host redirect) keep the slash-less path and render the real lesson — confirmed: SPA navigation shows `h1: "Core Concepts"` with actual lesson content.

The content itself is fine and long-deployed (`markdown/canvas/syntax/basics.md` since 2026-08-05, `markdown/canvas/behaviors/README.md` since 2026-07-28; `template: canvas` + `route:` frontmatter present).

**Proposed fix:**

1. Normalize the pathname in `findCanvasPage` (or at the `useRouteView` call site): strip trailing slashes, ensure leading slash, collapse duplicates. ~3 lines, fixes every hard load.

**Acceptance:** hard load and refresh of `/guide/syntax/basics/`, `/guide/behaviors/` show the lesson; in-app navigation unchanged. Add a unit test asserting `findCanvasPage('/guide/syntax/basics/')` resolves.

### H2 — Timer Stop toasts "session logged" over an empty log (medium · fix class: empty-output guard)

**QA saw:** Run → ~24 s in the clock (segment still "Ready to Start") → Pause → Stop → toast "session logged · tap here to return", journal header "logged from timer", but Workout Log shows "0 rows / No output data available."

**Root cause.** The session stopped on the `WaitingToStartBlock` gate. Its `ReportOutputBehavior` is created without `emitSegmentOnMount` (`packages/lang/src/runtime/blocks/WaitingToStartBlock.ts:64`), and that flag defaults to false (`packages/lang/src/runtime/behaviors/ReportOutputBehavior.ts:33-43`) — so zero segment/analytics/milestone Statements were ever emitted. `getAnalyticsFromLogs` then filters to those types and returns `{ segments: [], groups: [] }` (`apps/playground/src/services/AnalyticsTransformer.ts:338-380`), while `HomeTour.handleTimerComplete` (`apps/playground/app/tour/HomeTour.tsx:701-749`) unconditionally runs the journal write and sets `logState: 'logged'` — "logged" only means the (empty) write succeeded. Toast copy at `HomeTour.tsx:836-843`; the empty-table text is the generic `ReviewGrid` empty state (`ReviewGrid.tsx:345-347`). The write path has no content guard either (`apps/playground/src/services/resultRecorder.ts:108-152`, `journalWorkout.ts:22`).

**Proposed fix (both):**

1. Gate at the app seam: in `handleTimerComplete`, when the filtered segment count is 0, use a distinct `logState` ('empty') with toast copy like "Nothing to log — the session never started", and skip (or explicitly mark) the journal write. Keep the success toast for real sessions.
2. Make the demo's first run succeed visibly: the welcome workout's first segment should emit/advance on first tick (or auto-start the countdown), so a curious first-time Run → Stop always produces at least one log row.

**Acceptance:** Run → immediate Stop on the gate produces the explanatory state, not "session logged"; letting a segment actually run and stopping logs ≥ 1 row. `TourAnalyticsScreen` already has bespoke empty copy for the scorecard ("Finish or stop the timer — results land here", lines 66-72) — align the table with it.

### H3 — `last 2w` window anchors to latest activity, not today; undated rows inconsistent across tabs (medium · fix class: window semantics)

**QA saw:** with the `last 2w` chip active (today 2026-08-30), the Feeds scope lists posts dated 2026-01-05 / 2026-01-12; and the same query shows "Catalogues — Static, undated **0**" on the All tab but **661 matched** on the Collections tab.

**Root cause.** The time window is applied only inside the engine's `runFind`/`runFindBlock` (`packages/wql/src/QueryService.ts`, `effectiveTimeWindow` ~146-157), and relative windows anchor to the **newest `createdAt` in the scope selection before filters** when `windowAnchor: 'latest-activity'` (`QueryService.ts` ~157-178) — which is what the Library passes (`apps/playground/app/lib/entrySearch.ts:27,40,44`). The feeds corpus's newest post is 2026-01-12, so "last 2w" means "two weeks before Jan 12" — the January posts are *in* the window. Meanwhile the static index generator hard-sets `createdAt: 0` for all collection rows (`scripts/generate-static-block-index.ts:29-33,66`; `feedDateToCreatedAt` at `apps/playground/src/services/content/staticBlockIndex.ts:32-38` parses feed path dates). On the All tab the anchor comes from today's local journal activity, so `createdAt: 0` catalogue rows fall outside the window; on the Collections tab everything in scope is `createdAt: 0`, so the anchor degenerates and the window stops excluding anything. Same chip, two meanings — the user cannot form a model of it.

**Proposed fix:**

1. Make `last 2w` calendar-anchored (today) by default; if "relative to latest activity" is wanted as a training-block idiom, make it an explicit distinct chip ("last 2w of activity") and show the effective range in the chip tooltip — e.g. `2025-12-29 → 2026-01-12`.
2. Pick one policy for undated rows and apply it in every scope: either undated catalogue items always bypass time windows (shown, grouped under "Undated" as `entryGrouping.ts` already does) or always excluded. Recommended: always shown — the catalogue is static curation, not logged activity.

**Acceptance:** the same query string renders the same effective window description on All / Collections / Feeds; feed posts outside the stated range do not appear; catalogue counts agree across tabs.

### H4 — Notes and collections render raw markdown (medium · fix class: read-mode renderer)

**QA saw:** collection detail (`/collections/crossfit-games-2022/Event-05`) and journal pages (`/journal/2026-08-30`) display YAML frontmatter walls, literal pipe tables, `- ` bullets, `#` headings, and `Source: [welcome-1.md](/)` as raw source — while guide pages render beautifully.

**Root cause.** Those pages render through `NoteEditor` (CodeMirror 6 raw source): `apps/playground/app/pages/WorkoutEditorPage.tsx` (~line 168) and `JournalDatePage.tsx`. Its preview extensions (`NoteEditor.tsx:424-431`: `previewDecorations`, `frontmatterPreview`, `markdownTablePreview`, `markdownSyntaxHiding`) hide syntax *piecemeal* — they never render headings, tables, links, or strip frontmatter. Worse, `journalWorkout.ts:35-41` actively *generates* the offending `---`/`tags:`/`Source: [...]` lines into every journal note. The proven renderer already exists: `CanvasProse` (`apps/playground/app/canvas/CanvasProse.tsx:345-350`, ReactMarkdown + remarkGfm), and an in-app precedent for rendering note bodies outside the editor: `JournalZipLoadPage.tsx:272-279`.

**Proposed fix:**

1. Give collection detail and journal date pages a read-mode default: render the body with the `CanvasProse`-style markdown pass (frontmatter stripped/converted to chips), with an "Edit" toggle into the existing `NoteEditor`. The `JournalZipLoadPage` path is the pattern to copy.
2. Revisit the `journalWorkout.ts` template: a `Source:` line can render as a chip/link in read mode, but consider emitting less frontmatter wall for the common case.
3. (Alternative, more invasive: extend the CM decorations into a true read rendering — not recommended; two renderers already exist, reuse one.)

**Acceptance:** opening Event 05 or a fresh journal note shows formatted headings/tables/links with no visible `---`/`|`/`#` source; Edit still exposes raw source.

### H5 — Dashboard empty state is a dead end (medium · fix class: empty-state actions)

**QA saw:** every widget on `/dashboard/training-block-review` reads "No data for this range." — ten identical dead tiles, no next step, while the landing demo of the same dashboard is fully populated.

**Root cause.** `WqlEmptyState` (`packages/ui/src/widgets/WqlEmptyState.tsx:10-15`) is a static label with no action/slot props, and every widget type returns it when empty (`WidgetChart.tsx:32-33`, WqlBars, WqlTable, TopList, …). The app already has a rich empty-state pattern — `apps/playground/app/components/SampleDataPrompt.tsx:90-101` wraps `WqlEmptyState` with a load-sample-data CTA — but the dashboard page has no such wrapper. The landing demo is populated only because it bypasses `queryService` with hardcoded fixtures (`apps/playground/app/tour/homeAnalyticsData.ts`).

**Proposed fix:**

1. Extend `WqlEmptyState` with optional `actions` (slot/props) in `@bitcobblers/wod-wiki-ui` — backward compatible, all widgets benefit.
2. In `DashboardViewPage`, when the whole board is empty, offer the two bridges: "Preview with sample data" (reuse `SampleDataPrompt`; the `homeAnalyticsData` fixtures are the natural corpus) and "Log your first workout" (deep-link the journal start). This also delivers the landing-page → app continuity the report's first-arrival section asks for.

**Acceptance:** a fresh profile opening a prebuilt dashboard sees sample-data and log-first CTAs instead of ten bare tiles; after real data lands, widgets render normally.

### H6 — Command palette doesn't filter as you type (low · fix class: pending-state UX)

**QA saw:** typing "fran" leaves the list at "674 matched"; only a small "↵ Search text: fran" hint changes.

**Root cause.** The palette is a `PaletteShell` around `WqlComposer`. Free text is deliberately held as uncommitted `pending` state (`WqlComposer.tsx:232+`) and excluded from the serialized WQL; the commit gesture is Enter (`WqlComposer.tsx:389`). Live source search *does* re-run per query change (`PaletteShell.tsx:81-108`) but never sees the pending text, so the list sits still while the corpus-wide count strip stays at 674 (`WqlDiagnosticsStrip.tsx:117`).

**Proposed fix (pick one):**

1. Feed the pending free text into the source search live (debounced ~150 ms) so results narrow as you type, while keeping WQL serialization unchanged (pending text still not committed to the query). Recommended — matches palette norms, respects the composer contract.
2. Keep Enter-to-commit but make the state unmistakable: highlighted "Press Enter to search 'fran'" affordance and a pending-match count.

**Acceptance:** typing shows either live-narrowed results or an explicit pending state; no change to what Enter commits into WQL.

### H7 — Tour ring chips overlap annotated content at 390 px (low · fix class: chip clamping)

**QA saw:** "Line Metrics" / "Table list" chips sit on top of the code-fence line and caption they annotate at 390 px.

**Root cause.** `TourRing.tsx` measures the target vs. the runway canvas with `getBoundingClientRect` (`:113-142`) and renders the label chip at `-top-3` (`:158-163`) with **no clamping or flip logic** — when the ring hugs the top of its target (tight mobile layout), the chip covers the annotated line.

**Proposed fix:** clamp the chip inside the measured box — if `box.y - chipHeight < canvasTop`, flip the chip below the ring (`top-full` + small offset) instead of `-top-3`. Verify at 375/390 px for the chips named in the report (`editor.wodBlock`, `analytics.table` registry keys).

**Acceptance:** no chip covers its annotated content at 375–430 px viewports; desktop unchanged.

### H8 — CJK date formatting in an English UI (low · fix class: locale default — working as designed, revisit default)

**QA saw:** feed group headers like `2026年1月12日` inside the English chrome.

**Root cause.** Deliberate feature, surprising default. Dates flow through `formatDateHeader` (`apps/playground/app/lib/dateFormat.ts:13-18`) → `getDateLocale()` (`apps/playground/app/lib/dateLocale.ts`) — a user preference ("Date language" in the ⋮ PageToolbar menu, `PageToolbar.tsx:191-200`, stored as `wodwiki:dateLocale`), whose **Auto** mode passes the raw browser locale to `Intl`. The QA browser ran a `zh-*` locale. A test even asserts the exact string (`dateLocale.test.ts:34-37`).

**Proposed fix:** make Auto follow the UI language (English) rather than the raw browser locale, or keep browser-locale Auto but stop calling it "Auto" — label it "Browser language" and surface the override in the same menu. One-line policy decision; the machinery is fine.

**Acceptance:** a fresh `zh`-locale browser sees English-format dates by default; the ⋮ override still works.

## Mapping to the original report

| Report # | Here     | Note                                                                                          |
| -------- | -------- | --------------------------------------------------------------------------------------------- |
| 1        | excluded | Hosting 404 status — testing artifact (GH Pages `404.html` SPA fallback); maintainer decision |
| 2        | H1       | Root cause re-verified live: trailing-slash redirect × exact-match lookup                     |
| 3        | H2       |                                                                                               |
| 4        | H3       |                                                                                               |
| 5        | H4       |                                                                                               |
| 6        | H5       |                                                                                               |
| 7        | H6       |                                                                                               |
| 8        | H7       |                                                                                               |
| 9        | H8       | Working as designed; default policy revisit                                                   |
| 10       | excluded | Shares issue 1's hosting premise; unmatched-path handling out of scope (maintainer decision)  |

## Suggested execution order

1. **H1** — ~3-line pathname normalization; unblocks the landing page's primary CTA.
2. **H2** — first-run impression; the Run → Stop → journal loop must close cleanly.
3. **H5** — small `WqlEmptyState` extension + one page wrapper; bridges tour → app.
4. **H4** — biggest visual credibility win; renderer already exists, reuse it.
5. **H3** — needs one policy decision (calendar vs. activity anchor; undated rows) before code.
6. **H6**, **H7**, **H8** — polish, independent, any order.

## Verification notes

- H1 verified live on v0.35.2046 on 2026-08-30: hard load of `/guide/syntax/basics` (host-redirected to trailing slash) renders `h1: "Home"`; in-app pushState navigation to `/guide/syntax/basics` renders the "Core Concepts" lesson.
- H2–H8 root causes are code-read at HEAD (`e3dcf1fc`), pinned to file:line in each section; none re-executed against the deployed build. Path layout note: the repo has migrated to the monorepo (`apps/playground/`, `packages/*`) — line references above use current paths.
