# Dogfood Report: Wod.Wiki Library (WQL rebuild) — wql-for-all preview

**Date:** 2026-08-01
**Target:** https://wql-for-all.preview.wod.wiki/library (v0.20.267, PR.804, CloudFront/S3)
**Scope:** Library feature rebuilt on WQL — query bar, filters (Contains/Tag/Catalog/Source), time window, results list, deep links, empty states, mobile viewport, improvement proposals
**Tester:** Agent (exploratory QA)

## Executive Summary

The WQL query-bar rebuild is structurally solid: chip-based query composition, combobox pickers with type-ahead, URL round-tripping of app-generated queries, and good empty states. However, **two core query semantics are broken**: the `last 2w` time window does not actually constrain results (673/673 matched with months-old entries), and tag filters match 0 notes even for tags the picker itself suggests and that exist verbatim in note frontmatter. These make the two most prominent default filters untrustworthy. The single most important fix: make the time window and tag clauses actually filter, or stop showing them by default.

|Severity|Count|
|---|---|
|Critical|0|
|High|2|
|Medium|6|
|Low|3|
|**Total**|11|

|Category|Count|
|---|---|
|Functional|5|
|Visual|2|
|Accessibility|0|
|Console|0|
|UX|3|
|Content|1|

## Issues

### 1. Tag filter matches 0 notes for tags that exist in note frontmatter

- **Severity:** High
- **Category:** Functional
- **URL:** https://wql-for-all.preview.wod.wiki/library?q=find%3Anote%7Btags%3Astrength%7D+in+all
- **Description:** Applying a `tags:` clause always yields "0 of 673 notes matched", even for tags the picker's own suggestion list offers (strength, conditioning). The note "Wednesday Hero" has frontmatter `tags: [crossfit, conditioning, strength]` and still does not match `tags:strength`.
- **Steps to reproduce:**
  1. Open /library → Add Filter → Tag → pick `strength` (offered by the picker)
  2. Observe "0 of 673 notes matched"
  3. Open the Wednesday Hero note (/feeds/crossfit-programming/2026-01-12/wednesday-hero) and see `strength` in its frontmatter
- **Expected:** Notes tagged `strength` are returned.
- **Actual:** 0 results for every tag tested (strength, conditioning, with and without a time window).
- **Console errors:** None (pageerror listener clean)
- **Screenshot:** screenshots/09-tag-strength.png, screenshots/10-tag-no-window.png, screenshots/13-open-note.png

### 2. "last 2w" time window does not filter results

- **Severity:** High
- **Category:** Functional
- **URL:** https://wql-for-all.preview.wod.wiki/library (default query `find:note in all last 2w`)
- **Description:** The default query carries a `WINDOW last 2w` clause and the status line claims "673 of 673 notes matched" — yet every visible entry is dated Dec 2025 – Jan 2026, ~7 months before "now" (Aug 2026). Filtering by catalog (`7 of 673`) still shows the same months-old entries with the window active. The window chip is decorative: it changes nothing until combined with the (broken) tag clause.
- **Steps to reproduce:**
  1. Open /library; note `WINDOW last 2w` in the status line and "673 of 673 matched"
  2. Observe entry dates of Dec 2025 / Jan 2026
  3. Add a catalog filter → 7 matched, all still months old, window still displayed
- **Expected:** Only notes within the last 2 weeks match (realistically 0, prompting a visible "no recent notes" state) — or the default query shouldn't include a window.
- **Actual:** Window has no effect on the result set or the count.
- **Console errors:** None
- **Screenshot:** screenshots/01-library.png, screenshots/12-catalog-filter.png

### 3. Free-text / invalid input in the search box is silently ignored

- **Severity:** Medium
- **Category:** UX
- **URL:** https://wql-for-all.preview.wod.wiki/library
- **Description:** Typing `))) invalid ((( wql` or `squat` into the "Type search term and press Enter..." box produces no visible reaction: no parse error, no "invalid query" badge, no result change — the status stays green "VALID 673 of 673". Likewise, deep-linking `?q=squat` or `?q=find:foo )))garbage(((` silently resets to the default query with no feedback that the URL query was rejected.
- **Steps to reproduce:** Type garbage or a plain word into the search box; or open /library?q=squat directly.
- **Expected:** Parse errors surface inline ("couldn't parse X — see WQL help"), and valid free text compiles to a contains/text clause.
- **Actual:** Input is discarded silently in both directions.
- **Screenshot:** screenshots/02-invalid-wql.png, screenshots/04-q-squat.png, screenshots/05-q-garbage.png

