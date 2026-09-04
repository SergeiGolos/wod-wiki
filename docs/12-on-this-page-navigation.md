# On This Page (L3) Navigation — Inventory & Design

Working document for the L3 / "On this page" channel: what feeds it per view
today, and how we want it to behave. **Sections marked ✏️ are the design
space — edit freely.** The inventory tables describe current code; update them
when behavior changes.

---

## 1. How the channel works

Single shared state: `NavContext.l3Items: NavItemL3[]`
(`app/nav/NavContext.tsx`). Writers publish per page; consumers render.

```
PageNavLink[]  ──mapIndexToL3──▶  NavItemL3[]  ──setL3Items──▶  NavContext
(pageUtils.ts)                   (id, label, action,            l3Items
                                  secondaryAction)
```

**Click dispatch:** item `action` is `{ type: 'scroll', sectionId }` (default)
or `{ type: 'call', handler }`. Scrolls go through
`NavContext.scrollToSection` → registered scroll fn (editor-aware fallback via
`usePageScrollSync.registerScrollFn`) → DOM `getElementById` fallback. A
`secondaryAction` renders a small icon button (e.g. Run) beside the label.

**Active-section tracking** (two parallel mechanisms):
- `usePageScrollSync` IntersectionObserver → `SET_ACTIVE_L3` dispatch →
  `navState.activeL3Id`.
- `CanvasPage` `useActiveScrollSection` → `?s=` query param (shallow, replace
  on scroll / push on explicit TOC click).
- Consumers read via `useActiveSectionId()` (`?s=` wins over `activeL3Id`).

**Consumers:**
| Surface | Breakpoint | Shows |
|---|---|---|
| `SecondaryNav` right rail | xl+ | route secondary spec + "On this page" |
| `ActionsMenu` (`⋯` header) | below xl | same sections collapsed into dropdown |
| `NavSidebar` L2 panel | all | active-state highlighting of scroll items |

**Invariants (as implemented):**
- Exactly one writer owns `l3Items` per page kind. Writers clear on unmount
  (`setL3Items([])`).
- Writers with an empty index **skip publishing** — they must not clobber a
  page-generated index (`usePageScrollSync` gate, 2026-09).
- Items passed via `ActionsMenu`/`PageActions` props override context only
  when non-empty.

---

## 2. Writer inventory

| Writer | File | Page kinds | Content |
|---|---|---|---|
| `useNotePageNav` | `app/pages/shared/useNotePageNav.ts` | note pages | Document headings + ```` ```time ```` blocks (Run affordance) + ```` ```log ```` blocks (display-only, result badges) extracted from the editor document |
| `deriveNav` + `usePageScrollSync`/`AppContent` | `app/lib/routeView.ts`, `app/hooks/usePageScrollSync.ts`, `app/App.tsx` | canvas pages | Sections (level > 1) + `Workout N` entries per ```` ```time/```log ```` fence (skipped on `/guide/*`) + collection workout links |
| `QueriableStreamView` | `app/views/stream/QueriableStreamView.tsx` | stream pages | Dynamic group headers from `groupEntriesByDimension` — dim = WQL `by {…}` → view-setting `groupBy` → page default |
| `deriveNav('/journal')` | `app/lib/routeView.ts` | `/journal` only | Top-10 distinct session dates (pre-load placeholder; superseded by stream groups once entries resolve) |

---

## 3. Per-view inventory (current behavior)

### Stream pages — `QueriableStreamView` dynamic groups

| Route | Default group dim | DOM id shape | Notes |
|---|---|---|---|
| `/library` | date | `date-group-YYYY-MM-DD` | |
| `/journal` | date | `date-group-YYYY-MM-DD` | overlaps with deriveNav top-10 dates until entries load |
| `/collections` | date | `date-group-*` | |
| `/feeds`, `/feed` | date | `date-group-*` | |
| `/efforts` | discipline | `group-discipline-<slug>` | undated entries → `Undated` bucket under date dims |
| `/results`, `/results/*` | date | `date-group-*` | |

Overrides: WQL `by {discipline|origin|kind|tag|day|week|month|year}` in the
composer wins; otherwise per-route View Settings **Group By**
(`wodwiki:view-settings:<route>`).

