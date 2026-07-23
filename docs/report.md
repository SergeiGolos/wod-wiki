# Dogfood Report: WOD Wiki (wod.wiki)

**Date:** 2026-07-24
**Target:** https://wod.wiki (v0.13.1978, GitHub Pages SPA)
**Scope:** Full site — Home, Journal, Feeds, Collections, Efforts, Syntax guide, workout timer, search, scheduling, sharing, custom efforts
**Tester:** Agent (exploratory QA)

## Executive Summary

The core loop of WOD Wiki — browse a workout, run it as a timer, log results — works well: the demo editor, WallClock timer overlay, command-palette search, feeds, collections, and syntax docs all functioned smoothly. However, **two prominent creation flows are broken**: the home page's "New Workout Note" CTA corrupts the embedded demo with a `Source not found` error, and the Efforts page's "Create Custom" button routes to an `'Effort "new" not found.'` dead end. Beyond that, every deep link on the site returns HTTP 404 (a GitHub Pages SPA-fallback tradeoff that breaks link previews and tools), and the app leaks developer-environment artifacts into the UI: browser-locale (Chinese) date headers, mixed UTC/local timestamps, and internal quest-validation jargon. The two broken CTAs should be fixed first — they sit on the most visible surfaces of the app.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 2 |
| Medium   | 4 |
| Low      | 5 |
| **Total**| **11** |

| Category | Count |
|----------|-------|
| Functional    | 5 |
| Visual        | 0 |
| Accessibility | 1 |
| Console       | 0 |
| UX            | 2 |
| Content       | 3 |

## Issues

### 1. "New Workout Note" CTA breaks the home page's embedded demo with "Source not found"

- **Severity:** High
- **Category:** Functional
- **URL:** https://wod.wiki/ (home)
- **Description:** Clicking the "✍️ New Workout Note" button on the landing page does not open or create a new note. Instead, the embedded "Learn the Syntax" demo panel is rebound to a non-existent source and displays an error: `# Source not found / Path: query:new / Resolved: ../../markdown/query:new`. Side effects: the page-tour pager advances (1/3 → 2/3) and the quest captions change to inconsistent states ("Challenge complete." / "No active block.").
- **Steps to reproduce:**
  1. Open https://wod.wiki/
  2. Under "Jump Right In", click "✍️ New Workout Note"
  3. Scroll to the "Learn the Syntax" demo panel
- **Expected:** A new blank workout note opens (or the playground editor appears), and the home demo remains intact.
- **Actual:** No note is created; the demo panel shows a `Source not found` error and stays broken until reload.
- **Console errors:** Unavailable (no console tool in test environment)
- **Screenshot:** screenshots/15-new-note-source-not-found.png

### 2. "Create Custom" effort flow dead-ends at 'Effort "new" not found.'

- **Severity:** High
- **Category:** Functional
- **URL:** https://wod.wiki/efforts → https://wod.wiki/effort/new?mode=create
- **Description:** The "+ Create Custom" button on the Efforts catalog navigates to `/effort/new?mode=create`, but the route resolves `new` as an effort slug and renders the error page `Effort "new" not found.` with only a "Back to Catalog" button. Creating a custom effort from scratch is impossible via the UI. (Partial workaround: open an existing effort and use "Clone".)
- **Steps to reproduce:**
  1. Go to https://wod.wiki/efforts
  2. Click "+ Create Custom" (top right)
- **Expected:** A creation form (or blank editor) for a new custom effort.
- **Actual:** Error page: `Effort "new" not found.`
- **Console errors:** Unavailable
- **Screenshot:** screenshots/10-create-custom-retry.png

### 3. Every deep link returns HTTP 404 (SPA fallback), breaking previews and tools

- **Severity:** Medium
- **Category:** Functional
- **URL:** All sub-paths, e.g. https://wod.wiki/collections/the-golos-method/emom-weighted-pushups, https://wod.wiki/journal/2026-07-24, https://wod.wiki/guide/syntax
- **Description:** All paths except `/` return HTTP 404 from GitHub Pages. A custom `404.html` performs a sessionStorage-based redirect so real browsers recover and render the route — but anything that doesn't execute that JS (link unfurlers in Slack/iMessage/Discord, link checkers, crawlers, some embedded browsers) sees a hard 404. This directly undermines the in-app "Share" feature: shared links look broken to preview bots. The QA browser tool itself refused to load deep links ("visit 404"), demonstrating the practical impact.
- **Steps to reproduce:**
  1. Run `curl -sI https://wod.wiki/guide/syntax` (or any sub-path)
  2. Observe `HTTP/2 404`
- **Expected:** Deep links return 200 (e.g. via host-level rewrite) or the app accepts the tradeoff and documents it; at minimum, share-link targets should resolve for unfurlers.
- **Actual:** All deep links return 404 status; recovery depends on client-side JS in 404.html.
- **Console errors:** Unavailable
- **Screenshot:** N/A (verified via curl; body of 404.html contains the `spa-redirect` fallback script)