### 4. Contains filter picker shows "Nothing here yet" and offers no clear commit path

- **Severity:** Medium
- **Category:** UX
- **URL:** https://wql-for-all.preview.wod.wiki/library
- **Description:** Add Filter → Contains → typing `squat` shows only "Nothing here yet" in the dropdown. There is no "Use 'squat'" option, no hint that Enter commits free text, and the chip stays `text: [query]`. Unlike Tag/Catalog (which suggest real values), Contains suggests nothing even for a term that plainly exists in note bodies ("300 Air Squats").
- **Expected:** Free text is committable with a visible affordance (e.g. "Search for 'squat' ↵"); ideally type-ahead previews matching note titles.
- **Actual:** Dead-end UI; an unfilled `[query]` placeholder chip remains in the query bar and is silently ignored by the compiled query.
- **Screenshot:** screenshots/11-contains-squat.png

### 5. Blocks source counts blocks but renders notes

- **Severity:** Medium
- **Category:** Functional
- **URL:** https://wql-for-all.preview.wod.wiki/library?q=find%3Ablock+in+all
- **Description:** Switching Source → blocks reports "21329 of 21329 blocks matched" but the result list renders the same note-level cards (Wednesday Hero, Monday Strength…) as the notes view. The user cannot see, inspect, or open any of the 21,329 blocks the query matched — the count and the presentation describe different entities.
- **Expected:** Block-level results (block type, parent note, preview of the fenced region) or the count expressed in parent notes.
- **Actual:** Block count with note cards; no way to reach an individual block.
- **Screenshot:** screenshots/17-blocks.png

### 6. Phantom "Undated — wednesday-hero" note appeared in the library after viewing a feed post

- **Severity:** Medium
- **Category:** Functional
- **URL:** https://wql-for-all.preview.wod.wiki/library
- **Description:** After opening the Wednesday Hero feed post once, returning to /library showed the total count incremented (673 → 674) and a new "Undated / wednesday-hero / Note" entry in the list. Merely viewing a feed appears to create (or index) a local undated note, polluting the library.
- **Expected:** Viewing a feed post is read-only; the library count is stable across navigations.
- **Actual:** A ghost entry appears; count drifts between sessions.
- **Screenshot:** screenshots/15-source.png

### 7. Default query lands users on a filter combination guaranteed to be empty or misleading

