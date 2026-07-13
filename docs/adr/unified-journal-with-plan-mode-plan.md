# Unified Journal with Plan Mode — Implementation Plan

Companion to [`unified-journal-with-plan-mode.md`](./unified-journal-with-plan-mode.md). That
ADR records the *decision*; this doc records the *how* — the phased rollout, the
before/after code shape, and the data flow.

## Flow — before

```
                ┌───────────────────────────────────────────────────┐
                │ Sidebar L1 (nav/appNavTree.ts)                    │
                │  • /journal  → JournalWeeklyPage (history)       │
                │  • /plan     → PlanPage        (future)           │
                └────────────┬──────────────────────────────────────┘
                             │ user clicks a date cell
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ CalendarCard / useJournalQueryState              │
                │  /journal      ?s=<date> (filter)                │
                │  /journal/:id  navigate to entry                  │
                └────────────┬──────────────────────────────────────┘
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ List page  ────── JournalWeeklyPage               │
                │   loads: results + journalEntries                 │
                │   dateKeys: past dates + today                    │
                │   showEmptyDates: only on focused past dates     │
                │   items: full result list                         │
                │                                                  │
                │ List page  ────── PlanPage                        │
                │   loads: journalEntries only (no results)        │
                │   dateKeys: today + future window                 │
                │   showEmptyDates: every empty future date         │
                │   items: []                                       │
                └────────────┬──────────────────────────────────────┘
                             │ user clicks an entry
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ /journal/:id  JournalPage                         │
                │   derivePageMode('journal', :id)                  │
                │     past    → 'journal-history'                   │
                │     today   → 'journal-active'                    │
                │     future  → 'journal-plan'                      │
                │   useScriptBlockCommands(mode)                    │
                │     history → share + schedule                   │
                │     active  → play + share + schedule             │
                │     plan    → open-in-playground + share + sched  │
                └───────────────────────────────────────────────────┘
```

## Flow — after

```
                ┌───────────────────────────────────────────────────┐
                │ Sidebar L1 (nav/appNavTree.ts)                    │
                │  • /journal  → unified JournalListPage (all dates)│
                │  Plan item removed from L1                        │
                └────────────┬──────────────────────────────────────┘
                             │ user clicks a date cell
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ CalendarCard (L2 panel)                           │
                │  click date → /journal?s=<date>                   │
                │  mode toggle  → /journal?mode=history|today|plan │
                └────────────┬──────────────────────────────────────┘
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ List page  ───── JournalListPage (unified)        │
                │   ?mode=history → past dates + today              │
                │   ?mode=today   → today only                      │
                │   ?mode=plan    → today + future window           │
                │   ?mode=all     → past + today + future (default)│
                │   dateKeys: union of past+future windows          │
                │   showEmptyDates: every empty past and future     │
                │   items: full result list (cross-cutting past)    │
                └────────────┬──────────────────────────────────────┘
                             │ user clicks an entry
                             ▼
                ┌───────────────────────────────────────────────────┐
                │ /journal/:id  JournalPage        (unchanged)      │
                │   derivePageMode already handles past/today/fut   │
                │   useScriptBlockCommands(mode)  (unchanged)       │
                └───────────────────────────────────────────────────┘

External deep links:
  /plan   → <Navigate to="/journal?mode=plan" replace/>
  /plan?...  → <Navigate to="/journal?mode=plan&..." replace/>
```

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | New `JournalListPage` replaces `JournalWeeklyPage` + `PlanPage` | Both pages already share 80% of their shape (same hooks, same `<JournalFeed>` leaf); collapsing keeps the modes consistent |
| 2 | `?mode=history \| today \| plan \| all` URL param (default `all`) | Mirrors the edit-page discriminant; existing `?s=` and `?sel=` continue to work |
| 3 | `/plan` becomes a `<Navigate replace>` to `/journal?mode=plan` | Preserves deep links and external bookmarks; no Shadcn-style "deprecated alias" period |
| 4 | Remove `'plan'` from the `PageKind` union | The route no longer exists; TypeScript surfaces every test/callsite that needs updating |
| 5 | The calendar-mode toggle sits in `JournalNavPanel` (L2), not L1 | Keeps the L1 sidebar at 6 items; toggle right next to the calendar that it controls |
| 6 | `useJournalQueryState` gains one `mode` param + setter | Already owns `?s=` and `?sel=`; `nuqs` schema extends inline |
| 7 | Do NOT rename `journal-history / journal-active / journal-plan` | Those are content-type discriminants downstream; renaming is out of scope |
| 8 | Two-phase: Phase 1 add the unified page + mode param + nav toggle; Phase 2 delete the duplicated page files + remove the `PageKind: 'plan'` member + add the `/plan` redirect | Phase 1 is behaviour-preserving (the new page renders identically to the old); Phase 2 trims the dead code |

