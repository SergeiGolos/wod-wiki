



# Page Navigation Contract

This document defines the **standard vocabulary and contract** for how every page in WOD Wiki sets its navigation values as it loads, and the **`INavActivation` interface** that all activatable UI elements — nav items, playground links, header action buttons, and keyboard bindings — must implement.

It is the authoritative reference for:

- Developers implementing new pages or refactoring existing ones
- Developers wiring up buttons, links, or keyboard shortcuts that trigger navigation
- Documentation authors describing what a page does
- Anyone adding markdown canvas pages that need consistent navigation integration

---

## Navigation Model — Three Levels

The app sidebar and header display a three-level navigation tree. Every page must declare, on load, what it contributes to each level.

| Level | Name | Description | Who sets it |
|-------|------|-------------|-------------|
| **L1** | **Section** | Top-level app area (Home, Journal, Collections, Search) | Static — `appNavTree` |
| **L2** | **Context** | Sub-section, filter panel, or child pages within the active L1 | Static (canvas pages) or dynamic (filter panels) |
| **L3** | **Page Index** | Scroll anchors for the current page — headings, entries, or wod blocks | **Dynamic — set by each page at load time** |

**Only L3 changes per-page load.** L1 and L2 activation is derived from the current route matching `appNavTree` entries.

---

## The `INavActivation` Interface

Every activatable UI element — nav tree items, playground links, page-index entries, header action buttons, and keyboard bindings — must implement `INavActivation`. This creates a single, typed contract that all rendering surfaces can consume without needing to know the element's origin.

### Core interface

```typescript
/**
 * INavActivation — base contract for any activatable UI element.
 *
 * Implemented by: NavItem, PageNavLink, PlaygroundLink, toolbar buttons,
 * keyboard shortcut bindings, and any future navigation surface.
 */
export interface INavActivation {
  /** Unique stable identifier (used as React key and anchor id). */
  id: string

  /** Display text shown in sidebar, header, TOC panel, and tooltips. */
  label: string

  /** Optional icon component. Receives `className` for size/color. */
  icon?: React.ComponentType<{ className?: string }>

  /** What happens when this element is activated. */
  action: INavAction
}
```

### Action child types

All action shapes are discriminated by `type`. Every rendering surface dispatches via the same `executeNavAction(action, deps)` helper so individual buttons/links carry zero routing logic.

```typescript
/**
 * INavAction — polymorphic action attached to any INavActivation.
 *
 * Navigation actions:
 *   route   — navigate to a new route
 *   query   — update URL query params (scroll/filter state)
 *
 * View container actions (canvas pages):
 *   view-source  — swap the sticky editor panel's content
 *   view-state   — transition the panel state machine
 *
 * Composition:
 *   pipeline     — execute a sequence of actions in order
 *   call         — invoke an arbitrary handler
 *   none         — no-op (expand/collapse only)
 */
export type INavAction =
  | RouteChangeAction
  | RouteQueryAction
  | ViewSourceAction
  | ViewStateAction
  | PipelineAction
  | CallAction
  | NoneAction

/**
 * Navigate to a new route. Replaces the current history entry by default.
 * Set pushHistory: true when the navigation should be undoable via Back.
 */
export interface RouteChangeAction {
  type: 'route'
  to: string
  pushHistory?: boolean   // default: true (navigate adds an entry)
}

/**
 * Update URL query parameters without a full route change.
 * Used for scroll position, active section, filter state, and any
 * transient UI state that should be shareable/bookmarkable.
 *
 * pushHistory defaults to false so that scroll events don't flood
 * the browser history stack (replaceState semantics).
 */
export interface RouteQueryAction {
  type: 'query'
  /** Key/value pairs to merge into the current search string.
   *  Pass null for a value to remove that key entirely. */
  params: Record<string, string | null>
  pushHistory?: boolean   // default: false (replaceState)
}

/**
 * Swap the sticky view panel's editor source content.
 * Replaces the current PipelineStep { action: 'set-source', value } pattern.
 * The panel performs a fade-swap transition (180 ms opacity cross-fade).
 */
export interface ViewSourceAction {
  type: 'view-source'
  /** Resolved file path or inline wod content string. */
  source: string
}

/**
 * Transition the view panel's state machine.
 * Replaces the current PipelineStep { action: 'set-state', value } pattern.
 *
 * States:
 *   'note'    — show the NoteEditor (default / reset)
 *   'track'   — compile + launch the first WOD block
 *   'review'  — show the post-workout review panel
 *
 * The `open` field controls where 'track' launches the runtime:
 *   'view'    — inline in the sticky panel (default for scroll-triggered commands)
 *   'dialog'  — fullscreen overlay (FullscreenTimer)
 *   'route'   — navigate to /tracker/:runtimeId (full-page tracker)
 */
export interface ViewStateAction {
  type: 'view-state'
  state: 'note' | 'track' | 'review'
  open?: 'view' | 'dialog' | 'route'  // only relevant when state = 'track'
}

/**
 * Execute a sequence of actions in order.
 * Replaces the PipelineStep[] array + executePipeline() pattern.
 * Used by canvas ButtonBlock and CommandBlock which chain multiple steps.
 *
 * Example — a "Try It" button that loads a source file then launches tracking:
 *   {
 *     type: 'pipeline',
 *     steps: [
 *       { type: 'view-source', source: 'markdown/canvas/syntax/sample.md' },
 *       { type: 'view-state',  state: 'track', open: 'view' },
 *     ]
 *   }
 */
export interface PipelineAction {
  type: 'pipeline'
  steps: INavAction[]
}

/**
 * Invoke an arbitrary handler. Used for toolbar actions, play buttons,
 * and any activation that doesn't produce a URL change.
 */
export interface CallAction {
  type: 'call'
  handler: () => void
  /** Optional tooltip / aria-label override. Defaults to parent label. */
  label?: string
}

/**
 * No-op — used for accordion group headers that expand/collapse only.
 */
export interface NoneAction {
  type: 'none'
}
```