### 4. Date headers render in browser locale (Chinese), producing a mixed-language UI

- **Severity:** Medium
- **Category:** Content
- **URL:** https://wod.wiki/journal, https://wod.wiki/feeds, feed detail sidebars, journal entry dialogs
- **Description:** Journal date headers (e.g. `2026年7月24日星期五 — Today`), Feeds date dividers, session pickers (`1月12日`), and the "New journal entry" dialog title all render in Chinese when the browser locale is zh-CN, while the rest of the UI is English. The app offers no language/locale setting. Caveat: observed in a zh-CN-locale test browser; en-US users will see English dates — but any non-English-locale user gets a jarring mixed-language interface.
- **Steps to reproduce:**
  1. Use a browser with zh-CN locale
  2. Open Journal or Feeds
- **Expected:** Dates render in the app's UI language (English) by default, or a locale setting exists.
- **Actual:** All date strings render in Chinese; UI text stays English.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/03-journal-chinese-dates.png, screenshots/06-feeds.png

### 5. Timezone inconsistency: Journal "Today" (local) vs Playground timestamp (UTC)

- **Severity:** Medium
- **Category:** Functional
- **URL:** https://wod.wiki/journal vs https://wod.wiki/playground/*
- **Description:** In the same session, the Journal showed `2026-07-24 — Today` (browser-local date) while a newly created Playground was titled "Playground – Jul 23, 2026 5:01 PM" (UTC). A user working across both surfaces near midnight sees two different "current" dates, and entries can appear on a different day than expected. The playground header also truncates the title ("Jul 23, 2026 5:…").
- **Steps to reproduce:**
  1. In a UTC+8 (or similar) timezone, open Journal — note "Today"
  2. Create/open a Playground — note the date in its title
- **Expected:** One consistent timezone (ideally user-local, or explicitly labeled UTC) across journal, playground names, and timestamps.
- **Actual:** Journal uses local time; playground naming uses UTC.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/05-empty-block-playground.png (UTC title); screenshots/03-journal-chinese-dates.png (local "Today")

### 6. "Schedule" button is mislabeled — books into today's journal and immediately pushes a start-workout flow

- **Severity:** Medium
- **Category:** UX
- **URL:** https://wod.wiki/collections/the-golos-method/emom-weighted-pushups (and any workout block)
- **Description:** Clicking "Schedule" on a workout gives no date picker and no confirmation. It instantly writes the workout into *today's* journal entry, navigates away from the current page to `/journal/{today}`, and opens a "Set Your Targets → Start Workout" overlay. A user who wanted to plan a session for Friday instead gets an unsolicited entry today plus a prompt to start working out now, and loses their place.
- **Steps to reproduce:**
  1. Open any workout (e.g. a collection WOD)
  2. Click "Schedule"
- **Expected:** A date/time picker (or at least a confirm) before writing to the journal; no forced navigation/start prompt.
- **Actual:** Immediate write to today's journal + navigation + start-workout overlay.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/03-journal-chinese-dates.png (resulting journal entry for 2026-07-24)

### 7. Browser tab title goes stale after SPA navigation

- **Severity:** Low
- **Category:** Functional
- **URL:** https://wod.wiki/ (after visiting an effort page)
- **Description:** After visiting `/effort/air-squat`, the document title became "Wod.Wiki - Air Squat (Custom)". Navigating back Home (and to other pages) did not reset it — the tab kept showing "Air Squat (Custom)" while on the home page. Misleads users with multiple tabs and pollutes browser history entries.
- **Steps to reproduce:**
  1. Go to Efforts → open "Air Squat" → click Clone
  2. Navigate Home via the sidebar
  3. Check the browser tab title
- **Expected:** Title updates per route (e.g. "Wod.Wiki" or "Wod.Wiki - Home").
- **Actual:** Title remains "Wod.Wiki - Air Squat (Custom)".
- **Console errors:** Unavailable
- **Screenshot:** N/A (observed in browser tab list)

### 8. Playground onboarding modal not exposed to automation/accessibility tree

- **Severity:** Low (needs verification with a screen reader)
- **Category:** Accessibility
- **URL:** https://wod.wiki/playground/* (first visit, "Make it yours — 30 seconds" modal)
- **Description:** While the onboarding modal ("What's your training goal?" with Skip/Next) was open, *no* interactive elements on the page — including the modal's own buttons — were exposed to the accessibility tree used by automation tools. If this holds for actual screen readers, the modal (and everything under it) is inoperable non-visually.
- **Steps to reproduce:**
  1. Trigger a new Playground (first visit)
  2. Inspect available interactive elements via assistive tooling
