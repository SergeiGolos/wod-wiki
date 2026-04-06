`# Navigation Link Inventory

**Goal**: Full crosswalk of every link and action in the navigation system across the three screen-width tiers, to support a coherent redesign of where things belong and how they should function.

---

## Screen Width Tiers

| Tier           | Tailwind prefix | Min-width | Layout description                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | --------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mobile**     | *(default)*     |      0 px | Single column<br>- To contain the hamburger menu on the left and core short cuts buttons and the ... for the index slide out drawer.<br>- left sidebar becomes a slide-over drawer on th left triggered by hamburger in mobile navbar (level 1 + level 2 for selected level 1)<br>- index sidebar becomes a slide out drawer on right when clicking ... button (level )                                                                    |
| **Desktop**    | `lg:`           |  1 024 px | Two-column; permanent 256 px left sidebar; mobile navbar hidden; page shell sticky header visible contains the shortucts in the nav bar (level 1 links)<br>- To container the top level menu next to the logo, and  short cuts buttons and the ... for the index slide out drawer on the right side. (level 2 links)<br>- index sidebar becomes a slide out drawer on right when clicking on the ... button in the shortuct. level 3 links |
| **Ultra-wide** | `3xl:`          |  1 800 px | Same as Desktop + right-side index panel visible; ... goes away. "On this page" sidebar accordion hidden                                                                                                                                                                                                                                                                                                                                   |

> NOTE:
> the menu really needs to be 3 level, the first two  levels are describe bellow the 3rd level index the index and are links to scroll location on the current page, in the case of notes it should update as sections are added and removed for the note.
>
>

> 	- Home 
> 		- Docs/** -- the different document pages and other section 
> 	- Journal
> 		- Special panel used to help look though the journal
> 		- a min calendar selection
> 		- tags filter
> 	- Collections
> 		- sub filters (kettelbell swiming other)
> 	- Search
> 		- special sub, filters (collection | notes | results ) 


Custom `3xl` breakpoint is defined in [tailwind.config.cjs](../tailwind.config.cjs).

---

## Navigation Zones

The app has four distinct navigation zones. Each zone is conditionally rendered at different screen widths.

| Zone                       | Component source                       |    Mobile (< lg)     |   Desktop (lg–3xl)   | Ultra-wide (3xl+) |
| -------------------------- | -------------------------------------- | :------------------: | :------------------: | :---------------: |
| **A — Mobile Top Navbar**  | `SidebarLayout` → `navbar` slot        |      ✅ Visible       |      ✅ Visible       |   ❌ `lg:hidden`   |
| **B — Left Sidebar**       | `SidebarLayout` → `sidebar` slot       |   Drawer (overlay)   |     ✅ Permanent      |    ✅ Permanent    |
| **C — Page Sticky Header** | `SimplePageShell` / `JournalPageShell` | ❌ `hidden lg:block`  |      ✅ Visible       |     ✅ Visible     |
| **D — Right Side Index**   | `SimplePageShell` / `JournalPageShell` | ❌ `hidden 3xl:block` | ❌ `hidden 3xl:block` |     ✅ Visible     |

---

## Zone A — Mobile Top Navbar

**Source**: `playground/src/App.tsx` → `<SidebarLayout navbar={…}>`, rendered by `src/components/playground/sidebar-layout.tsx` as a sticky `<header>` only visible `< lg`.

| #   | Label / Control     | Type         | Destination / Action                          |    Mobile (< lg)    | Desktop (lg+)  | Notes                                                                            |
| --- | ------------------- | ------------ | --------------------------------------------- | :-----------------: | :------------: | -------------------------------------------------------------------------------- |
| A1  | Hamburger `☰`       | Button       | Opens sidebar drawer (`setShowSidebar(true)`) |          ✅          |       ❌        | Auto-closes on route change                                                      |
| A2  | Page title          | Text         | None (display only)                           |          ✅          |       ❌        | Shows `currentWorkout.name` truncated                                            |
| A3  | Page ToC (dropdown) | Dropdown     | `scrollToSection(id)`                         | ~~✅~~ **Invisible** |       ❌        | Wrapped in `className="hidden"` — rendered but never visible anywhere; dead code |
| A4  | New Entry button    | Split button | `navigate('/journal/:iso')`                   |          ✅          | ❌ (moves to C) | Dropdown includes "Calendar…" item → `navigate('/calendar')`                     |
| A5  | Search icon         | Icon link    | `href="/search"`                              |          ✅          | ❌ (moves to C) | `MagnifyingGlassIcon`                                                            |
| A6  | Cast button         | Icon button  | Non-routing (Chromecast RPC)                  |          ✅          | ❌ (moves to C) | `CastButtonRpc`                                                                  |
| A7  | Audio toggle        | Icon button  | Non-routing (audio on/off)                    |          ✅          | ❌ (moves to C) | `AudioToggle`                                                                    |
| A8  | Actions menu `⋮`    | Dropdown     | See sub-items below                           |          ✅          | ❌ (moves to C) | `ActionsMenu`                                                                    |

### A8 — Actions Menu items

| Label | Action | Notes |
|-------|--------|-------|
| Download Markdown | Creates blob download of current note content | File system action |
| Toggle Debug Mode | `href="#/debug"` (hash navigation) | Hash link, not a route |
| Light / Dark / System | `setTheme(…)` | Theme toggle, non-routing |
| Reset & Clear Cache | `localStorage.clear()` + `playgroundDB.clearAll()` + reload | Destructive action |

---

## Zone B — Left Sidebar

**Source**: `playground/src/App.tsx` → `<SidebarLayout sidebar={…}>`.  
Rendered by `src/components/playground/sidebar-layout.tsx` as a permanent `lg:flex` column on desktop and as a `Headless.Dialog` drawer overlay on mobile.

### B1 — Sidebar Header (always visible)

| # | Label | Type | Destination / Action | Active Condition | Mobile drawer | Desktop sidebar | Ultra-wide |
|---|-------|------|----------------------|-----------------|:---:|:---:|:---:|
| B1a | WOD WIKI logo | Brand / non-link | None | — | ✅ | ✅ | ✅ |
| B1b | Home | SidebarItem | `navigate('/')` | `pathname === '/'` | ✅ | ✅ | ✅ |
| B1c | Journal | SidebarItem | `href="/journal"` | `pathname === '/journal'` | ✅ | ✅ | ✅ |
| B1d | Collections | SidebarItem | `navigate('/collections')` | `pathname.startsWith('/collections')` | ✅ | ✅ | ✅ |
| B1e | Search | SidebarItem | `href="/search"` | `pathname === '/search'` | ✅ | ✅ | ✅ |

### B2 — Sidebar Body: "On this page" Accordion

Dynamic section — only rendered when `currentNavLinks.length > 0`.

| # | Label | Type | Destination / Action | Mobile drawer | Desktop (lg–3xl) | Ultra-wide (3xl+) |
|---|-------|------|----------------------|:---:|:---:|:---:|
| B2 | "On this page" accordion | `SidebarAccordion` | — | ✅ | ✅ | ❌ `3xl:hidden` |
| B2.* | Per-section heading | SidebarItem | `scrollToSection(id)` — same as Right index | ✅ | ✅ | ❌ |

**What populates B2?** Depends on the current route:

| Route | Source of links |
|-------|----------------|
| `/` (Home) | `HOME_LINKS` constant (static: Live Demo, Features, Library, Getting Started) |
| `/getting-started` | `ZERO_TO_HERO_LINKS` constant (static: Introduction, First Statement, Timers…) |
| `/syntax` | `SYNTAX_LINKS` constant (static: Anatomy, Timers & Direction…) |
| `/calendar`, `/journal`, `/search` | Dynamic: last 10 dates from `recentResults` |
| Canvas/Collection pages | Canvas page sections from `canvasRoutes` |
| Playground/Journal notes | Headings + `wod` code blocks extracted from note content via `extractPageIndex()` |

### B3 — Sidebar Body: Docs Section

| # | Label | Type | Destination / Action | Active Condition | Mobile drawer | Desktop | Ultra-wide |
|---|-------|------|----------------------|-----------------|:---:|:---:|:---:|
| B3a | Zero to Hero | SidebarItem | `navigate('/getting-started')` | `pathname === '/getting-started'` | ✅ | ✅ | ✅ |

### B4 — Sidebar Body: Syntax Accordion

Dynamic: populated from `syntaxPages` (`canvasRoutes` from `markdown/canvas/**/*.md`).

| # | Label | Type | Destination / Action | Mobile drawer | Desktop | Ultra-wide |
|---|-------|------|----------------------|:---:|:---:|:---:|
| B4 | Syntax (accordion) | `SidebarAccordion` | — | ✅ | ✅ | ✅ |
| B4.* | Per-canvas page | SidebarItem | `navigate(page.route)` | ✅ | ✅ | ✅ |

---

## Zone C — Page Sticky Header (Desktop)

**Source**: `src/panels/page-shells/SimplePageShell.tsx` and `src/panels/page-shells/JournalPageShell.tsx`.  
Rendered as `hidden lg:block lg:sticky lg:top-0 lg:z-30` — only visible `≥ lg`.

Every page in the app uses either `SimplePageShell` or `JournalPageShell`, so this header appears on all pages for Desktop and Ultra-wide.

| # | Label / Control | Type | Destination / Action | Desktop (lg–3xl) | Ultra-wide (3xl+) | Notes |
|---|----------------|------|----------------------|:---:|:---:|-------|
| C1 | Page title | Text | None (display only) | ✅ | ✅ | Passed as `title` prop |
| C2 | "On this page" index | Dropdown / pill-nav | `scrollToSection(id)` | ✅ (when links exist) | ✅ | Mirrors B2 content; visible in header via `StickyNavPanel` or inline index |
| C3 | New Entry button | Split button | `navigate('/journal/:iso')` | ✅ | ✅ | Same as A4; appears in `actions` prop |
| C4 | Cast button | Icon button | Non-routing (Chromecast) | ✅ | ✅ | `CastButtonRpc` |
| C5 | Audio toggle | Icon button | Non-routing | ✅ | ✅ | `AudioToggle` |
| C6 | Actions menu `⋮` | Dropdown | Same items as A8 | ✅ | ✅ | `ActionsMenu` — same component |

**Note**: On `SimplePageShell` pages, there is also an `onScrollToSection` prop passed from `AppContent` that wires up the index dropdown.

---

## Zone D — Right Side Index Panel (Ultra-wide)

**Source**: `src/panels/page-shells/SimplePageShell.tsx` and `src/panels/page-shells/JournalPageShell.tsx`.  
Rendered as `hidden 3xl:block w-80 sticky top-0` — only visible `≥ 3xl (1800px)`.

| # | Label / Control | Type | Destination / Action | Desktop (lg–3xl) | Ultra-wide (3xl+) | Notes |
|---|----------------|------|----------------------|:---:|:---:|-------|
| D1 | Section index items | `<button>` | `scrollToSection(id)` | ❌ | ✅ | Same content as B2 (sidebar accordion) |

When D1 is visible (ultra-wide), B2 ("On this page" accordion in sidebar) is hidden via `3xl:hidden` on the `SidebarAccordion`.

---

## Full Link Crosswalk Table

Every distinct link in the system and where it appears:

| Link / Control | Route / Action | Zone A (Mobile Navbar) | Zone B (Left Sidebar) | Zone C (Page Header) | Zone D (Right Index) |
|---------------|----------------|:---:|:---:|:---:|:---:|
| **Home** | `navigate('/')` | ❌ | ✅ B1b | ❌ | ❌ |
| **Journal** (weekly list) | `href="/journal"` | ❌ | ✅ B1c | ❌ | ❌ |
| **Collections** | `navigate('/collections')` | ❌ | ✅ B1d | ❌ | ❌ |
| **Search** | `href="/search"` | ✅ A5 (icon) | ✅ B1e (labeled) | ❌ | ❌ |
| **Zero to Hero** | `navigate('/getting-started')` | ❌ | ✅ B3a | ❌ | ❌ |
| **Syntax pages** (per-page) | `navigate(page.route)` | ❌ | ✅ B4.* | ❌ | ❌ |
| **On-page section links** | `scrollToSection(id)` | ❌ (A3 dead) | ✅ B2.* (≤3xl) | ✅ C2 | ✅ D1 (3xl+) |
| **New Entry button** | `navigate('/journal/:iso')` | ✅ A4 | ❌ | ✅ C3 | ❌ |
| **Calendar** (from New Entry dropdown) | `navigate('/calendar')` | ✅ A4 dropdown | ❌ | ✅ C3 dropdown | ❌ |
| **Cast button** | Chromecast RPC | ✅ A6 | ❌ | ✅ C4 | ❌ |
| **Audio toggle** | Non-routing | ✅ A7 | ❌ | ✅ C5 | ❌ |
| **Actions menu `⋮`** | Dropdown | ✅ A8 | ❌ | ✅ C6 | ❌ |
| → Download Markdown | Blob download | ✅ | ❌ | ✅ | ❌ |
| → Toggle Debug Mode | `href="#/debug"` | ✅ | ❌ | ✅ | ❌ |
| → Light / Dark / System theme | `setTheme(…)` | ✅ | ❌ | ✅ | ❌ |
| → Reset & Clear Cache | Destructive wipe | ✅ | ❌ | ✅ | ❌ |
| **Page title** | Display only | ✅ A2 | ❌ | ✅ C1 | ❌ |
| **WOD WIKI logo** | Display only | ❌ | ✅ B1a | ❌ | ❌ |
| **Hamburger `☰`** | Open sidebar drawer | ✅ A1 | ❌ | ❌ | ❌ |

---

## Route Table

All routes registered in `App.tsx`:

| Route pattern | Page component | Page shell used |
|---------------|---------------|----------------|
| `/` | `HomeView` | `SimplePageShell` |
| `/getting-started` | Static doc page | `SimplePageShell` |
| `/syntax` | Static doc page | `SimplePageShell` |
| `/calendar` | `CalendarPage` | `SimplePageShell` |
| `/journal` | `JournalWeeklyPage` | `SimplePageShell` |
| `/search` | `SearchPage` | `SimplePageShell` |
| `/collections` | `CollectionsPage` | `SimplePageShell` |
| `/collections/:slug` | Collection detail | `SimplePageShell` |
| `/workout/:category/:name` | `WorkoutEditorPage` | `JournalPageShell` |
| `/note/:category/:name` | `WorkoutEditorPage` | `JournalPageShell` |
| `/playground` | `PlaygroundRedirect` → `/playground/:id` | — |
| `/playground/:id` | `PlaygroundNotePage` | `JournalPageShell` |
| `/journal/:id` | `JournalPage` | `JournalPageShell` |
| `/load` | `LoadZipPage` | None (full-screen) |
| `/tracker/:runtimeId` | `TrackerPage` → `FullscreenTimer` | None (full-screen) |
| `/review/:runtimeId` | `ReviewPage` → `FullscreenReview` | None (full-screen) |
| `*` (fallback) | `AppContent` | (matches current route subtree) |
| Dynamic canvas routes | `CanvasPage` | `SimplePageShell` |

---

## Issues and Observations

| # | Observation | Severity |
|---|------------|----------|
| I1 | **Dead UI (A3)**: `PageNavDropdown` in mobile navbar is wrapped in `className="hidden"` — it is rendered but never visible. Wasted render cost. | Low |
| I2 | **Duplicate controls (A↔C)**: New Entry, Cast, Audio, Actions menu each appear in both mobile navbar AND page shell header. No code sharing — two separate placements. | Medium |
| I3 | **Search is both labeled and icon-only**: In sidebar it is a full labeled `SidebarItem`; in mobile navbar it is just a `MagnifyingGlassIcon` with no label. It does not appear in the desktop page header. | Medium |
| I4 | **Calendar has no dedicated sidebar link**: Only reachable via the "Calendar…" dropdown inside the `NewEntryButton` split button. The sidebar has Home, Journal, Collections, Search — but no Calendar. | Medium |
| I5 | **"On this page" is triplicated**: Same section links appear in B2, C2, and D1. They all call `scrollToSection()` which is correct, but the logic for computing `currentNavLinks` is a single central source — good. | Low (by design) |
| I6 | **Sidebar "On this page" and right index not coordinated**: At `3xl+` the right index appears and B2 hides — this is intentional but only works if `SimplePageShell`/`JournalPageShell` is used. `WorkoutEditorPage`/`JournalPage` may not expose D1. | Medium |
| I7 | **`href` vs `navigate()` inconsistency**: Journal uses `href="/journal"` but Collections uses `navigate('/collections')`. Both work but are inconsistent. | Low |
| I8 | **Debug mode is a hash link**: `href="#/debug"` inside `ActionsMenu` — conflicts with the router's browser history pushState model and may break navigation state. | Medium |
| I9 | **Fullscreen pages (Tracker, Review) have no navigation**: `/tracker/:runtimeId` and `/review/:runtimeId` render full-screen overlays with no nav surface — only a close button leading back. | By design (note for redesign) |

---

## Component Source Map

| Component | File |
|-----------|------|
| `SidebarLayout` | [src/components/playground/sidebar-layout.tsx](../src/components/playground/sidebar-layout.tsx) |
| `Sidebar`, `SidebarItem`, `SidebarHeader`, … | [src/components/playground/sidebar.tsx](../src/components/playground/sidebar.tsx) |
| `SidebarAccordion` | [src/components/playground/SidebarAccordion.tsx](../src/components/playground/SidebarAccordion.tsx) |
| `Navbar`, `NavbarItem`, … | [src/components/playground/navbar.tsx](../src/components/playground/navbar.tsx) |
| `PageNavDropdown` | [src/components/playground/PageNavDropdown.tsx](../src/components/playground/PageNavDropdown.tsx) |
| `SimplePageShell` | [src/panels/page-shells/SimplePageShell.tsx](../src/panels/page-shells/SimplePageShell.tsx) |
| `JournalPageShell` | [src/panels/page-shells/JournalPageShell.tsx](../src/panels/page-shells/JournalPageShell.tsx) |
| `StickyNavPanel` | [src/panels/page-shells/StickyNavPanel.tsx](../src/panels/page-shells/StickyNavPanel.tsx) |
| `AppContent` (all nav wiring) | [playground/src/App.tsx](../playground/src/App.tsx) |


---

## Design Proposal: Common Navigation State Model

### Guiding Principles

1. **One tree, three levels** — every navigable destination lives in a single configuration tree with depth 1 (top-nav), 2 (context panel), or 3 (page index).
2. **One state object** — all zones (mobile bar, sidebar, page header, right index) read from and write to the same `NavState`. Selection, highlight, and visibility derive from it automatically.
3. **Configurable per route** — route components declare which L2 panel to show and which L3 links to expose. The shell consumes the tree; it does not own any link definitions.
4. **Custom components as first-class items** — any L2 slot can render an arbitrary React component (calendar picker, tag chips, scope radio) instead of a flat list. That component receives `navState` + `dispatch` and can read/write any filter.

---

### The Three-Level Mental Model

```
Level 1 (L1) — Top destinations         ← always visible in sidebar header + desktop top bar
│
├── Home
│   └── Level 2 (L2) — context panel    ← docs sub-pages: Zero to Hero, Syntax/*
│       └── Level 3 (L3) — page index   ← section headings on current doc
│
├── Journal
│   └── L2 — <JournalNavPanel>          ← mini calendar + tag chips (custom component)
│       └── L3                          ← sections / wod blocks in the open note
│
├── Collections
│   └── L2 — <CollectionsNavPanel>      ← category chips (Kettlebell, Crossfit, etc.)
│       └── L3                          ← sections on a collection canvas page
│
└── Search
    └── L2 — <SearchNavPanel>           ← scope filter (collections | notes | results)
        └── L3                          ← (none; search has no scrollable sections)
```

**Which levels appear in which zones by screen tier:**

| Level | Mobile (< 1024 px) | Desktop (1024–1799 px) | Ultra-wide (≥ 1800 px) |
|-------|--------------------|------------------------|------------------------|
| **L1** | Left drawer (top section) | Sidebar header (permanent) | Sidebar header (permanent) |
| **L2** | Left drawer (body below selected L1) | Sidebar body (below L1) | Sidebar body (below L1) |
| **L3** | `···` button → right slide-out drawer | Sidebar accordion (below L2) + page header pills | Permanent right panel; sidebar accordion hidden |

---

### TypeScript Interfaces

#### NavAction — what happens when a nav item is activated

```ts
type NavAction =
  | { type: 'route';  to: string }             // React Router navigate(to)
  | { type: 'scroll'; sectionId: string }       // scrollToSection(sectionId)
  | { type: 'call';   handler: () => void }     // arbitrary callback (download, theme, etc.)
  | { type: 'none' }                            // display / group-only — no action on click
```

#### NavZone — the four rendering surfaces

```ts
type NavZone =
  | 'mobile-bar'    // Zone A: sticky top bar on mobile
  | 'sidebar'       // Zone B: left sidebar / drawer
  | 'page-header'   // Zone C: sticky desktop page header
  | 'right-index'   // Zone D: permanent right panel on ultra-wide
```

#### NavItem — a single node in the tree (shared across all levels)

```ts
interface NavItem {
  /** Unique stable identifier */
  id: string

  /** Display label */
  label: string

  /** Which level of the hierarchy (1 = top, 2 = context panel, 3 = page index) */
  level: 1 | 2 | 3

  /** What happens on activation */
  action: NavAction

  // ── Presentation ──────────────────────────────────────────────────────────

  /** Heroicon or any icon component. Receives className for sizing. */
  icon?: React.ComponentType<{ className?: string }>

  /** Count badge (e.g. number of child sections, unread entries) */
  badge?: string | number

  // ── State ─────────────────────────────────────────────────────────────────

  /**
   * Determines "active / selected" highlight.
   * Defaults:
   *   - route action  → location.pathname === action.to (or startsWith for prefix match)
   *   - scroll action → navState.activeL3Id === action.sectionId
   *   - otherwise     → false
   */
  isActive?: (location: Location, navState: NavState) => boolean

  // ── Tree structure ─────────────────────────────────────────────────────────

  /**
   * Child NavItems (used when type is a collapsible group).
   * Mutually exclusive with `panel` — use one or the other.
   */
  children?: NavItem[]

  // ── Custom rendering ───────────────────────────────────────────────────────

  /**
   * Replace the entire L2 children list with a custom React component.
   * Used for Journal (CalendarPanel + TagChips), Search (ScopeFilter), etc.
   * Component receives navState + dispatch and can do anything.
   * Mutually exclusive with `children`.
   */
  panel?: React.ComponentType<NavPanelProps>

  /**
   * Override how *this item itself* is rendered inside any nav surface.
   * Use for split buttons, split toggles, or non-standard row layouts.
   * If omitted, the surface applies its default item rendering.
   */
  render?: React.ComponentType<NavItemRenderProps>

  /**
   * Restrict which zones render this item.
   * Omit to inherit defaults for the item's level.
   */
  zones?: NavZone[]
}
```

#### NavState — single shared state across all zones

```ts
interface NavState {
  // ── Selection ──────────────────────────────────────────────────────────────
  /** Currently selected L1 id (auto-derived from route, can be overridden) */
  activeL1Id: string | null

