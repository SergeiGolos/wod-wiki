# 009 — Dogfood QA cleanup plan (2026-08-30)

Source: exploratory QA of https://wod.wiki (v0.35.2045 → v0.35.2046), 2026-08-30.
Code verified at HEAD `e3dcf1fc` (monorepo layout: `apps/playground/`, `packages/*`).

**Excluded (maintainer decision):** report issues 1 and 10 — both are artifacts of how the test was run. GitHub Pages serves `404.html` as the SPA fallback, so `curl` sees 404 while every real browser load boots the app correctly. In-app handling of unmatched paths is out of scope.

## Fix order — do now (top 5)

1. **H1 · Guide route normalization** — `apps/playground/app/canvas/canvasRoutes.ts:55-57`. ~15 min + test. Unblocks the landing page's main CTA.
2. **H2 · Empty-session guard** — `apps/playground/app/tour/HomeTour.tsx:701-749`. ~1 h. Makes the first Run → Stop → journal loop close cleanly.
3. **H5 · Dashboard sample-data bridge** — `packages/ui/src/widgets/WqlEmptyState.tsx` + `DashboardViewPage`. ~2 h. Bridges the tour into the real app.
4. **H4 · Read-mode markdown for notes/collections** — `WorkoutEditorPage.tsx`, `JournalDatePage.tsx`. ~half a day. Biggest visual credibility win.
5. **H3 · `last 2w` window semantics** — `packages/wql/src/QueryService.ts` (~146-178). Needs one policy decision first (see H3).

### Later (3, independent polish)

6. **H6 · Palette live filtering** — `PaletteShell.tsx` / `WqlComposer.tsx`. ~2 h.
7. **H7 · Tour chip clamping** — `apps/playground/app/tour/TourRing.tsx:158-163`. ~30 min.
8. **H8 · Date-locale default** — `apps/playground/app/lib/dateLocale.ts`. ~30 min after the policy call.

---

## H1 — Guide deep links land on the "Home" notebook (high)

**Fix (~15 min):**

1. Open `apps/playground/app/canvas/canvasRoutes.ts`
2. In `findCanvasPage` (lines 55-57), normalize `pathname` before the lookup: strip trailing slashes, ensure leading slash, collapse duplicates
3. Add a unit test: `findCanvasPage('/guide/syntax/basics/')` resolves
4. Verify: hard-load `https://wod.wiki/guide/syntax/basics/` → shows the "Core Concepts" lesson, not "Home"

**Why:** GitHub Pages 301-redirects every hard load to a trailing slash (`/guide/syntax/basics` → `/guide/syntax/basics/`). The lookup is an exact-string `Map.get` — every bookmark, shared link, and refresh misses and falls through `useRouteView.ts:24` → `routeView.ts:226-228`, which silently renders `{ name: 'Home', content: PLAYGROUND_CONTENT }`. Verified live on v0.35.2046. The content is fine and long-deployed (`markdown/canvas/syntax/basics.md` since 2026-08-05).

**Done when:** hard load and refresh of `/guide/syntax/basics/` and `/guide/behaviors/` show the lesson; in-app nav unchanged; test passes.

## H2 — Stop toasts "session logged" over an empty log (medium)

**Fix (~1 h, both):**

1. In `HomeTour.handleTimerComplete` (`apps/playground/app/tour/HomeTour.tsx:701-749`): when filtered segment count is 0, set a distinct `logState` ('empty') with toast "Nothing to log — the session never started"; skip or mark the journal write
2. Make the welcome workout's first segment emit/advance on first tick, so a first-time Run → Stop logs ≥ 1 row
3. Align the Workout Log empty copy with the scorecard's existing "Finish or stop the timer — results land here" (`TourAnalyticsScreen.tsx:66-72`)

**Why:** stopping on the `WaitingToStartBlock` gate emits zero Statements (`ReportOutputBehavior` created without `emitSegmentOnMount`, `WaitingToStartBlock.ts:64`; default false at `ReportOutputBehavior.ts:33-43`). `AnalyticsTransformer.ts:338-380` then returns empty segments, but the write path (`resultRecorder.ts:108-152`) has no guard and sets `'logged'` purely on write success. Toast copy: `HomeTour.tsx:836-843`; empty table: `ReviewGrid.tsx:345-347`.

**Done when:** immediate Stop on the gate shows the explanatory state, not "session logged"; a real segment run + Stop logs a row.

## H5 — Dashboard empty state is a dead end (medium)

**Fix (~2 h):**

1. Extend `WqlEmptyState` (`packages/ui/src/widgets/WqlEmptyState.tsx:10-15`) with an optional `actions` slot/props — backward compatible; every widget type already returns it when empty
2. In `DashboardViewPage`, when the whole board is empty, wrap with two CTAs: "Preview with sample data" (reuse `SampleDataPrompt.tsx:90-101`; fixtures in `apps/playground/app/tour/homeAnalyticsData.ts`) and "Log your first workout"

**Why:** `WqlEmptyState` is a static label with no action props, so all ten widgets show identical dead text. The landing demo looks populated only because it bypasses `queryService` with hardcoded fixtures.

**Done when:** a fresh profile sees sample-data + log-first CTAs; widgets render normally once real data lands.