## Phased rollout

### Phase 1 — Add unified page + mode param + calendar toggle (safe)

Goal: a new `JournalListPage` exists, controlled by `?mode=`, that renders an equivalent
window to today's `JournalWeeklyPage` (mode=history) and `PlanPage` (mode=plan) — and the L2
nav panel exposes a mode toggle. Behaviour for the existing two routes is **unchanged** during
this phase; they keep rendering their original components.

1. **Extend `useJournalQueryState`** — add a `mode` param (default `all`) and `setMode`.

   ```ts
   // playground/src/hooks/useJournalQueryState.ts — BEFORE
   const [dateParam, setDateParam]         = useQueryState('s',  { defaultValue: '' })
   const [selParam, setSelParam]           = useQueryState('sel', { defaultValue: '' })
   const [tagParam, setTagParam]           = useQueryState('tag', { defaultValue: '' })
   return { dateParam, selParam, tagParam, setDateParam, setSelParam, setTagParam, /* derive */ }
   ```

   ```ts
   // playground/src/hooks/useJournalQueryState.ts — AFTER (type)
   export type JournalViewMode = 'history' | 'today' | 'plan' | 'all'

   const [modeParam, setModeParam]         = useQueryState('mode', {
     defaultValue: 'all',
     parse: (v): JournalViewMode =>
       v === 'history' || v === 'today' || v === 'plan' ? v : 'all',
   })
   ```

2. **Create `playground/src/views/JournalListPage.tsx`** — the unified list. It:

   ```ts
   // BEFORE: two parallel pages
   export function JournalWeeklyPage({ onSelect, onCreateEntry, workoutItems }: Props) { … }
   export function PlanPage({ workoutItems }: Props) { … }
   ```

   ```ts
   // AFTER: one page, mode-driven window
   interface JournalListPageProps {
     onSelect: (item: WorkoutItem) => void
     onCreateEntry?: (date: Date) => void
     workoutItems?: WorkoutItem[]
   }

   export function JournalListPage({ onSelect, onCreateEntry, workoutItems }: JournalListPageProps) {
     const { dateParam, mode: modeParam, setMode, /* … */ } = useJournalQueryState()
     // …

     const dateKeys = useMemo(() => computeDateKeys(modeParam, focusedDate, multiSelected, journalEntries, todayKey), [
       modeParam, focusedDate, multiSelected.size, journalEntries, todayKey,
     ])

     const showEmptyDates = useMemo(() => {
       if (modeParam === 'plan' || modeParam === 'all') return true
       return Boolean(focusedDate) && multiSelected.size === 0
     }, [modeParam, focusedDate, multiSelected.size])

     const items = modeParam === 'plan' ? [] : listItems   // history + today show results; plan doesn't

     return (
       <JournalFeed
         dateKeys={dateKeys}
         items={items}
         journalEntries={journalEntries}
         onSelect={handleSelect}
         onOpenEntry={handleOpenEntry}
         onCreateNote={handleCreateNote}
         createNoteDates={createNoteDates}
         selectedDateKeys={selectedDateKeys}
         onDateHeaderClick={handleDateHeaderClick}
         showEmptyDates={showEmptyDates}
       />
     )
   }

   function computeDateKeys(
     mode: JournalViewMode,
     focusedDate: string | null,
     _multi: number,
     journalEntries: Map<string, JournalEntrySummary>,
     todayKey: string,
   ): string[] {
     if (focusedDate) return [focusedDate]
     if (mode === 'today') return [todayKey]
     if (mode === 'plan')  return planningWindow(todayKey)            // moves from PlanPage verbatim
     /* history | all */    return historyWindow(todayKey, journalEntries) // moves from JournalWeeklyPage, plus future tail in 'all'
   }
   ```

   - Pull `addDays` and the planning-window logic **verbatim** from `PlanPage.tsx` `:18-22`,
     `:88-114`; pull the history-window logic verbatim from `ListViews.tsx` `:138-159`.
   - The `items` array is computed once in `JournalWeeklyPage`; for `mode=plan` we just feed
     an empty list, matching today's `PlanPage` (`:173`).