### Dependency injection for action execution

Child action types must not close over framework-specific hooks. Instead, a shared `NavActionDeps` object is passed at execution time by the rendering surface. Canvas pages supply the additional `view*` deps; nav-only surfaces leave them undefined.

```typescript
export interface NavActionDeps {
  // ── Navigation ────────────────────────────────────────────────────────────
  navigate:        (to: string, opts?: { replace?: boolean }) => void
  setQueryParam:   (params: Record<string, string | null>, replace?: boolean) => void

  // ── View container (canvas pages only) ───────────────────────────────────
  /** Fade-swap the sticky editor panel's source content. */
  swapSource?:     (source: string) => void
  /** Transition the panel state machine. */
  setPanelState?:  (state: 'note' | 'track' | 'review', open?: 'view' | 'dialog' | 'route') => void
}

/**
 * executeNavAction — the single dispatch function used by all rendering
 * surfaces (sidebar rows, dropdown items, keyboard bindings, canvas buttons,
 * scroll-triggered commands).
 *
 * View-container actions are silently skipped on surfaces that don't supply
 * the optional view deps, so the same INavAction shapes are safe to use
 * everywhere.
 */
export function executeNavAction(action: INavAction, deps: NavActionDeps): void {
  switch (action.type) {
    case 'route':
      deps.navigate(action.to, { replace: !(action.pushHistory ?? true) })
      break
    case 'query':
      deps.setQueryParam(action.params, !(action.pushHistory ?? false))
      break
    case 'view-source':
      deps.swapSource?.(action.source)
      break
    case 'view-state':
      deps.setPanelState?.(action.state, action.open)
      break
    case 'pipeline':
      action.steps.forEach(step => executeNavAction(step, deps))
      break
    case 'call':
      action.handler()
      break
    case 'none':
      break
  }
}
```

### `setLayout` — declaring nav items per level

Pages declare their navigation items through a single `setLayout` call. The `target` identifies which nav level the items belong to. For L1 and L2 the call is mostly static (driven by `appNavTree`); for L3 every page calls this on load.

```typescript
type NavLevel = 'l1' | 'l2' | 'l3'

/**
 * setLayout — registers an array of INavActivation items for a given
 * navigation level. Called by AppContent and individual page components.
 *
 * @param target   Which level to populate.
 * @param items    Ordered list of activations. Pass [] to clear.
 *
 * Examples:
 *
 *   // Static L1 (called once in AppContent on bootstrap)
 *   setLayout('l1', [
 *     { id: 'home',        label: 'Home',        icon: HomeIcon,   action: { type: 'route', to: '/' } },
 *     { id: 'journal',     label: 'Journal',     icon: ListIcon,   action: { type: 'route', to: '/journal' } },
 *     { id: 'collections', label: 'Collections', icon: FolderIcon, action: { type: 'route', to: '/collections' } },
 *     { id: 'search',      label: 'Search',      icon: SearchIcon, action: { type: 'route', to: '/search' } },
 *   ])
 *
 *   // Dynamic L3 (called by each page on mount, cleared on unmount)
 *   setLayout('l3', sections.map(s => ({
 *     id:     s.id,
 *     label:  s.label,
 *     action: { type: 'query', params: { s: s.id }, pushHistory: false },
 *   })))
 */
function setLayout(target: NavLevel, items: INavActivation[]): void
```