  /** Currently selected L2 id */
  activeL2Id: string | null

  /**
   * Currently visible L3 section id.
   * Driven by IntersectionObserver in the active page shell.
   * All zone renderers highlight matching L3 items automatically.
   */
  activeL3Id: string | null

  // ── Drawer visibility (mobile only) ────────────────────────────────────────
  leftDrawerOpen: boolean   // L1 + L2 left slide-over
  rightDrawerOpen: boolean  // L3 right slide-over

  // ── Accordion expanded state ────────────────────────────────────────────────
  expandedIds: Set<string>  // NavItem ids whose accordion groups are open

  // ── Contextual filter state (per L1 context) ───────────────────────────────
  journalFilter: JournalFilterState
  searchFilter: SearchFilterState
  collectionsFilter: CollectionsFilterState
}

interface JournalFilterState {
  /** Selected date as ISO yyyy-mm-dd, or null for "all" */
  selectedDate: string | null
  /** Active tag slugs */
  selectedTags: string[]
}

interface SearchFilterState {
  /** Which corpus to search */
  scope: 'all' | 'collections' | 'notes' | 'results'
}

interface CollectionsFilterState {
  /** Active category slugs e.g. ['kettlebell', 'crossfit'] */
  categories: string[]
}
```

#### NavDispatch — typed action dispatcher

```ts
type NavStateAction =
  | { type: 'SET_ACTIVE_L1';              id: string | null }
  | { type: 'SET_ACTIVE_L2';              id: string | null }
  | { type: 'SET_ACTIVE_L3';              id: string | null }
  | { type: 'TOGGLE_EXPANDED';            id: string }
  | { type: 'SET_LEFT_DRAWER';            open: boolean }
  | { type: 'SET_RIGHT_DRAWER';           open: boolean }
  | { type: 'SET_JOURNAL_DATE';           date: string | null }
  | { type: 'SET_JOURNAL_TAGS';           tags: string[] }
  | { type: 'SET_SEARCH_SCOPE';           scope: SearchFilterState['scope'] }
  | { type: 'SET_COLLECTIONS_CATEGORIES'; categories: string[] }

