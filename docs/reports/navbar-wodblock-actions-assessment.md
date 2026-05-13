# Navbar & WOD Block Actions — Architecture Assessment
*2026-05-08*

This document records the architectural friction found in the navbar and WOD block
action button systems, proposes deepening opportunities, and defines the target
behaviour for each page context.

---

## 1. Target Behaviour

### 1.1 Navbar (all non-fullscreen pages)

Every page that is not a full-screen template (Tracker, Review) should render the
same three elements in the right side of the navbar:

| Element | Description |
|---------|-------------|
| **NavSearchInput** | Mini text field styled as a search bar ("Search… ⌘/"). Non-editable; clicking or pressing the shortcut opens the command palette. |
| **Cast button** | `CastButtonRpc` — unchanged. |
| **… menu** | `ActionsMenu` dropdown — unchanged. |

**Playground page exception** — the playground page header prepends two extra
controls to the left of the standard trio:

| Element   | Description                                                                                  |
| --------- | -------------------------------------------------------------------------------------------- |
| **Reset** | Reloads the home-page template as a fresh playground.                                        |
| **New**   | Opens the "create new playground" command palette to select what the playground should load. |
|           |                                                                                              |
> important note we should use the group mbuttom molecule for the new rest with +new and reset icon.
### 1.2 WOD block buttons by page context

The inline command bar on every WOD block rendered inside a note varies by the
page context (derived from `PageMode`):

| Context | Buttons |
|---------|---------|
| **Playground** | play, share, add-to-today, add-to-calendar |
| **Journal — before today (history)** | share, add-to-calendar |
| **Journal — today (active)** | play, share, add-to-calendar |
| **Journal — future days (plan)** | open-in-playground, share, add-to-calendar |
| **Feed** | play, open-in-playground, share, add-to-calendar |
| **Collection** | play, open-in-playground, share, add-to-calendar |

---

## 2. Current State

### 2.1 Navbar

`App.tsx` constructs one `<Navbar>` for the mobile slot inside `SidebarLayout`:
workout name + spacer + search `NavbarItem` (icon button + shortcut badge) +
`CastButtonRpc` + `ActionsMenu`.

Each page shell also renders its own `actions=` prop in the **desktop sticky
header** via `NotePageActions` or `PlaygroundNoteActions` — which duplicate the
same search/cast/menu pattern. The controls therefore appear in two different DOM
locations depending on viewport.

The search entry point is a bare `NavbarItem` wrapping `MagnifyingGlassIcon` —
a clickable icon, not a text-field affordance.

### 2.2 WOD block buttons

Every page assembles `WodCommand[]` independently:

| Page | Current commands |
|------|-----------------|
| `PlaygroundNotePage` | `onStartWorkout` only → `NoteEditor` synthesises a single "Run" |
| `JournalPage` | `onStartWorkout` only → `NoteEditor` synthesises "Run" |
| `FeedItemPage` | `onStartWorkout` only → `NoteEditor` synthesises "Run" |
| `WorkoutEditorPage` (collection) | `useMemo` builds `[Now, Today, Plan]` |

No page has "share" or "open in playground" actions. The journal page has no
date-relative mode awareness — it shows "Run" regardless of whether the entry
date is past, today, or future.

---

## 3. Design Context

`docs/design/content-types-architecture.md` already defines the `PageMode` type
and `derivePageMode(source, targetDate)` function, and calls for consolidating
`NON_COLLECTION_CATEGORIES`, `INLINE_RUNTIME_CATEGORIES`, and the route-switch
in `App.tsx`. The implementation has not yet happened. The deepening
opportunities below build on that foundation.

---

## 4. Deepening Opportunities

### Candidate 1 — `NavSearchInput` molecule

**Files involved**
- `playground/src/App.tsx`
- `playground/src/pages/shared/NotePageActions.tsx`
- `playground/src/pages/shared/PlaygroundNoteActions.tsx`

**Problem**
The search interaction surface is a bare icon button. Its interface (click →
open palette) is as complex as its implementation (one callback call). There is
no text affordance on desktop; discoverability is low. The icon + badge assembly
is duplicated in the navbar slot and in each page's desktop header actions, with
no shared component.

**Solution**
A `NavSearchInput` molecule — a non-editable mini text field styled as a search
bar ("Search… ⌘/") that opens the command palette on click or when the shortcut
is pressed. Single prop: `onOpen: () => void`. Replaces the icon-badge pattern
in every location.