3. **Mode toggle in `JournalNavPanel`** — add a button group right above the calendar:

   ```tsx
   // playground/src/nav/panels/JournalNavPanel.tsx — BEFORE
   <div className="flex flex-col gap-3 px-1 py-2">
     {dateParam && (
       <div className="flex items-center gap-2 px-2">…filter badge…</div>
     )}
     <CalendarCard … />
     {!isEntryPage && PLACEHOLDER_TAGS.length > 0 && <TagChips … />}
   </div>
   ```

   ```tsx
   // AFTER — toggle sits between the badge and the calendar
   <div className="flex flex-col gap-3 px-1 py-2">
     {dateParam && <FilterBadge date={dateParam} onClear={() => setSelectedDate(null)} />}

     {!isEntryPage && (
       <ModeToggle
         value={mode}
         onChange={setMode}
         ariaLabel="Journal view mode"
         className="mx-2"
       />
     )}

     <CalendarCard selectedDate={selectedDateObj} onDateSelect={handleDateSelect} />
     {!isEntryPage && PLACEHOLDER_TAGS.length > 0 && <TagChips tags={…} />}
   </div>
   ```

   - New atom: `playground/src/components/atoms/ModeToggle.tsx` — minimal segmented-control;
     icons pulled from `@heroicons/react/20/solid` (`CalendarDaysIcon` / `CalendarIcon` /
     `ClockIcon`). Cycle button: `History | Today | Plan | All`.
   - Each value of `mode` writes `?mode=<value>` via `setMode`.