type NavDispatch = React.Dispatch<NavStateAction>
```

#### Props passed to custom panel and item render components

```ts
/** Props received by a custom L2 panel component (panel field on NavItem) */
interface NavPanelProps {
  /** The L1 NavItem this panel belongs to */
  item: NavItem
  navState: NavState
  dispatch: NavDispatch
}

/** Props received by a custom item renderer (render field on NavItem) */
interface NavItemRenderProps {
  item: NavItem
  isActive: boolean
  navState: NavState
  dispatch: NavDispatch
}
```

#### L3 link (page index) — replaces PageNavLink / StickyNavSection

```ts
/**
 * L3 items are NavItems with level: 3 and action: { type: 'scroll', sectionId }.
 * They can also carry action: { type: 'call' } for wod-block "run" triggers.
 * The onRun pattern from PageNavLink maps to a secondary action:
 */
interface NavItemL3 extends NavItem {
  level: 3
  action: { type: 'scroll'; sectionId: string } | { type: 'none' }
  /** Secondary action — rendered as a small inline Play button */
  secondaryAction?: { type: 'call'; handler: () => void; label?: string }
}
```

---

### Navigation Tree — App-Level Configuration

The tree is declared once at the app root and passed via `NavContext`. Route components can inject their L3 items via a `useSetNavL3(items)` hook — they do not touch L1 or L2.

```ts
// playground/src/nav/appNavTree.ts
import { HomeIcon, RectangleStackIcon, FolderIcon, MagnifyingGlassIcon, AcademicCapIcon, CodeBracketIcon } from '@heroicons/react/20/solid'
import { JournalNavPanel } from './panels/JournalNavPanel'
import { CollectionsNavPanel } from './panels/CollectionsNavPanel'
import { SearchNavPanel } from './panels/SearchNavPanel'
import { canvasRoutes } from '../canvas/canvasRoutes'