**Benefits**
- Locality: one component owns the search visual affordance.
- Leverage: callers reduce from `<NavbarItem onClick={…}><MagnifyingGlassIcon /><ShortcutBadge /></NavbarItem>` to `<NavSearchInput onOpen={…} />`.
- Two distinct adapter sites (navbar mobile slot, desktop header actions) confirm this is a **real seam**.

---

### Candidate 2 — `PageActions` unified component

**Files involved**
- `playground/src/pages/shared/NotePageActions.tsx`
- `playground/src/pages/shared/PlaygroundNoteActions.tsx`
- `playground/src/App.tsx`

**Problem**
Two near-identical files render the same `[search, cast, …]` pattern.
`PlaygroundNoteActions` adds `[New, Reset]`. Each page decides which component
to use based on route inspection. Deletion test: deleting either file concentrates
"which extras appear" into the caller, not away from it. Deleting **both** and
replacing with a mode-driven component concentrates the decision in one place.

**Solution**
A single `PageActions` component accepting `mode: PageMode` and optional
`onReset`/`onNew` callbacks for playground mode.

```
mode === 'playground'         → [New, Reset, NavSearchInput, Cast, …]
mode === any journal/collection → [NavSearchInput, Cast, …]
```

The `mode` comes from `derivePageMode()` (Candidate 4 below).

**Benefits**
- Locality: "which actions does this page have" rule lives in one place.
- Tests assert against mode, not component identity.
- Eliminates the parallel-evolution risk between the two current files.

---

### Candidate 3 — `useWodBlockCommands(mode, handlers)` deep hook

**Files involved**
- `playground/src/pages/WorkoutEditorPage.tsx`
- `playground/src/pages/PlaygroundNotePage.tsx`
- `playground/src/pages/JournalPage.tsx`
- `playground/src/pages/FeedItemPage.tsx`
- `src/components/Editor/NoteEditor.tsx`

**Problem**
Every page independently constructs `WodCommand[]`. Three pages pass no
`commands` prop, relying on `NoteEditor`'s built-in synthesis of a single "Run"
button. One page builds a 3-item array in a `useMemo`. The "what buttons go on a
WOD block" rule is split between `NoteEditor`'s fallback and each page's ad-hoc
memo. Missing actions ("share", "open in playground") would need to be
copy-pasted into each page individually.

**Solution**
A `useWodBlockCommands(mode, handlers)` hook encoding the full action matrix:

```typescript
type WodBlockHandlers = {
  onPlay?:              (block: WodBlock) => void
  onShare?:             (block: WodBlock) => void
  onAddToToday?:        (block: WodBlock) => void
  onAddToCalendar?:     (block: WodBlock, date: Date) => void
  onOpenInPlayground?:  (block: WodBlock) => void
}

function useWodBlockCommands(
  mode: PageMode,
  handlers: WodBlockHandlers,
): WodCommand[]
```

The hook returns only the commands permitted by the mode table in §1.2. Each
page provides only the handlers it can implement; the hook omits buttons whose
handler is absent.

**Benefits**
- Massive locality gain: the full action matrix lives in one function.
- Adding a new action type is one edit in the hook, not changes to 5 page files.
- Interface depth: `(mode, handlers) → WodCommand[]` hides the per-mode
  conditional logic entirely.
- `NoteEditor`'s legacy "Run" synthesis fallback can be removed once all callers
  use the hook.

*Depends on Candidate 4 (PageMode) and Candidate 5 (share + open-in-playground
handlers).*

---

### Candidate 4 — `derivePageMode` implementation

**Files involved**
- `playground/src/pages/shared/pageUtils.ts` (`NON_COLLECTION_CATEGORIES`, `INLINE_RUNTIME_CATEGORIES`)
- `playground/src/App.tsx` (route-based type switch)
- `playground/src/pages/WorkoutEditorPage.tsx`
- `playground/src/pages/JournalPage.tsx`

**Problem**
The design document (`docs/design/content-types-architecture.md`) already defines
`derivePageMode(source, targetDate)` but the code still uses two category-name
sets that encode the same information less precisely. `JournalPage` has no mode
concept — it renders "Run" regardless of the entry's date. The playground page
is not part of the mode system at all.