### Canvas pages — `deriveNav` static index (`withIndex: true`)

| Route | Content |
|---|---|
| `/` (Home) | markdown sections (level > 1) + `Workout N` per time/log fence |
| `/guide/getting-started` | sections only (workout fences skipped on guide pages) |
| `/guide/syntax` | fixed `SYNTAX_LINKS` (8 static entries: Introduction → Document) |
| `/collections/:slug` | sections + `Explore` + one link per collection workout (`onRun` → open editor) |

### Note pages — `useNotePageNav` document index

| Route | Component | Content |
|---|---|---|
| `/playground/:id` | `PlaygroundNotePage` | headings + time blocks (Run) + log blocks |
| `/workout/:id` | `WorkoutEditorPage` | same |
| `/effort/:id` | `EffortDetailPage` | same + results-by-version badges |
| `/feeds/:slug/:date/:item` | `FeedItemPage` | same |

### No L3 today (empty section)

| Route | PageKind | Gap? |
|---|---|---|
| `/journal/:identity` | `journalEntry` (`JournalDatePage`) | ✏️ date page shows multiple notes; no per-note index |
| `/feeds/:feedSlug` | `feedDetail` | ✏️ date-keyed content, no index |
| `/dashboard`, `/dashboard/:id` | dashboard pages | ✏️ |
| `/analytics/explorer` | analyticsExplorer | ✏️ |
| `/settings/*` | settings | intentionally none |

---

## 4. Desired behavior ✏️

Design space for how the section *should* work. Current rule: "On this page"
mirrors the structural anchors of whatever is rendered.

### 4.1 Section identity

- What belongs under "On this page" vs the route secondary menu (e.g.
  RECENT ENTRIES)?
  - Today: secondary = cross-page shortcuts; L3 = in-page scroll anchors only.
  - Desired: ✏️
- Should L3 links ever navigate (change route/query) instead of scroll?
  - Today: scroll-only, except `call` actions (Run) as secondaryAction.
  - Desired: ✏️

### 4.2 Stream pages

- Default grouping per route (today: efforts→discipline, others→date). ✏️
- Should the active group header be highlighted on scroll? (Today: no
  IntersectionObserver on stream groups — active tracking only covers
  canvas/note pages.) ✏️
- Cap on links shown (long date lists)? Collapse by month/year? ✏️
- Should clicking a date group deep-link (`?s=` / hash) for shareability? ✏️

### 4.3 Journal date page (`/journal/:identity`)

- Currently no L3. Candidates: per-note anchors (time of day / note title),
  per-workout-block entries with Run, or nothing (page is one editor doc). ✏️

### 4.4 Feed detail / dashboards / analytics

- Candidates: date keys for feeds; widget/chart section anchors for
  dashboards. Or keep intentionally empty. ✏️

### 4.5 Ownership & precedence

- Today: one writer per page kind; empty writers skip; prop > context.
- Open: should a page be able to *append* to a route-declared base index
  instead of replacing it? ✏️
- On `/journal` the stream's date groups and deriveNav's top-10 dates both
  exist pre/post load — keep last-writer-wins, or remove the deriveNav
  journal branch? ✏️

---

## 5. When changing this, touch

- `app/nav/NavContext.tsx` — channel state, `setL3Items` dedupe, scrollToSection
- `app/pages/shared/pageUtils.ts` — `mapIndexToL3` mapping shape
- `app/pages/shared/useNotePageNav.ts` — note-page document index
- `app/lib/routeView.ts` — `deriveNav` static indexes per route
- `app/views/stream/QueriableStreamView.tsx` + `app/lib/entryGrouping.ts` — stream groups
- `app/nav/SecondaryNav.tsx`, `app/pages/shared/PageToolbar.tsx` — consumers (rail / ⋯ menu)
- `app/hooks/usePageScrollSync.ts` — scroll tracking + the empty-index gate
- Tests: `PageToolbar.test.tsx`, `useNotePageNav.test.tsx`,
  `QueriableStreamView.test.tsx`, `pageUtils.test.ts`