export const appNavTree: NavItem[] = [
  // ── L1: Home ───────────────────────────────────────────────────────────────
  {
    id: 'home', label: 'Home', level: 1,
    icon: HomeIcon,
    action: { type: 'route', to: '/' },
    isActive: (loc) => loc.pathname === '/' || loc.pathname === '',
    children: [
      { id: 'zero-to-hero', label: 'Zero to Hero', level: 2,
        icon: AcademicCapIcon,
        action: { type: 'route', to: '/getting-started' } },
      { id: 'syntax-group', label: 'Syntax', level: 2,
        icon: CodeBracketIcon,
        action: { type: 'none' },
        children: canvasRoutes.map(p => ({
          id: p.route,
          label: p.page.sections[0]?.heading || 'Untitled',
          level: 2 as const,
          icon: CodeBracketIcon,
          action: { type: 'route' as const, to: p.route },
        })) },
    ],
  },

  // ── L1: Journal ────────────────────────────────────────────────────────────
  {
    id: 'journal', label: 'Journal', level: 1,
    icon: RectangleStackIcon,
    action: { type: 'route', to: '/journal' },
    isActive: (loc) => loc.pathname.startsWith('/journal'),
    // Custom panel replaces children list:
    panel: JournalNavPanel,
  },

  // ── L1: Collections ────────────────────────────────────────────────────────
  {
    id: 'collections', label: 'Collections', level: 1,
    icon: FolderIcon,
    action: { type: 'route', to: '/collections' },
    isActive: (loc) => loc.pathname.startsWith('/collections'),
    panel: CollectionsNavPanel,
  },

  // ── L1: Search ─────────────────────────────────────────────────────────────
  {
    id: 'search', label: 'Search', level: 1,
    icon: MagnifyingGlassIcon,
    action: { type: 'route', to: '/search' },
    isActive: (loc) => loc.pathname === '/search',
    panel: SearchNavPanel,
  },
]
```

---

### Custom L2 Panel Components

Each panel receives `navState` + `dispatch` and is responsible only for its filter slice.

```tsx
// panels/JournalNavPanel.tsx
export function JournalNavPanel({ navState, dispatch }: NavPanelProps) {
  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      <MiniCalendar
        selectedDate={navState.journalFilter.selectedDate}
        onSelect={(date) => dispatch({ type: 'SET_JOURNAL_DATE', date })}
      />
      <TagChips
        selected={navState.journalFilter.selectedTags}
        onChange={(tags) => dispatch({ type: 'SET_JOURNAL_TAGS', tags })}
      />
    </div>
  )
}