**Solution**
Create `src/types/content-type.ts` with `ContentSource`, `PageMode`, and
`derivePageMode()` as specified in the design document. Extend `PageMode` with a
`'playground'` variant for the personal-note editor context.

```typescript
export type PageMode =
  | 'playground'
  | 'collection-readonly'
  | 'journal-history'
  | 'journal-active'
  | 'journal-plan'
```

Wire into each page. `JournalPage` derives its mode from the `noteId` date key.
Replace `NON_COLLECTION_CATEGORIES` and `INLINE_RUNTIME_CATEGORIES` with
`derivePageMode` calls.

**Benefits**
- This is the **prerequisite seam** for Candidates 2 and 3.
- Unit-testable with boundary dates (yesterday, today, tomorrow).
- Eliminates string-set membership checks scattered across `pageUtils.ts`.

---

### Candidate 5 — `share` and `open-in-playground` action handlers

**Files involved**
- No files yet — these behaviors do not exist.

**Problem**
The target action matrix (§1.2) includes "share" and "open in playground" but
neither is implemented anywhere. Before building Candidate 3, these handlers
must be defined with clear, testable contracts.

**Solution**

**Share**
Copy a deep link URL to the WOD block's section to the clipboard:
`window.location + ?s=<sectionId>`. The split-button mechanism in
`InlineCommandBar` already supports a secondary icon-action — share maps
directly to the `onSplitClick` / `splitIcon` slots on `WodCommand`.

**Open in playground**
Create a new playground page pre-populated with the WOD block's content and
navigate to it. `createPlaygroundPage(content)` already exists in
`playground/src/services/createPlaygroundPage.ts`. The handler is:

```typescript
async function openBlockInPlayground(block: WodBlock, navigate: NavigateFn) {
  const id = await createPlaygroundPage(block.content)
  navigate(`/playground/${encodeURIComponent(id)}`)
}
```

**Benefits**
- Small, leaf-level handlers with clear interfaces.
- Independently testable before the hook in Candidate 3 is wired.
- Share reuses the existing split-button seam; no new UI components needed.

---

## 5. Recommended Implementation Order

| Step | Candidate | Rationale |
|------|-----------|-----------|
| 1 | **Candidate 4** — `derivePageMode` | Prerequisites: Candidates 2 and 3 both consume `PageMode`. Independently shippable with unit tests only. |
| 2 | **Candidate 5** — share + open-in-playground | Leaf handlers; no dependencies. Can be done in parallel with step 1. |
| 3 | **Candidate 3** — `useWodBlockCommands` | Requires `PageMode` (step 1) and the two new handlers (step 2). |
| 4 | **Candidate 1** — `NavSearchInput` | Independent of 1–3; can be done any time. |
| 5 | **Candidate 2** — `PageActions` | Requires `PageMode` (step 1) and `NavSearchInput` (step 4). Closes the last duplication. |

---

## 6. Files Summary

| File | Role | Change |
|------|------|--------|
| `src/types/content-type.ts` | New — PageMode type + derivePageMode | Create |
| `playground/src/pages/shared/pageUtils.ts` | Category sets → derivePageMode | Refactor |
| `playground/src/pages/JournalPage.tsx` | Add mode derivation | Update |
| `playground/src/pages/PlaygroundNotePage.tsx` | Add playground mode | Update |
| `playground/src/pages/WorkoutEditorPage.tsx` | Replace collectionCommands useMemo with hook | Refactor |
| `playground/src/pages/FeedItemPage.tsx` | Wire useWodBlockCommands | Update |
| `src/components/Editor/NoteEditor.tsx` | Remove "Run" fallback synthesis | Simplify |
| `src/components/Editor/overlays/WodCommand.ts` | No change needed — interface is correct | — |
| `playground/src/hooks/useWodBlockCommands.ts` | New — action matrix hook | Create |
| `playground/src/services/openInPlayground.ts` | New — leaf handler | Create |
| `playground/src/components/NavSearchInput.tsx` | New — mini search input molecule | Create |
| `playground/src/pages/shared/PageActions.tsx` | New — replaces NotePageActions + PlaygroundNoteActions | Create |
| `playground/src/pages/shared/NotePageActions.tsx` | Deprecated by PageActions | Delete |
| `playground/src/pages/shared/PlaygroundNoteActions.tsx` | Deprecated by PageActions | Delete |