- **Severity:** Medium
- **Category:** UX
- **URL:** https://wql-for-all.preview.wod.wiki/library
- **Description:** The default `find:note in all last 2w` query pairs a stale demo dataset (newest note Jan 2026) with a 2-week window. Once issue #2 is fixed, the default landing view becomes permanently empty for this dataset — and today it's permanently misleading. Either way the first-run experience of the flagship feature is broken.
- **Expected:** Default to no window (or window anchored to the dataset's newest entry), and let the user narrow down.
- **Screenshot:** screenshots/01-library.png

### 8. Date group headers render in the browser's locale, inconsistent with the English UI — and differ between desktop and mobile sessions

- **Severity:** Medium
- **Category:** Visual
- **URL:** https://wql-for-all.preview.wod.wiki/library
- **Description:** Desktop session shows Chinese date headers ("2026年1月12日") inside an otherwise English UI; the emulated mobile session (en-US UA) shows "JAN 12, 2026". The app has no locale setting — headers silently follow the browser locale, producing a half-localized UI and inconsistent rendering for the same content.
- **Expected:** Dates follow the app language (English), or a full locale setting exists.
- **Screenshot:** screenshots/01-library.png (desktop, zh), screenshots/14-mobile-library.png (mobile, en)

### 9. Mobile result cards over-truncate titles

- **Severity:** Medium
- **Category:** Visual
- **URL:** https://wql-for-all.preview.wod.wiki/library (390×844)
- **Description:** On a 390px viewport, note titles truncate to ~2 characters plus ellipsis ("We…", "Mo…", "Op…", "B…") while most of the card row sits empty. The list becomes unreadable — users cannot distinguish "Monday Strength" from "Mid Distance…". Also the "⌘K" shortcut hint renders on a touch device with no keyboard.
- **Expected:** Titles use available width (truncate ~20+ chars); hide keyboard hints on touch.
- **Screenshot:** screenshots/14-mobile-library.png

### 10. Note page renders raw YAML frontmatter as visible content

- **Severity:** Low
- **Category:** Content
- **URL:** https://wql-for-all.preview.wod.wiki/feeds/crossfit-programming/2026-01-12/wednesday-hero
- **Description:** The opened note displays the literal `--- tags: - crossfit - conditioning - strength ---` block at the top of the rendered page instead of parsing it into metadata/chips.
- **Screenshot:** screenshots/13-open-note.png

### 11. Results list renders all 673+ matches in one ~42,000px page

- **Severity:** Low
- **Category:** UX
- **Description:** No pagination, infinite-scroll batching, or visible virtualization cap is apparent for large result sets (673 notes / 661 catalogue sessions; blocks source claims 21,329 matches). This risks scroll/perf degradation on weaker devices and makes the bottom "Catalogues — Static, undated" section effectively undiscoverable. No "jump to top", no result-set subheadings beyond date.
- **Screenshot:** screenshots/01-library.png

## Summary Table

|#|Title|Severity|Category|URL|
|---|---|---|---|---|
|1|Tag filter matches 0 notes despite existing tags|High|Functional|/library?q=find:note{tags:strength}|
|2|"last 2w" time window does not filter results|High|Functional|/library|
|3|Free-text/invalid input silently ignored (box + URL)|Medium|UX|/library|
|4|Contains picker dead-ends on free text|Medium|UX|/library|
|5|Blocks source counts blocks but renders notes|Medium|Functional|/library?q=find:block+in+all|
|6|Phantom undated note appears after viewing feed|Medium|Functional|/library|
|7|Default query guarantees empty/misleading landing|Medium|UX|/library|
|8|Date headers follow browser locale, inconsistent UI|Medium|Visual|/library|
|9|Mobile cards over-truncate titles|Medium|Visual|/library (390px)|
|10|Raw YAML frontmatter rendered on note page|Low|Content|/feeds/.../wednesday-hero|
|11|All results rendered in one 42k px page|Low|UX|/library|

## Improvement Proposals

1. **Make clauses honest.** A clause that doesn't filter (window) or can't match (tags) should never show a green `VALID` badge with a confident "N of M matched". Validate clauses against the index (e.g. warn "tag 'strength' not indexed") and grey out inert clauses.
2. **Turn the search box into a real WQL editor.** Live parse feedback (red underline + message), free-text → `text:"..."` compilation on Enter, and accept hand-written WQL in `?q=` with an error banner instead of a silent reset. Today the box is a trap: everything you type vanishes.
3. **Rethink the default query.** Drop the window, or anchor windows relative to the newest indexed entry ("latest activity") rather than wall-clock now — that keeps "last 2w" meaningful on snapshots/demo data too.
4. **Block-level results.** For `find:block`, render block cards (type badge, parent note link, 3-line preview, "open at block" anchor). The count/render mismatch is the most confusing part of the rebuilt library.
5. **Result ergonomics.** Paginate or virtualize large sets, add a matched-count-per-date-group subheading, and a "jump to top / end". Add per-card date display (dates only exist as group headers, which scroll away).
6. **Mobile pass.** Fix title truncation, hide `⌘K`, make chips horizontally scrollable instead of pushing the input off-screen.
7. **Locale discipline.** Format dates with a fixed app locale (or expose a setting); don't leak browser locale into one component only.
8. **Read-only feeds.** Ensure viewing a feed post never mutates the local journal index (phantom undated notes erode trust in counts).
9. **Empty states that teach.** "No entries match" should offer one-click fixes: "Remove time window", "Clear tag filter", "Search all sources". The empty state currently dead-ends.
10. **Chip hygiene.** Placeholder chips (`text: [query]`, `tags: [tag]`) that were never filled should auto-remove on blur/close instead of persisting in the bar while being silently ignored.

## Testing Notes

**Tested:**
- Library default view, query bar chips (Source, Time window, Tag, Catalog, Contains), filter pickers with type-ahead, result list grouping, opening a note from results, Source switching (notes/feeds/blocks), deep links (`?q=` round-trip, /feeds/... direct load — both 200), invalid/garbage input in box and URL, empty states, mobile viewport 390×844 via Playwright emulation, pageerror console capture (clean).

**Not tested / out of scope:**
- Effort, Discipline, Block Type, Has Feature, Metric Join clauses (menu confirmed present; same picker pattern as Tag/Catalog)
- Journal source (personal data), metrics aggregation views
- Enter-key commit paths in pickers (no key-press tool in this environment — Contains commit could not be fully verified; flagged as UX risk, not confirmed defect)
- Authenticated/multi-user behavior, share-link generation from a query

**Blockers and limitations:**
- No console-log API; relied on Playwright `pageerror` listener (no errors captured).
- No keyboard press tool — Enter-only interactions were exercised via UI clicks and URL equivalents instead.