// panels/CollectionsNavPanel.tsx
export function CollectionsNavPanel({ navState, dispatch }: NavPanelProps) {
  const groups = ['Kettlebell', 'Crossfit', 'Swimming', 'Other']
  return (
    <CategoryChips
      options={groups}
      selected={navState.collectionsFilter.categories}
      onChange={(categories) => dispatch({ type: 'SET_COLLECTIONS_CATEGORIES', categories })}
    />
  )
}

// panels/SearchNavPanel.tsx
export function SearchNavPanel({ navState, dispatch }: NavPanelProps) {
  const options: SearchFilterState['scope'][] = ['all', 'collections', 'notes', 'results']
  return (
    <ScopeRadio
      options={options}
      value={navState.searchFilter.scope}
      onChange={(scope) => dispatch({ type: 'SET_SEARCH_SCOPE', scope })}
    />
  )
}
```

---

### `useNavState` Hook

```ts
// hooks/useNavState.ts
import { useReducer, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { NavItem, NavState, NavStateAction } from './navTypes'

const initialState: NavState = {
  activeL1Id: null,
  activeL2Id: null,
  activeL3Id: null,
  leftDrawerOpen: false,
  rightDrawerOpen: false,
  expandedIds: new Set(),
  journalFilter: { selectedDate: null, selectedTags: [] },
  searchFilter: { scope: 'all' },
  collectionsFilter: { categories: [] },
}

function navReducer(state: NavState, action: NavStateAction): NavState {
  switch (action.type) {
    case 'SET_ACTIVE_L1':          return { ...state, activeL1Id: action.id }
    case 'SET_ACTIVE_L2':          return { ...state, activeL2Id: action.id }
    case 'SET_ACTIVE_L3':          return { ...state, activeL3Id: action.id }
    case 'SET_LEFT_DRAWER':        return { ...state, leftDrawerOpen: action.open }
    case 'SET_RIGHT_DRAWER':       return { ...state, rightDrawerOpen: action.open }
    case 'TOGGLE_EXPANDED': {
      const next = new Set(state.expandedIds)
      next.has(action.id) ? next.delete(action.id) : next.add(action.id)
      return { ...state, expandedIds: next }
    }
    case 'SET_JOURNAL_DATE':          return { ...state, journalFilter: { ...state.journalFilter, selectedDate: action.date } }
    case 'SET_JOURNAL_TAGS':          return { ...state, journalFilter: { ...state.journalFilter, selectedTags: action.tags } }
    case 'SET_SEARCH_SCOPE':          return { ...state, searchFilter: { ...state.searchFilter, scope: action.scope } }
    case 'SET_COLLECTIONS_CATEGORIES': return { ...state, collectionsFilter: { categories: action.categories } }
    default: return state
  }
}

export function useNavState(tree: NavItem[]): [NavState, NavDispatch] {
  const location = useLocation()
  const [state, dispatch] = useReducer(navReducer, initialState)

  // Auto-sync activeL1Id from route
  useEffect(() => {
    const match = tree.find(item =>
      item.isActive
        ? item.isActive(location as unknown as Location, state)
        : item.action.type === 'route' && location.pathname === item.action.to
    )
    if (match?.id !== state.activeL1Id) {
      dispatch({ type: 'SET_ACTIVE_L1', id: match?.id ?? null })
    }
  }, [location.pathname])         // intentionally omit state to avoid loops

  // Close left drawer on route change
  useEffect(() => {
    dispatch({ type: 'SET_LEFT_DRAWER', open: false })
  }, [location.pathname])

  return [state, dispatch]
}
```

---

### `useSetNavL3` — Route-level L3 injection

Route components register their page-index items without touching the global tree:

```ts
// hooks/useSetNavL3.ts
import { useContext, useEffect } from 'react'
import { NavContext } from '../nav/NavContext'
import type { NavItemL3 } from './navTypes'

/** Called by page components to register their L3 scroll-anchor items. */
export function useSetNavL3(items: NavItemL3[]) {
  const { setL3Items } = useContext(NavContext)
  useEffect(() => {
    setL3Items(items)
    return () => setL3Items([])   // clear on unmount
  }, [items])                     // items should be stable (useMemo at call site)
}
```

> **Example** — inside `WorkoutEditorPage`:
> ```ts
> const l3Items = useMemo(() =>
>   extractPageIndex(content).map(link => ({
>     id: link.id, label: link.label, level: 3 as const,
>     action: { type: 'scroll' as const, sectionId: link.id },
>     secondaryAction: link.onRun
>       ? { type: 'call' as const, handler: link.onRun, label: 'Run' }
>       : undefined,
>   })), [content])
>
> useSetNavL3(l3Items)
> ```

---

### Zone Renderer Contract

Each zone component receives the same interface. The zone decides how to visually present items; it does **not** own state logic.

```ts
interface NavZoneProps {
  /** Full tree (L1 + L2 for active L1 + L3 injected by current page) */
  tree: NavItem[]
  l3Items: NavItemL3[]
  navState: NavState
  dispatch: NavDispatch
  /** Which zone this renderer represents */
  zone: NavZone
}
```

Zone-specific rendering rules:

| Zone | Renders | Active item style |
|------|---------|-------------------|
| `mobile-bar` | L1 icon links + utility buttons | Underline or filled pill |
| `sidebar` | L1 list → L2 (list or panel) → L3 accordion (hidden at 3xl) | `data-[current]` class (existing pattern) |
| `page-header` | Page title + L3 pills + utility buttons | Filled pill for active L3 |
| `right-index` | L3 items as a labeled list (visible 3xl+ only) | Left border accent on active L3 |

---

### Crosswalk: Existing Types → New Types

| Old type | New equivalent | Migration note |
|----------|---------------|----------------|
| `PageNavLink` | `NavItemL3` | Rename; `onRun` → `secondaryAction` |
| `StickyNavSection` | `NavItemL3` (subset) | Merge; no `onRun` on sticky sections |
| Inline `HOME_LINKS`, `ZERO_TO_HERO_LINKS`, `SYNTAX_LINKS` constants | Children of `home` L1 NavItem | Move into tree config |
| `scrollToSection(id)` callback | Derived from `dispatch({ type: 'SET_ACTIVE_L3', id }) + DOM scroll` | Centralise in `NavContext` |
| `currentNavLinks` computed in `AppContent` | `l3Items` injected by each route component via `useSetNavL3` | Decouple from `AppContent` |

---

##  Comments