## H4 — Notes and collections render raw markdown (medium)

**Fix (~half a day):**

1. Give collection detail (`WorkoutEditorPage.tsx` ~168) and journal (`JournalDatePage.tsx`) pages a read-mode default: render the body with the `CanvasProse` markdown pass (`apps/playground/app/canvas/CanvasProse.tsx:345-350`), frontmatter stripped/converted to chips
2. Add an "Edit" toggle into the existing `NoteEditor`
3. Trim the frontmatter wall `journalWorkout.ts:35-41` generates (`---`/`tags:`/`Source: [...]` lines) for the common case

**Why:** those pages render raw CodeMirror source; its preview extensions (`NoteEditor.tsx:424-431`) hide syntax piecemeal but never render tables, headings, links, or strip frontmatter. The working renderer already exists — `CanvasProse` (ReactMarkdown + remarkGfm), precedent at `JournalZipLoadPage.tsx:272-279`. Do NOT extend the CM decorations into a full renderer; reuse the one that works.

**Done when:** Event 05 or a fresh journal note shows formatted headings/tables/links, no visible `---`/`|`/`#`; Edit still exposes source.

## H3 — `last 2w` window anchors to latest activity, not today (medium)

**Decide first, then fix (~2 h after the call):**

1. Policy call: make `last 2w` calendar-anchored (today) by default — or keep "relative to latest activity" as an explicit separate chip ("last 2w of activity") with the effective range in its tooltip (e.g. `2025-12-29 → 2026-01-12`)
2. Second policy call: undated catalogue rows (`createdAt: 0`, set by `scripts/generate-static-block-index.ts:29-33,66`) — recommended: always shown, in every scope (they're static curation, not activity)
3. Implement in `packages/wql/src/QueryService.ts` (`effectiveTimeWindow` ~146-157, `windowAnchor` ~157-178); the Library passes `anchor: 'latest-activity'` at `apps/playground/app/lib/entrySearch.ts:27,40,44`

**Why:** relative windows anchor to the newest `createdAt` in scope before filters. Feeds' newest post is 2026-01-12, so "last 2w" meant "two weeks before Jan 12" — January posts were *in* window. And `createdAt: 0` rows fell inside the window on the Collections tab (661) but outside on All (0). Same chip, two meanings.

**Done when:** the same query shows the same effective window on All / Collections / Feeds; out-of-range feed posts don't appear; catalogue counts agree across tabs.

## H6 — Command palette doesn't filter as you type (low)

**Fix (~2 h, pick one — recommended first):**

1. Feed the pending free text into the source search live (debounce ~150 ms); keep WQL serialization unchanged — pending text stays uncommitted (`WqlComposer.tsx:232+`, commit at `:389`); the search that re-runs per query change lives in `PaletteShell.tsx:81-108`
2. Or: keep Enter-to-commit, but make the pending state unmistakable ("Press Enter to search 'fran'" + pending-match count; count strip at `WqlDiagnosticsStrip.tsx:117`)

**Done when:** typing narrows results live, or the pending state is explicit; Enter behavior unchanged.

## H7 — Tour ring chips overlap content at 390 px (low)

**Fix (~30 min):**

1. In `TourRing.tsx`, the chip label sits at `-top-3` (lines 158-163) with no clamping — when `box.y - chipHeight < canvasTop`, flip the chip below the ring (`top-full` + offset)
2. Verify at 375/390 px for the `editor.wodBlock` and `analytics.table` registry keys

**Done when:** no chip covers its annotated content at 375–430 px; desktop unchanged.

## H8 — CJK dates in an English UI (low · working as designed, revisit default)

**Fix (~30 min after the policy call):**

1. Make the "Auto" date-locale default follow the UI language (English) instead of the raw browser locale — `apps/playground/app/lib/dateLocale.ts` (pref `wodwiki:dateLocale`, ⋮ menu at `PageToolbar.tsx:191-200`, formatter `dateFormat.ts:13-18`)
2. Or keep browser-locale Auto but rename it "Browser language" in the ⋮ menu
3. Update `dateLocale.test.ts:34-37`, which asserts the current zh behavior

**Done when:** a fresh `zh`-locale browser sees English-format dates; the ⋮ override still works.

## Mapping to the original report

| Report # | Here | Note |
|---|---|---|
| 1 | excluded | Hosting 404 status — testing artifact (GH Pages `404.html` SPA fallback); maintainer decision |
| 2 | H1 | Root cause re-verified live: trailing-slash redirect × exact-match lookup |
| 3 | H2 | |
| 4 | H3 | |
| 5 | H4 | |
| 6 | H5 | |
| 7 | H6 | |
| 8 | H7 | |
| 9 | H8 | Working as designed; default policy revisit |
| 10 | excluded | Shares issue 1's hosting premise; unmatched-path handling out of scope (maintainer decision) |

## Verification notes

- H1 verified live on v0.35.2046 on 2026-08-30: hard load of `/guide/syntax/basics` (host-redirected to trailing slash) renders `h1: "Home"`; in-app pushState navigation renders the "Core Concepts" lesson.
- H2–H8 root causes are code-read at HEAD, pinned to file:line in each section; none re-executed against the deployed build.