### Inheritance — how existing types map to `INavActivation`

All current nav primitives are direct implementations of `INavActivation`. No breaking changes are required; the mapping is additive.

| Existing type | Inherits from | Action type used | Notes |
|---|---|---|---|
| `NavItem` (L1/L2) | `INavActivation` | `route` or `none` | Adds `level`, `children`, `panel`, `render`, `isActive`, `zones` |
| `NavItemL3` | `INavActivation` | `query` (replaces `scroll`) | `scroll` → `RouteQueryAction { params: { s: sectionId } }` |
| `PageNavLink` | `INavActivation` | `query` + optional `call` | `onRun` → `secondaryAction` of type `call` |
| `ButtonBlock` | `INavActivation` | `pipeline` | `pipeline: PipelineStep[]` → `PipelineAction { steps: INavAction[] }` |
| `CommandBlock` | `INavAction[]` (no label/icon) | `pipeline` | Scroll-triggered; no UI label needed — `INavAction[]` directly |
| `ViewButton` | `INavActivation` | `pipeline` | Rendered in `ViewPanelButtons` next to the sticky panel |
| Playground link | `INavActivation` | `route` | Route targets a `/playground/:id` path |
| Toolbar button | `INavActivation` | `call` | Icon button with label used as `aria-label` |
| Keyboard binding | `INavActivation` | any | Fires `executeNavAction(item.action, deps)` |

---

## Canvas View Container Automation

Canvas pages have an additional layer of automation beyond navigation: the **view container** (sticky editor/runtime panel) can have its source content and state machine driven by scroll position and button clicks. These transitions are currently expressed as `PipelineStep[]` (stringly-typed). Under the `INavAction` model they become typed, composable, and dispatchable through the same `executeNavAction` helper.

### The view container state machine

```
┌──────────────┐  view-state: track (open: view)  ┌───────────────┐
│              │ ──────────────────────────────→  │               │
│    'editor'  │                                  │   'running'   │
│  (NoteEditor)│ ←──────────────────────────────  │ (RuntimePanel)│
│              │  view-state: note  OR  onClose   │               │
└──────────────┘                                  └───────────────┘
       ↑                                                  │
       │  view-state: note                   runtime completes naturally
       │                                                  ↓
       └──────────────────────────────────  ┌─────────────────────┐
                                            │      'review'       │
                                            │  (FullscreenReview) │
                                            └─────────────────────┘
```

Parallel launch targets for `view-state: track`:

| `open` value | Where runtime appears |
|---|---|
| `'view'` | Inline in the sticky panel (default for scroll-triggered commands) |
| `'dialog'` | `FullscreenTimer` overlay (fullscreen over current page) |
| `'route'` | Navigate to `/tracker/:runtimeId` (dedicated full-page tracker) |

### Scroll-triggered commands (`CommandBlock` → `INavAction[]`)

When a canvas section enters the viewport, its `commands` array fires. Each command is a sequence of steps — a direct `PipelineAction`. The `executePipeline()` function becomes `executeNavAction()`:

```typescript
// Current (stringly-typed)
for (const cmd of section.commands) {
  executePipeline(cmd.pipeline, cmd.open ?? 'view')
}

// Under INavAction (typed)
for (const action of section.scrollActions) {
  executeNavAction(action, deps)
}

// Where section.scrollActions is built from CommandBlock at parse time:
const scrollActions: INavAction[] = section.commands.map(cmd => ({
  type: 'pipeline',
  steps: cmd.pipeline.map(step => pipelineStepToNavAction(step, cmd.open ?? 'view')),
}))
```

### Button clicks (`ButtonBlock` / `ViewButton` → `INavActivation`)

Canvas buttons become full `INavActivation` items:

```typescript
// A "Try It" button that loads a source file then starts the tracker inline:
const tryItButton: INavActivation = {
  id:     'try-amrap',
  label:  'Try It',
  icon:   PlayIcon,
  action: {
    type: 'pipeline',
    steps: [
      { type: 'view-source', source: 'markdown/canvas/syntax/amrap-sample.md' },
      { type: 'view-state',  state: 'track', open: 'view' },
    ],
  },
}

// A "Full Screen" button that opens the tracker on its own page:
const fullscreenButton: INavActivation = {
  id:     'fullscreen-amrap',
  label:  'Full Screen',
  icon:   ArrowsPointingOutIcon,
  action: { type: 'view-state', state: 'track', open: 'route' },
}

// A navigation button that moves to the next doc page:
const nextButton: INavActivation = {
  id:     'next-timers',
  label:  'Next: Timers',
  icon:   ChevronRightIcon,
  action: { type: 'route', to: '/syntax/timers', pushHistory: true },
}
```

### Mapping `PipelineStep` to `INavAction`

The migration from the current stringly-typed system is a one-to-one mapping:

| `PipelineStep` (current) | `INavAction` (standard) |
|---|---|
| `{ action: 'set-source', value: 'path/to/file.md' }` | `{ type: 'view-source', source: 'path/to/file.md' }` |
| `{ action: 'set-state', value: 'note' }` | `{ type: 'view-state', state: 'note' }` |
| `{ action: 'set-state', value: 'review' }` | `{ type: 'view-state', state: 'review' }` |
| `{ action: 'set-state', value: 'track' }` + `open: 'view'` | `{ type: 'view-state', state: 'track', open: 'view' }` |
| `{ action: 'set-state', value: 'track' }` + `open: 'dialog'` | `{ type: 'view-state', state: 'track', open: 'dialog' }` |
| `{ action: 'set-state', value: 'track' }` + `open: 'route'` | `{ type: 'view-state', state: 'track', open: 'route' }` |
| `{ action: 'navigate', value: '/syntax/timers' }` | `{ type: 'route', to: '/syntax/timers' }` |
| Multiple steps in `pipeline[]` | `{ type: 'pipeline', steps: [...] }` |

### Building `NavActionDeps` inside `MarkdownCanvasPage`

The canvas page constructs the deps object once and passes it down to all rendering surfaces:

```typescript
// Inside MarkdownCanvasPage
const deps: NavActionDeps = useMemo(() => ({
  navigate,
  setQueryParam: (params, replace) => {
    setHeadingParam(params['h'] ?? null, { history: replace ? 'replace' : 'push' })
  },
  swapSource,
  setPanelState: (state, open) => {
    if (state === 'note') {
      closeViewRuntime()
    } else if (state === 'review') {
      setPanelMode('review')
    } else if (state === 'track') {
      const block = wodBlocksRef.current[0] ?? null
      if (!block) return
      if (open === 'view')   launchViewRuntime(block)
      if (open === 'dialog') setFullscreenBlock(block)
      if (open === 'route') {
        const runtimeId = uuidv4()
        pendingRuntimes.set(runtimeId, { block, noteId: '' })
        navigate(`/tracker/${runtimeId}`)
      }
    }
  },
}), [navigate, swapSource, closeViewRuntime, launchViewRuntime])
```

### Scroll-position query param (`?h=`)

The active canvas section heading is tracked as a `RouteQueryAction` — the same interface used by L3 items — so the URL stays in sync with the viewport:

```typescript
// Fired by IntersectionObserver when the most-visible section changes
executeNavAction(
  { type: 'query', params: { h: bestId }, pushHistory: false },
  deps
)
```

This replaces the direct `setHeadingParamRef.current(bestId)` call, unifying scroll tracking across both nav-level L3 and canvas-level section tracking behind a single `RouteQueryAction`.

---

### Secondary actions

Some items carry a secondary activation (e.g. a ▶ Play button alongside a section link). Secondary actions are expressed as a second `INavActivation` embedded in the item:

```typescript
export interface INavActivationWithSecondary extends INavActivation {
  /** Optional secondary action rendered inline (e.g. Play button on a WOD block). */
  secondaryAction?: INavActivation
}
```

---

## Terminology

The following terms are used consistently throughout the codebase and all documentation:

| Term | Definition |
|------|-----------|
| **`INavActivation`** | The base interface for every activatable UI element. Has `id`, `label`, `icon?`, and `action`. |
| **`INavAction`** | The discriminated union of all action types (`route`, `query`, `call`, `none`). |
| **`RouteChangeAction`** | An action that navigates to a new path via the router. |
| **`RouteQueryAction`** | An action that updates URL query params without a route change. Used for scroll position, section tracking, and filter state. |
| **`setLayout(target, items)`** | The standard API for a page to declare its nav items for a given level. |
| **Page Title** | The string shown in the sticky header bar. Set via `CanvasPage title=` prop. |
| **Subheader** | Optional content rendered below the title row — typically a `TextFilterStrip`. |
| **Page Actions** | Right-side icon buttons in the sticky header (New Entry, Cast, Audio, Actions). Each implements `INavActivation` with a `call` action. |
| **L3 Items** | The ordered list of `INavActivation` objects registered via `setLayout('l3', ...)` or `useSetNavL3()`. Displayed in the sidebar accordion and right-side TOC panel. |
| **Active L3** | The currently visible L3 item, driven by `IntersectionObserver` on the page's scroll container. Tracked via `?s=` query param. |
| **Page Index** | Synonym for L3 items when described in page documentation. |
| **Canvas Page** | A page rendered from a `template: canvas` markdown file. Sections come from H2 headings. |
| **List Page** | A page showing a scrollable, date-grouped list of entries (Journal, Search, Collections). |
| **Editor Page** | A page showing the note editor (`JournalPageShell`). L3 comes from markdown headings in the note. |
| **Canvas Section** | One H2 (or deeper) heading block inside a canvas markdown file. Becomes one L3 item. |
| **Section Attributes** | `{sticky}`, `{dark}`, `{full-bleed}` suffixes on a canvas heading that control visual layout. |
| **Scroll Anchor** | An `id` attribute on a DOM element that L3 activation scrolls to. |
| **Active Section** | The scroll anchor whose section is currently in the viewport. Synced to `?s=` query param via `RouteQueryAction`. |

---

## How a Page Sets Its Navigation Values

Every page load follows this sequence:

```
Route change
  → AppContent reads location.pathname
  → Resolves canvasPage (if any) via findCanvasPage()
  → Computes currentNavLinks (INavActivation[])
  → Calls setLayout('l3', items) to push L3 into NavContext
  → Renders CanvasPage shell with title, subheader, actions, index props
```

### The `CanvasPage` shell props contract

```typescript
interface CanvasPageProps {
  title?:              string              // page title in header bar
  subheader?:          ReactNode           // optional filter strip under title
  actions?:            ReactNode           // right-side header action buttons
  index?:              INavActivation[]    // L3: page index (right TOC + sidebar)
  onScrollToSection?:  (id: string) => void // wired to executeNavAction scroll
  hero?:               ReactNode           // hero banner above sticky nav
  sections?:           DocsSection[]       // sections-mode (alternative to title)
}
```

### L3 derivation rules by page type

| Page type | L3 source | L3 action type | Update trigger |
|-----------|-----------|----------------|----------------|
| **Canvas** | H2+ headings of the markdown file | `RouteQueryAction { params: { s: id } }` | Route change |
| **List** (Journal, Search) | Most recent 10 dates with activity | `RouteQueryAction { params: { s: date } }` | Results refresh |
| **Editor** | Markdown headings extracted from note content | `RouteQueryAction` + optional `CallAction` (WOD blocks) | Content change |
| **Tracker / Review** | None — full-screen, no sidebar | — | — |
| **Load** | None | — | — |

### Scroll-driven active section tracking

When the user scrolls, the `IntersectionObserver` fires and the active section changes. This updates state by dispatching a `RouteQueryAction`:

```typescript
// Fired by IntersectionObserver — replaceState, no history push
executeNavAction(
  { type: 'query', params: { s: visibleSectionId }, pushHistory: false },
  deps
)
```

This keeps the `?s=` query param in sync with the viewport without flooding browser history. A back-navigation from another page restores the correct scroll position.

---

## Page Inventory

The table below lists every page in the app and the navigation values it sets at load time.

### Legend for L3 Source column

- **Canvas sections** — L3 = H2 headings of the corresponding markdown file
- **Recent dates** — L3 = up to 10 ISO dates with workout activity, formatted as "Apr 14, 2026"
- **Note headings** — L3 = markdown headings extracted from the open note's content
- **None** — no L3 registered; right TOC and sidebar index are empty

---

### Core Navigation Pages

