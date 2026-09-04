---
state: closed 2026-09-03
assignee: serge
labels: [wayfinder:task]
title: "In-stream execution actions and segment-to-effort navigation"
blocked-by: ["005-results-and-segments-routes.md"]
---

## Question

While `/results` and `/results/segments` stream execution telemetry and segment splits, they remain passive data views:
1. Athletes viewing past workout results and segment splits cannot immediately re-run the prescribed workout block or add the prescription to today's journal.
2. Segment splits displaying movement effort names (e.g. Thruster, Pull Up) are static text with no cross-navigation into the movement's dedicated effort history or PR catalog (`/effort/:slug`).

How do we wire active in-stream actions and cross-navigation:
1. **In-stream execution actions**:
   - `entryRunHref(entry)`: returns `/run/:blockContentId` for `result` and `segment` entries carrying a valid `blockContentId`.
   - `entryCanAddToToday(entry)`: returns `true` for `result` and `segment` entries carrying `execution.noteId`.
   - `defaultAddToToday` in `QueriableStreamView`: resolves the parent note/block markdown from `execution.noteId` and clones it into today's journal note via `addEntryToTodayInput`.
2. **Segment-to-effort cross-navigation**:
   - In `LibraryRow` (Card view): render effort badges on segment entries that link directly to `/effort/:slug`.
   - In `PropertyTable` (Table view): render effort table cells with clickable badge links to `/effort/:slug`.
   - Stop click propagation so row selection/navigation is not accidentally triggered.
3. Verify with unit tests in `entryActions.test.ts`, `LibraryRow.test.tsx`, `PropertyTable.test.tsx`, and `QueriableStreamView.test.tsx`.

## Resolution

- **In-stream execution actions wired**:
  - `entryRunHref(entry)` returns `/run/:blockContentId` for `result` and `segment` entries with `blockContentId`.
  - `entryCanAddToToday(entry)` returns `true` for `result` and `segment` entries with `execution.noteId`.
  - `defaultAddToToday` in `QueriableStreamView` extracts the block or parent note's raw markdown and clones it onto today's journal date via `addEntryToTodayInput`.
  - `rowsRunToEntry` and `unifiedEventToEntry` in `entryMapper.ts` populate `blockContentId` from `UnifiedEventRecord`.
- **Segment-to-effort cross-navigation wired**:
  - `LibraryRow`: renders clickable effort badge link on segment entries to `/effort/:slug`.
  - `PropertyTable`: renders clickable effort badge link on `pacingTier` cells with `effortSlug` to `/effort/:slug`.
  - Both components stop click and keyboard propagation so row selection/navigation is not triggered.
- **Verification**:
  - Unit test coverage added and verified in `entryActions.test.ts`, `entryMapper.test.ts`, `LibraryRow.test.tsx`, `PropertyTable.test.tsx`, and `QueriableStreamView.test.tsx`.