- **Expected:** Modal buttons (goal options, Skip, Next) are focusable and announced.
- **Actual:** No elements exposed; modal could not be operated via the accessibility tree.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/05-empty-block-playground.png

### 9. Clone confirmation toast names the clone instead of the source

- **Severity:** Low
- **Category:** Content
- **URL:** https://wod.wiki/effort/air-squat
- **Description:** After cloning "Air Squat", the toast reads `Created a custom copy of "Air Squat (Custom)"` — it should reference the source ("Air Squat"), not the new clone's name. Reads as if the app duplicated an already-custom item.
- **Steps to reproduce:**
  1. Open any bundled effort
  2. Click Clone
- **Expected:** `Created a custom copy of "Air Squat".`
- **Actual:** `Created a custom copy of "Air Squat (Custom)".`
- **Console errors:** Unavailable
- **Screenshot:** screenshots/12-effort-clone.png

### 10. Developer-speak quest descriptions on the home page

- **Severity:** Low
- **Category:** Content
- **URL:** https://wod.wiki/ (home, "Learn the Syntax" quests)
- **Description:** The onboarding quests display internal validation states as user-facing copy: "Change the workout — *Quest has no validation schema.*" and "Run it to the finish — *Validated at runtime.*" This is implementation jargon, not guidance. After issue #1 occurs, the captions change to equally unhelpful "Challenge complete." / "No active block."
- **Steps to reproduce:**
  1. Open https://wod.wiki/
  2. Read the two quest cards under "Learn the Syntax"
- **Expected:** User-meaningful hints (e.g. "Edit the workout on the right to continue").
- **Actual:** Internal schema/validation status messages.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/01-home-mid.png, screenshots/15-new-note-source-not-found.png

### 11. "Debug Mode" exposed in the production header menu

- **Severity:** Low
- **Category:** UX
- **URL:** https://wod.wiki/ (header ⋮ menu, all pages)
- **Description:** The global ⋮ menu shows a "Debug Mode" entry to all users alongside Sound/Theme/Download. For a production app this invites confusion (and whatever state debug mode alters). Consider gating it behind a query param or build flag.
- **Steps to reproduce:**
  1. Click the ⋮ icon in the header
- **Expected:** No developer-only options in the production menu.
- **Actual:** "Debug Mode" menu item visible.
- **Console errors:** Unavailable
- **Screenshot:** screenshots/16-header-menu.png

## Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | "New Workout Note" CTA breaks home demo ("Source not found") | High | Functional | / |
| 2 | "Create Custom" effort dead-ends at 'Effort "new" not found.' | High | Functional | /efforts |
| 3 | All deep links return HTTP 404 (SPA fallback) | Medium | Functional | all sub-paths |
| 4 | Date headers render in Chinese (locale leak, mixed-language UI) | Medium | Content | /journal, /feeds |
| 5 | Timezone inconsistency: local journal vs UTC playground | Medium | Functional | /journal, /playground/* |
| 6 | "Schedule" mislabeled: writes to today + forces start flow | Medium | UX | workout pages |
| 7 | Stale browser tab title after SPA navigation | Low | Functional | / |
| 8 | Onboarding modal absent from accessibility tree | Low | Accessibility | /playground/* |
| 9 | Clone toast names clone instead of source | Low | Content | /effort/* |
| 10 | Dev-speak quest descriptions on home | Low | Content | / |
| 11 | "Debug Mode" visible in production menu | Low | UX | all pages |

## Testing Notes

**Tested:**
- Home page: layout, onboarding quests, demo editor, Run → WallClock timer overlay (start/next/stop/close), header ⋮ menu, "New Workout Note" CTA
- Global search (command palette): query, results, result navigation
- Journal: calendar navigation, empty-day state, entry creation (Blank), entry detail
- Feeds: list, entry detail (Murph WOD)
- Collections: list, workout detail, Share (clipboard toast), Schedule flow
- Efforts: catalog, search filter, discipline/origin filters, detail page, Clone, Create Custom
- Syntax Reference hub page
- Edge cases: empty wod block → Playground, deep-link HTTP statuses (curl), server reachability

**Not tested / out of scope:**
- Logged-in/authenticated features (no credentials; app appears local-first)
- Mobile/responsive viewports (fixed desktop viewport in test environment)
- Screen-reader verification of issue #8 (automation tree only)
- Timer audio cues, Buy Me a Coffee link, Download Markdown, Reset & Clear Cache
- Form validation with special characters/very long input (no suitable text forms found)

**Blockers and limitations:**
- Console inspection unavailable in this environment — JS console errors may be underreported
- The browser automation tool refused to load any deep-link URL (HTTP 404 at server level), so fresh-load recovery of deep links via the 404.html sessionStorage redirect could not be verified end-to-end; behavior was confirmed by inspecting the 404.html script and by in-app SPA navigation
- Keyboard navigation (Tab/Enter) could not be tested — no key-press tool available