| Page | Route | L1 Active | L2 Active | Page Title | Subheader | L3 Source | L3 items |
|------|-------|-----------|-----------|------------|-----------|-----------|---------|
| **Home** | `/` | `home` | — | `"Home"` | — | Canvas sections | See [Home canvas sections](#home-) |
| **Journal** | `/journal` | `journal` | `JournalNavPanel` | `"Journal"` | — | Recent dates | Up to 10 dates with entries |
| **Search** | `/search` | `search` | `SearchNavPanel` | `"Search"` | `TextFilterStrip` ("Search workouts…") | Recent dates | Up to 10 dates with results |
| **Collections** | `/collections` | `collections` | `CollectionsNavPanel` | `"Collections"` | `TextFilterStrip` ("Filter collections…") | — | None |

---

### Documentation Canvas Pages (L1: `home`)

These pages are listed as L2 children under the Home L1 item in `appNavTree`.

| Page | Route | L2 Active | Page Title | L3 Source | L3 items |
|------|-------|-----------|------------|-----------|---------|
| **Zero to Hero** | `/getting-started` | `zero-to-hero` | `"Zero to Hero"` | Canvas sections | See [Getting Started sections](#zero-to-hero-getting-started) |
| **Syntax Reference** | `/syntax` | `syntax-/syntax` | `"Syntax Reference"` | Canvas sections | See [Syntax Overview sections](#syntax-reference-syntax) |
| **The Basics** | `/syntax/basics` | `syntax-/syntax/basics` | `"The Basics"` | Canvas sections | See [The Basics sections](#the-basics-syntaxbasics) |
| **Timers and Intervals** | `/syntax/timers` | `syntax-/syntax/timers` | `"Timers and Intervals"` | Canvas sections | See [Timers sections](#timers-and-intervals-syntaxtimers) |
| **Rounds and Groups** | `/syntax/groups` | `syntax-/syntax/groups` | `"Rounds and Groups"` | Canvas sections | See [Groups sections](#rounds-and-groups-syntaxgroups) |
| **AMRAP** | `/syntax/amrap` | `syntax-/syntax/amrap` | `"AMRAP"` | Canvas sections | See [AMRAP sections](#amrap-syntaxamrap) |
| **EMOM** | `/syntax/emom` | `syntax-/syntax/emom` | `"EMOM"` | Canvas sections | See [EMOM sections](#emom-syntaxemom) |
| **Tabata and Intervals** | `/syntax/tabata` | `syntax-/syntax/tabata` | `"Tabata and Intervals"` | Canvas sections | See [Tabata sections](#tabata-and-intervals-syntaxtabata) |
| **Rep Schemes** | `/syntax/repeaters` | `syntax-/syntax/repeaters` | `"Rep Schemes"` | Canvas sections | See [Rep Schemes sections](#rep-schemes-syntaxrepeaters) |
| **Rest Periods** | `/syntax/rest` | `syntax-/syntax/rest` | `"Rest Periods"` | Canvas sections | See [Rest sections](#rest-periods-syntaxrest) |
| **Measurements** | `/syntax/measurements` | `syntax-/syntax/measurements` | `"Measurements"` | Canvas sections | See [Measurements sections](#measurements-syntaxmeasurements) |
| **Supplemental Data** | `/syntax/supplemental` | `syntax-/syntax/supplemental` | `"Supplemental Data"` | Canvas sections | See [Supplemental sections](#supplemental-data-syntaxsupplemental) |
| **Complex Workouts** | `/syntax/complex` | `syntax-/syntax/complex` | `"Complex Workouts"` | Canvas sections | See [Complex sections](#complex-workouts-syntaxcomplex) |

---

### Dynamic Collection Canvas Pages (L1: `collections`)

| Page | Route | L1 Active | Page Title | L3 Source |
|------|-------|-----------|------------|-----------|
| **Collection Detail** | `/collections/:slug` | `collections` | `currentWorkout.name` | Canvas sections of the collection's markdown file |

---

### Editor Pages (L1: derived from prior navigation state)

| Page | Route | Page Title | L3 Source | L3 items |
|------|-------|------------|-----------|---------|
| **Journal Entry** | `/journal/:id` | Note ID (e.g. `"2026-04-14"`) | Note headings | H1/H2/H3 from editor content + WOD blocks with ▶ run action |
| **Playground Note** | `/playground/:id` | Note ID | Note headings | H1/H2/H3 from editor content + WOD blocks |
| **Workout Note** | `/note/:category/:name` | Note name | Note headings | H1/H2/H3 from editor content + WOD blocks |

---

### Full-Screen Pages (no sidebar / no L3)

| Page | Route | Notes |
|------|-------|-------|
| **Tracker** | `/tracker/:runtimeId` | Full-screen runtime view. No CanvasPage shell, no L3. |
| **Review** | `/review/:runtimeId` | Full-screen review. Title: `"Workout Review"`. No L3. |
| **Load Zip** | `/load` | Utility page. No sidebar navigation. |

---

## L3 Item Detail — Canvas Pages

Each canvas page's L3 items are the **H2 headings** rendered as scroll anchors. The H1 is the page hero (rendered via `{sticky dark full-bleed}` attribute) and is **not** included in L3.

### Home (`/`)

| L3 ID | L3 Label |
|-------|----------|
| `your-workout-written-once-run-forever` | Your workout — written once, run forever. |

*(Additional H2s contribute additional L3 items as the home page is developed.)*

---

### Zero to Hero (`/getting-started`)

| L3 ID                        | L3 Label                     |
| ---------------------------- | ---------------------------- |
| `step-1-your-first-movement` | Step 1 — Your First Movement |
| `step-2-add-reps-and-load`   | Step 2 — Add Reps and Load   |
| `step-3-your-first-timer`    | Step 3 — Your First Timer    |
| `step-4-rounds-and-groups`   | Step 4 — Rounds and Groups   |
| `step-5-your-first-amrap`    | Step 5 — Your First AMRAP    |
| `step-6-save-and-review`     | Step 6 — Save and Review     |
| `whats-next`                 | What's Next                  |

---

### Syntax Reference (`/syntax`)

| L3 ID | L3 Label |
|-------|----------|
| `the-basics` | The Basics |
| `timers-and-intervals` | Timers and Intervals |
| `rep-schemes` | Rep Schemes |
| `rounds-and-groups` | Rounds and Groups |
| `amrap` | AMRAP |
| `emom` | EMOM |
| `tabata-and-intervals` | Tabata and Intervals |
| `rest-periods` | Rest Periods |
| `measurements` | Measurements |
| `supplemental-data` | Supplemental Data |
| `complex-workouts` | Complex Workouts |
| `start-writing` | Start Writing |

---

### The Basics (`/syntax/basics`)

| L3 ID | L3 Label |
|-------|----------|
| `a-single-movement` | A Single Movement |
| `three-core-rules` | Three Core Rules |
| `whats-next` | What's Next |

---

### Timers and Intervals (`/syntax/timers`)

| L3 ID | L3 Label |
|-------|----------|
| `countdown-timers` | Countdown Timers |
| `count-up-timers` | Count-Up Timers |
| `mixed-timers` | Mixed Timers |
| `long-durations` | Long Durations |
| `whats-next` | What's Next |

---

### Rounds and Groups (`/syntax/groups`)

| L3 ID | L3 Label |
|-------|----------|
| `simple-rounds` | Simple Rounds |
| `named-groups` | Named Groups |
| `nested-groups` | Nested Groups |
| `mixed-sections` | Mixed Sections |
| `whats-next` | What's Next |

---

### AMRAP (`/syntax/amrap`)

| L3 ID | L3 Label |
|-------|----------|
| `classic-amrap` | Classic AMRAP |
| `amrap-with-a-time-cap` | AMRAP with a Time Cap |
| `multiple-amraps` | Multiple AMRAPs |
| `whats-next` | What's Next |

---

### EMOM (`/syntax/emom`)

| L3 ID | L3 Label |
|-------|----------|
| `basic-emom` | Basic EMOM |
| `longer-intervals` | Longer Intervals |
| `alternating-emom` | Alternating EMOM |
| `whats-next` | What's Next |

---

### Tabata and Intervals (`/syntax/tabata`)

| L3 ID | L3 Label |
|-------|----------|
| `standard-tabata` | Standard Tabata |
| `custom-intervals` | Custom Intervals |
| `intervals-with-distance` | Intervals with Distance |
| `whats-next` | What's Next |

---

### Rep Schemes (`/syntax/repeaters`)

| L3 ID | L3 Label |
|-------|----------|
| `simple-reps` | Simple Reps |
| `descending-reps-21-15-9` | Descending Reps — (21-15-9) |
| `multiple-sets` | Multiple Sets |
| `whats-next` | What's Next |

---

### Rest Periods (`/syntax/rest`)

| L3 ID | L3 Label |
|-------|----------|
| `explicit-rest-between-sets` | Explicit Rest Between Sets |
| `rest-inside-an-amrap` | Rest Inside an AMRAP |
| `whats-next` | What's Next |

---

### Measurements (`/syntax/measurements`)

| L3 ID | L3 Label |
|-------|----------|
| `weights` | Weights |
| `distances` | Distances |
| `percentages` | Percentages |
| `unknown-load` | Unknown Load |
| `whats-next` | What's Next |

---

### Supplemental Data (`/syntax/supplemental`)

| L3 ID | L3 Label |
|-------|----------|
| `effort-and-rpe` | Effort and RPE |
| `setup-actions` | Setup Actions |
| `progressive-load` | Progressive Load |
| `whats-next` | What's Next |

---

### Complex Workouts (`/syntax/complex`)

| L3 ID | L3 Label |
|-------|----------|
| `nested-protocols` | Nested Protocols |
| `full-training-session` | Full Training Session |
| `barbell-cycling` | Barbell Cycling |
| `partner-workout` | Partner Workout |
| `finish-line` | Finish Line |

---

## Standard Documentation Phrases

When writing inline documentation or markdown prose for a page, use these standard phrases to describe what it does on load:

### Setting the page title
> "On load, this page sets the **page title** to `"<Value>"` in the sticky header bar."

### Registering L3 items (canvas page)
> "On load, this page calls `setLayout('l3', ...)` with its **H2 section headings** as `INavActivation` items. Each section becomes a `RouteQueryAction` scroll anchor visible in the sidebar accordion and right-side TOC panel."

### Registering L3 items (list page)
> "On load, this page calls `setLayout('l3', ...)` with the **10 most recent activity dates** as `RouteQueryAction` items formatted as short month/day/year labels. Activating a date scrolls the list to that group."

### Registering L3 items (editor page)
> "The **page index** is re-registered via `setLayout('l3', ...)` whenever the note content changes. Each heading (`#`, `##`, `###`) becomes a `RouteQueryAction` scroll anchor. WOD blocks gain a `secondaryAction` of type `call` that starts the runtime."

### Setting a subheader
> "On load, this page inserts a **filter strip** in the subheader zone, rendered below the title bar on desktop and as a second sticky bar on mobile."

### Activating L1
> "Navigating to this page activates the **`<id>`** L1 item in the sidebar."

### Activating L2
> "Navigating to this page activates **`<label>`** in the L2 context panel beneath the `<L1>` section."

### No page index
> "This page does not call `setLayout('l3', ...)`. The sidebar accordion and right-side TOC panel are empty while on this page."

---

## Adding a New Canvas Page — Checklist

When adding a new `template: canvas` markdown file, the following navigation values are automatically derived — no code changes required:

- [x] **Route** — set via `route:` frontmatter field
- [x] **Page title** — H1 heading text (after stripping `{...}` attributes)
- [x] **L3 items** — all H2+ headings mapped to `RouteQueryAction { params: { s: id } }` items
- [x] **L2 entry** — auto-added to the `Syntax` group in `appNavTree` by `canvasRoutes` loader
- [x] **L1 activation** — `home` is activated for all `/getting-started` and `/syntax/*` routes

The only manual step is deciding where in the L2 tree the new page should appear, which is controlled by the order of files returned by `canvasRoutes`.

---

## Related Documents

- [`docs/nav-link-inventory.md`](nav-link-inventory.md) — full crosswalk of every link across the three screen-width tiers
- [`docs/NAVIGATION_LAYOUT_PLAN.md`](NAVIGATION_LAYOUT_PLAN.md) — layout plan for mobile / desktop / ultra-wide nav zones
- [`docs/layout.md`](layout.md) — visual layout specification
- [`playground/src/nav/appNavTree.ts`](../playground/src/nav/appNavTree.ts) — L1+L2 static tree definition (implements `INavActivation`)
- [`playground/src/nav/navTypes.ts`](../playground/src/nav/navTypes.ts) — type contracts for `NavItem`, `NavState`, `INavAction`
- [`playground/src/nav/useSetNavL3.ts`](../playground/src/nav/useSetNavL3.ts) — hook used by pages to register L3 items via `setLayout('l3', ...)`

