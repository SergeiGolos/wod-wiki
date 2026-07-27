# Unified Journal with Plan Mode — Decision

## Context

The L1 sidebar exposes two routes that the user perceives as one feature:

- **Journal** (`/journal`) → renders `JournalWeeklyPage` — backfilled history (today + past dates).
- **Plan** (`/plan`) → renders `PlanPage` — forward-looking view (today + future dates).

The two pages run on shared JSX (`<JournalFeed>`), shared hooks (`useJournalQueryState`,
`useCreateJournalEntry`, `useShowPlaygrounds`), the same nav panel (`JournalNavPanel`), and the
same shell (`CanvasPage`, `actionsMode: 'journal-active'`, `withIndex: true`). The only real
differences are:

1. `PlanPage` shows every date in a forward window (today + 14, capped at +90, or last-entry + 7)
   and shows a create-note card on every empty future date. `JournalWeeklyPage` shows past dates
   that have results and today.
2. `PlanPage` passes `items={[]}` to `JournalFeed` (no past results); `JournalWeeklyPage` passes
   the full results list and `showEmptyDates` only when a focused date has no note.

Importantly, the **edit page** (`/journal/:date` → `JournalPage`) already handles all three
date-based modes via one seam: `derivePageMode('journal', targetDate)` returns
`journal-history` (past), `journal-active` (today), or `journal-plan` (future). The block-command
hook `useScriptBlockCommands(mode, ...)` reads that discriminant to pick which actions appear per
fence-block — `play`, `open-in-playground`, `add-to-today`, `schedule` all branch on the same
mode. So the per-date behaviour on the edit page is already unified. What is *not* unified is
the **list** page.

## Why two list routes is the wrong shape

- The user perceives "Journal" and "Plan" as the same thing: a calendar of note entries, with a
  way to look back or ahead. Two routes forces them to pick a direction before they know what
  they want; the actual primary action (the click on a date cell) is identical on both.
- The shell, hook stack, query-state, nav panel, and create-journal-entry flow are already shared
  by both pages; the duplication is in route handlers and a `PageKind` member.
- The `CalendarCard`-driven date click inside `JournalNavPanel` already routes past *and* future
  dates through the same `/journal?s=…` link — the date-direction split is not even respected
  consistently across the L2 panel.
- Concept `Plan` is overloaded: the **edit page** distinguishes `journal-active` vs
  `journal-plan` per block based on the date (today vs future). The list page's "forward-only"
  filter is a different concept from the per-block planning concept that already exists in
  `derivePageMode`.

## Decision

**Collapse `/journal` (list) and `/plan` (list) into a single `/journal` route** that renders
one list component which:

- Always covers a span of dates that includes today (history on one side + planning window on
  the other), defaulting to a balanced window but allowing calendar clicks to pan in either
  direction.
- Shows past dates with their results and future dates as create-note cards — i.e. the union of
  `JournalWeeklyPage`'s and `PlanPage`'s behaviour on a single date axis.
- Carries a new `?mode=` URL param (values: `history | today | plan | all`, default `all`) that
  controls the visible window; the existing `?s=` (focused date) and `?sel=` (multi-select seeds)
  parameters continue to work.
- Exposes a **calendar mode-switch button** in the `JournalNavPanel` L2 panel: a single toggle
  beside the mini-calendar that cycles between `History` / `Today` / `Plan` modes (mirrors the
  date-classifier the edit page uses, so the two pages agree on terminology).
- Keeps the `Journal` label on the L1 sidebar item. `Plan` becomes an in-page mode, not a
  top-level route — keeping the user-visible mental model simple.

The **edit page seam already exists**: `JournalPage` already calls `derivePageMode('journal', noteId)`
to pick the right block commands. No changes needed there; behaviour for `journal-history` /
`journal-active` / `journal-plan` per block is already correct.

`/plan` is preserved as a redirect to `/journal?mode=plan` so existing deep links, bookmarks,
and `useSelectWorkout` callers don't break.

## Consequences

- `PageKind` loses the `'plan'` variant. The render lookup in `App.tsx` `renderInner` shrinks by
  one branch; `derivePage` and `deriveShell` in `lib/routeView.ts` simplify.
- `PlanPage.tsx` becomes a thin shim: read `?mode=`, compute the window, and defer to the new
  unified list. (Or is removed entirely and `App.tsx` routes `/plan` to the unified list page
  via the redirect.)
- `useJournalQueryState` gains one new param (`mode`) and a setter. Today it already manages
  `?s=` and `?sel=` via `nuqs`; add `mode` next to them.
- The L2 `JournalNavPanel` calendar mode toggle does not create a new L1 sidebar item, so the
  nav tree stays a 6-item L1.
- Tests can treat past/today/future as three modes of the same page, instead of two parallel
  fixtures (`ListViews.test.tsx`, `routeView.test.ts`).

## Non-goals

- Changing the edit page's per-block mode (`derivePageMode` is canonical, already covers past /
  today / future) — no work to do.
- Renaming `journal-plan` / `journal-history` / `journal-active` — these are content-type
  discriminants, used downstream; refactoring them is out of scope.
- Adding new persistence semantics. Journal entries on future dates already work via
  `useCreateJournalEntry` and `useJournalZipProcessor` — no storage changes.
- Changing the calendar UI itself. `CalendarCard` keeps its month-view; the mode-switch sits
  beside it.

## Alternatives considered

1. **Keep two routes, add a top-level toggle in L1 sidebar.** Rejected — the user-perceived
   product is one feature; two routes forces them to choose direction up front and duplicates
   the route handlers, nav, hooks, and shell.
2. **Rename `/plan` to `/journal/upcoming`.** Rejected — adds a second route for the same
   unification gain, doesn't help the L2 calendar click experience.
3. **Drop the Plan L1 sidebar item entirely.** Rejected — historical booking entry-point exists
   externally; the redirect is the safer cutover.

## Risks

- A redirect from `/plan` to `/journal?mode=plan` must be `replace: true` to avoid back-button
  loops. Verified routing behaviour in tests.
- The mode-toggle in the L2 panel must not break the L3 nav-index behaviour. Mitigation: only
  change the visible window on the list page; entry pages `/journal/:id` are unaffected by
  `?mode=`.
- A test that hard-codes `page === 'plan'` would break. Mitigation: `'plan'` is removed from
  the union; TypeScript will surface every call site.