4. **Wire `JournalListPage` into `App.tsx`** — note this is a *new* addition alongside the
   existing `journal` and `plan` rendering, not a replacement yet (that's Phase 2):

   ```tsx
   // playground/src/App.tsx renderInner — Phase 1 (additive only)
   const renderInner: Record<PageKind, () => ReactNode> = {
     journal: () => (
       <JournalListPage onSelect={handleSelectWorkout} onCreateEntry={handleCreateJournalEntry} workoutItems={workoutItems} />,
     ),
     plan: () => <PlanPage workoutItems={workoutItems} />,                 // unchanged
     // …
   }
   ```

   - `journal: PageKind` now points at the unified page (the existing route's render is
     overwritten by the new component, but `mode=history` defaults to a window equivalent to
     today's `JournalWeeklyPage`).
   - `plan: PageKind` keeps rendering the old `PlanPage` for now. The new page only renders
     when `?mode` is set explicitly OR when `location.pathname === '/journal'`.

**Verification:** `bun run test` + browse to `/journal` (now history-mode by default when no
`?mode=` is set, equivalent to today), `/journal?mode=plan` (forward window), `/journal?mode=all`
(history + future), `/journal?mode=today` (today only). All four should render; the calendar
toggle should update `?mode=` URL state.

### Phase 2 — Collapse to one render branch + redirect `/plan` (structural)

Goal: the duplicate page files are deleted, `PageKind: 'plan'` is removed, and external
links to `/plan` still work via a redirect.

1. **Add `/plan` redirect** in `playground/src/lib/routes.tsx`:

   ```ts
   // BEFORE
   <Route path={ROUTE_PATTERNS.plan} element={<AppContent … />} />
   ```

   ```ts
   // AFTER
   export function PlanRedirect(): ReactNode {
     const search = useLocation().search ?? ''
     return <Navigate to={`/journal${search ? `?mode=plan${search.replace(/^\?/, '&')}` : '?mode=plan'}`} replace />
   }

   <Route path={ROUTE_PATTERNS.plan} element={<PlanRedirect />} />
   ```

   Preserve any existing query string (`?zip=…` for the journal zip-load workflow, for example)
   so redirects don't strip caller intent.

2. **Remove `PageKind: 'plan'`** from `playground/src/lib/routeView.ts`:

   ```ts
   // BEFORE
   export type PageKind = | 'journal' | 'plan' | 'feeds' | …
   function derivePage(flags, pathname, canvasPage): PageKind {
     if (pathname === '/journal') return 'journal'
     if (pathname === '/plan')    return 'plan'           // <— remove branch
     …
   }
   function deriveShell(page, pathname, workout): ShellConfig {
     switch (page) {
       case 'journal': return { wrap: 'canvas', title: 'Journal', … }
       case 'plan':    return { wrap: 'canvas', title: 'Plan', … }    // <— remove case
     }
   }
   ```

3. **Delete `playground/src/views/PlanPage.tsx`** — the logic already lives inside
   `JournalListPage` (`mode=plan` branch).

4. **Update `App.tsx`** to drop the `plan` render-arm:

   ```tsx
   // renderInner for 'journal' is now the only arm covering unified pages
   journal: () => (
     <JournalListPage onSelect={handleSelectWorkout} onCreateEntry={handleCreateJournalEntry} workoutItems={workoutItems} />,
   ),
   ```

5. **Update `nav/appNavTree.ts`** to drop the `Plan` L1 item:

   ```ts
   // BEFORE
   { id: 'plan', label: 'Plan', level: 1, icon: CalendarDaysIcon, action: { type: 'route', to: ROUTE_PATTERNS.plan }, … },
   // AFTER — item removed; CalendarDaysIcon can be reused inside ModeToggle if desired
   ```

   The L1 sidebar now has 5 items: Home, Journal, Feeds, Collections, Efforts. The mode toggle
   inside `JournalNavPanel` covers the same surface with the calendar context.

6. **Update `useRecentResults` and dependent hooks** — if any logic was relying on the
   `pathname === '/plan'` early-return (nothing in current code does, but verify), retarget to
   `mode === 'plan'`.

**Verification:**

- `bun run test` (unit) — `routeView.test.ts` cases for `/plan` are repurposed to
  `/journal?mode=plan`; `ListViews.test.tsx` becomes `JournalListPage.test.tsx`.
- `bun run test:e2e` (Playwright) — mobile + desktop: hit `/plan` (expect redirect to
  `/journal?mode=plan`), hit `/journal` with the toggle, click a future date, confirm
  create-note card appears.
- `bun run docs:check` — make sure the ADR link refs resolve.

### Phase 3 — Optional cleanups (deferred unless flagged)

- Move the date-window computation (`planningWindow`, `historyWindow`) into a pure
  `playground/src/lib/journalWindow.ts` module + unit tests; today they live inside a component
  `useMemo`.
- Add a UI affordance on the edit page (`JournalPage`) that surfaces the mode
  (`journal-active | journal-plan | journal-history`) as a small chip in the corner; today users
  discover the lack of "Run" button on a future date as absence rather than state.
- Consider promoting `Plan` to an L2 inside the L1 Journal sidebar item (collapsed by default,
  `> Plan` reveals today's planning range) — the inverse of the L1-item approach. Punt unless
  usage data shows users want a one-click plan landing.

## Code shape — callout for the edit page (NOT changing)

```ts
// playground/src/pages/JournalPage.tsx — kept verbatim; already correct per ADR scope
const mode = derivePageMode('journal', noteId)
//   past    → 'journal-history'   (share + schedule only)
//   today   → 'journal-active'    (play + share + schedule)
//   future  → 'journal-plan'      (open-in-playground + share + schedule)

const commands = useScriptBlockCommands(mode, {
  onPlay:            mode === 'journal-active' ? handleStartWorkout : undefined,
  onShare:           shareBlock,
  onOpenInPlayground: mode === 'journal-plan' ? (b) => openBlockInPlayground(b, navigate) : undefined,
  onSchedule:        setPendingScheduleBlock,
})
```

The block-command hook (`src/.../useScriptBlockCommands.tsx`) already dispatches on these three
modes — the *edit* page is already unified. Only the *list* page is forked; Phase 1+2 close that
gap.

## File inventory

| Area | Files | Phase |
|------|-------|-------|
| New page | `playground/src/views/JournalListPage.tsx` (new) | 1 |
| New atom | `playground/src/components/atoms/ModeToggle.tsx` (new) | 1 |
| New tests | `playground/src/views/JournalListPage.test.tsx` (new) | 1 |
| Hook extend | `playground/src/hooks/useJournalQueryState.ts` (+`mode`) | 1 |
| Nav panel edit | `playground/src/nav/panels/JournalNavPanel.tsx` (+toggle) | 1 |
| App.tsx wiring | `playground/src/App.tsx` (additive route arm) | 1 |
| Routes redirect | `playground/src/lib/routes.tsx` (`PlanRedirect`) | 2 |
| Route view | `playground/src/lib/routeView.ts` (drop `'plan'` arm) | 2 |
| Nav tree | `playground/src/nav/appNavTree.ts` (drop Plan L1) | 2 |
| Delete | `playground/src/views/PlanPage.tsx` | 2 |
| Untouched | `playground/src/pages/JournalPage.tsx`, `useScriptBlockCommands`, `derivePageMode`, `JournalNavPanel` calendar logic | — |

## Test strategy — replace, don't layer

- **New:** `JournalListPage.test.tsx` covers all four `mode` values against a fixture of mixed
  past / today / future entries. Replaces `ListViews.test.tsx` and `PlanPage` snapshot tests.
- **Update:** `playground/src/lib/routeView.test.ts` — the `classifies /plan → …` case becomes
  `redirects /plan` (via integration with the new `PlanRedirect`); the `PageKind: 'plan'` union
  member test is removed. The `classifies /journal → canvas shell with journal actions` case
  keeps working.
- **Update:** `useJournalQueryState.test.ts` — add cases for `?mode=` round-trip and invalid
  values falling back to `'all'`.
- **New:** `PlaygroundRedirect/PlanRedirect` e2e — visit `/plan`, expect `/journal?mode=plan` in
  the address bar without a back-button bounce.

## Risks & non-goals

- **Risk:** the L2 panel re-renders unnecessarily when `mode` toggles, losing the focused-date
  highlight. Mitigation: `setMode` only writes the URL; the selected-date highlight derives
  from `dateParam` and `selectedDateObj` regardless of mode. Verify in `JournalListPage`
  visual snapshots.
- **Risk:** `useRecentResults` (or any IndexedDB-backed hook) re-fetches when `mode` flips.
  Mitigation: dependency lists for those effects explicitly exclude `mode`; only the
  `dateKeys` memo inside `JournalListPage` reads `mode`.
- **Risk:** removing `PageKind: 'plan'` breaks downstream `switch(page)` statements. Mitigation:
  TypeScript will surface every reference; the only one in tree is `renderInner` in `App.tsx`
  (4 lines removed) and `derivePage`/`deriveShell` in `routeView.ts` (1 branch + 1 case).
- **Watch-item:** the `useJournalQueryState` `nuqs` schema is shared with other consumers
  (`useSelectWorkout`, `useCreateJournalEntry`, `useShowPlaygrounds`). Extend the schema in a
  single migration; verify by grepping for `useQueryState` callers.
- **Non-goal:** changing `derivePageMode` or the `PageMode` union — those are content-type
  discriminants that downstream code reads; refactoring them is out of scope.
- **Non-goal:** the edit page UI itself — it's already mode-aware.

## Suggested first PR

**Phase 1 only** — new `JournalListPage` + `useJournalQueryState` `mode` param + `ModeToggle`
atom + nav-panel placement; `App.tsx` adds a render arm in parallel to the existing two. The
old `JournalWeeklyPage` and `PlanPage` still render for their existing URLs. Behaviour for
`/journal?mode=…` is exposed but the user can opt in via URL editing. Independently
shippable; the structural cleanup (Phase 2) is a separate, later PR.
