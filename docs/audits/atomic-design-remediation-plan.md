# Atomic Design Remediation Plan — wod-wiki Storybook

> **Created:** 2026-04-21
> **Source:** [atomic-design-audit.md](./atomic-design-audit.md) + [playground-coverage-audit.md](./playground-coverage-audit.md)
> **Framework:** [atomic-design skill](~/.hermes/skills/software-development/atomic-design/SKILL.md) — decision tree, sizing heuristics, anti-patterns, code review checklist

---

## Overview

Two audits found 52 flagged items across the wod-wiki Storybook:

| Source | Flagged | Status |
|--------|---------|--------|
| Classification misalignments | 17 | ✅ 16/17 fixed (git landed), 1 duplicate deleted |
| Playground components missing stories | 17 | ❌ Open |
| Existing stories inadequate | 5 | ❌ Open |
| Orphan catalog entries (not in playground) | 30+ | ⚠️ Acknowledged — expected for component library |
| Anti-patterns in source components | 4 | ❌ Open (refactors) |

This plan addresses all open items organized by the atomic design principle of **building vertical slices** — each phase delivers a complete, usable increment rather than a partial layer.

---

## Phase 0 — Housekeeping (prerequisite) ✅ COMPLETE

Complete these before starting new story work.

### 0.1 Verify classification moves landed cleanly

```bash
cd ~/projects/wod-wiki/wod-wiki
bun run storybook  # smoke test — confirm no broken imports
bun run build-storybook  # full build — confirm no errors
```

### 0.2 Add classification guidelines to AGENTS.md

Prevent future misclassification by adding the decision tree from the atomic-design skill to the project's AI guidelines. Add after the "React & Components" section:

```markdown
### Atomic Design Classification
When creating Storybook stories, classify components using this decision tree:
- Single HTML element, style variants only? → `stories/catalog/atoms/`
- 2-5 atoms doing one specific thing? → `stories/catalog/molecules/`
- Multiple molecules forming a distinct UI section? → `stories/catalog/organisms/`
- Layout skeleton with placeholder content? → `stories/catalog/templates/`
- Real content at a specific URL? → `stories/catalog/pages/`

Sizing heuristics:
- Single Responsibility: describable in one sentence without "and"
- 10-Prop Test: under 10 props
- Rule of Three: used in 2-3+ contexts before abstracting
- Whiteboard Test: explainable in under 30 seconds
```

### 0.3 Clean up orphan catalog entries

The 30+ design system primitives in `playground/src/components/ui/` (alert, avatar, checkbox, etc.) that have no stories and aren't consumed by the playground. These are **available** building blocks but create noise in the catalog.

**Decision needed:** Mark as "available primitives" with a single index story, or leave as-is. The component library value is in having them available even if unused today — this is not a problem to fix, but worth documenting.

**Action:** Add a `stories/catalog/atoms/Primitives.stories.tsx` index story that lists all available primitives with one-line descriptions and variant previews. This turns noise into documentation.

---

## Phase 1 — App Shell Stories (vertical slice: layout + navigation) ✅ COMPLETE

**Goal:** Storybook coverage for the components that wrap every page. These are organisms — complex UI sections composing molecules and atoms.

**Files created:**
- `stories/catalog/atoms/layout/Navbar.stories.tsx` — Navbar + Sidebar primitives
- `stories/catalog/molecules/navigation/SidebarAccordion.stories.tsx`
- `stories/catalog/molecules/navigation/PageNavDropdown.stories.tsx`
- `stories/catalog/molecules/actions/AudioToggle.stories.tsx`
- `stories/catalog/molecules/actions/CastButtonRpc.stories.tsx`
- `stories/catalog/organisms/SidebarLayout.stories.tsx` — 5 variants
- `stories/catalog/organisms/NavSidebar.stories.tsx` — 6 variants with NavProvider

**Atomic design rationale:** SidebarLayout and NavSidebar are organisms (multiple molecules forming distinct UI sections). Navbar and Sidebar are atoms (styled containers with sub-components). SidebarAccordion, PageNavDropdown, AudioToggle, CastButtonRpc are molecules (2-5 atoms doing one specific thing).

### 1.1 Atoms — Navbar + Sidebar

**Story:** `stories/catalog/atoms/Navbar.stories.tsx`
- Navbar: horizontal bar with items, sections, spacers, dividers
- Sidebar: vertical panel with body, header, items, sections, labels
- Variants: collapsed/expanded, with/without dividers, multi-section

**Stories to write:**
- `Default` — standard navbar with items and spacers
- `WithSections` — grouped items under section headers
- `Sidebar` — vertical sidebar with body, header, items
- `SidebarWithAccordion` — sidebar containing SidebarAccordion (preview of composition)

**Testing level:** Snapshot + visual regression (atom level)

### 1.2 Molecules — SidebarAccordion + PageNavDropdown

**Story:** `stories/catalog/molecules/SidebarAccordion.stories.tsx`
- Variants: collapsed, expanded, multi-item, with icons, nested
- Demonstrate: toggle behavior, active state, icon rendering
- Props down, events up: `onToggle` callback

**Story:** `stories/catalog/molecules/PageNavDropdown.stories.tsx`
- Variants: few items, many items (scrollable), active item highlighted
- Demonstrate: dropdown open/close, item selection, current page indicator
- Composes: DropdownMenu + items

**Testing level:** Unit + integration (molecule level)

### 1.3 Molecules — AudioToggle + CastButtonRpc

**Story:** `stories/catalog/molecules/AudioToggle.stories.tsx`
- Variants: muted, unmuted, loading
- Demonstrate: click toggles state, icon changes

**Story:** `stories/catalog/molecules/CastButtonRpc.stories.tsx`
- Variants: disconnected, connecting, connected (with device name)
- Demonstrate: connection states, click-to-cast behavior
- Note: May need mock for CastButtonRpc's network dependency

**Testing level:** Unit (molecule level)

### 1.4 Organisms — SidebarLayout

**Story:** `stories/catalog/organisms/SidebarLayout.stories.tsx`
- This is the **most critical missing story** — the entire app shell
- Variants:
  - `Default` — sidebar + main content area with placeholder
  - `WithNavbar` — sidebar + navbar + content
  - `CollapsedSidebar` — narrow icon-only sidebar
  - `MobileLayout` — responsive mobile view (drawer sidebar)
- Demonstrate: sidebar state management, content area filling, responsive breakpoints
- **Anti-pattern check:** Ensure this doesn't become a god component. If it has 10+ props, consider splitting into `SidebarLayout` (structure) + `SidebarLayoutProvider` (state).

**Testing level:** Integration + responsive (organism level)

### 1.5 Organisms — NavSidebar

**Story:** `stories/catalog/organisms/NavSidebar.stories.tsx`
- Variants:
  - `Default` — all nav sections (Home, Journal, Collections, etc.)
  - `WithActiveRoute` — one item highlighted
  - `Collapsed` — icon-only mode
- Demonstrate: route highlighting, section expansion, nested nav items
- Composes: Sidebar + SidebarAccordion + Navbar items

**Testing level:** Integration + state (organism level)

### Phase 1 deliverable
- 6 new story files
- App shell fully documented in Storybook
- Navbar, Sidebar available as building blocks for higher-level stories

---

## Phase 2 — Content Rendering Stories (vertical slice: canvas + editor overlays) ✅ COMPLETE

**Goal:** Coverage for the core content rendering pipeline — how markdown, editors, and overlay panels compose.

**Files created:**
- `stories/catalog/molecules/chrome/MacOSChrome.stories.tsx` — 5 variants
- `stories/catalog/molecules/content/CanvasProse.stories.tsx` — 6 variants
- `stories/catalog/molecules/overlays/FocusedDialog.stories.tsx` — 5 variants
- `stories/catalog/organisms/RuntimeTimerPanel.stories.tsx` — 5 variants
- `stories/catalog/organisms/MarkdownCanvasPage.stories.tsx` — 2 variants

### 2.1 Molecules — MacOSChrome + CanvasProse

**Story:** `stories/catalog/molecules/chrome/MacOSChrome.stories.tsx`
- Variants: with/without traffic lights, different title bar content
- Demonstrate: styled window frame wrapping any content

**Story:** `stories/catalog/molecules/content/CanvasProse.stories.tsx`
- Variants: short content, long content (scrollable), with frontmatter, with GFM tables, with embedded components (WodPlaygroundButton)
- Demonstrate: markdown rendering, GFM support, component embedding

**Testing level:** Unit + integration (molecule level)

### 2.2 Molecule — FocusedDialog

**Story:** `stories/catalog/molecules/overlays/FocusedDialog.stories.tsx`
- Variants: open/closed, with different content (timer, review grid)
- Demonstrate: fullscreen takeover, dismiss behavior, content rendering
- Note: Used by both FullscreenTimer and FullscreenReview — this is the shared overlay mechanism

**Testing level:** Unit (molecule level)

### 2.3 Organisms — MarkdownCanvasPage

**Story:** `stories/catalog/organisms/MarkdownCanvasPage.stories.tsx`
- Variants:
  - `WithProse` — markdown content with prose sections
  - `WithEmbeddedComponents` — canvas with {{workouts}} and {{timer}} embeds
  - `WithNavigation` — canvas with sticky nav and section highlighting
- Demonstrate: scroll-driven rendering, component embedding, canvas chrome
- Composes: MacOSChrome + CanvasProse + embedded components
- **Anti-pattern check:** This is a complex organism. If story setup requires excessive mocking, consider splitting into `MarkdownCanvas` (rendering) and `CanvasPage` (layout shell — already has a story).

**Testing level:** Integration + visual regression (organism level)

### 2.4 Organism — CommandPalette (playground variant)

**Story:** `stories/catalog/organisms/CommandPalette.stories.tsx` (update existing)
- **Current state:** Story documents `@/components/command-palette/CommandPalette`, not the playground variant
- **Remediation:** Add new stories for `@/components/playground/CommandPalette.tsx`:
  - `PlaygroundDefault` — opens with Cmd+K, shows grouped commands
  - `PlaygroundWithStrategy` — strategy-aware input switching
  - `PlaygroundEmptyState` — no matching commands
  - `DialogIntegration` — demonstrates Headless Dialog wrapper, backdrop dismiss, focus trap
- Keep existing `CommandListView` stories — they document the list organism independently

**Testing level:** Integration + keyboard interaction (organism level)

### 2.5 Existing story update — RuntimeTimerPanel (standalone)

**Story:** `stories/catalog/organisms/RuntimeTimerPanel.stories.tsx` (new)
- Currently only visible inside FullscreenTimer — never shown standalone
- Variants:
  - `TimerOnly` — single timer block (e.g., "10:00 Run")
  - `MultiBlock` — stacked timer blocks (e.g., AMRAP: "10:00 Run, 5:00 Rest")
  - `WithMetrics` — timer with metric overlays (reps, rounds, calories)
  - `Paused` — paused state
  - `Complete` — completed state with summary
- Demonstrate: block stacking, metric display, state transitions

**Testing level:** Integration + state (organism level)

### Phase 2 deliverable
- 5 new story files + 1 updated
- Content rendering pipeline fully documented
- Editor overlay composition documented

---

## Phase 3 — Page-Level View Stories (vertical slice: journal + collections + home) ✅ COMPLETE

**Files created/updated:**
- `stories/catalog/templates/HomeHero.stories.tsx` — 3 variants (Default, Mobile, Tablet)
- `stories/catalog/templates/JournalDateScroll.stories.tsx` — 5 variants (Empty, FewItems, ManyItems, WithJournalEntries, WithCreateEntry)
- `stories/catalog/templates/CollectionWorkoutsList.stories.tsx` — 4 variants (GirlsCollection, HeroesCollection, EmptyCollection, MixedCategoryItems)
- `stories/catalog/molecules/TextFilterStrip.stories.tsx` — 4 variants (Default, CustomPlaceholder, CustomParam, AutoFocused)
- `stories/catalog/pages/Collections.stories.tsx` — added `PlaygroundCollections` story; renamed old to `WorkbenchCollections`
- `stories/catalog/pages/Planner.stories.tsx` — added 3 NoteEditor stories; renamed legacy PlanPanel stories as deprecated
- `stories/catalog/molecules/StickyNavPanel.stories.tsx` — added `InsideCanvasPage` scroll context story

**Goal:** Coverage for the view-level components that compose organisms into page-like experiences. These bridge templates and pages.

### 3.1 Template — HomeHero

**Story:** `stories/catalog/templates/HomeHero.stories.tsx`
- Variants: default landing, with featured workout, with stats summary
- Demonstrate: hero section composition, CTA behavior, responsive layout
- **Atomic design note:** This is a template — it defines the layout skeleton for the home page's hero section. It should use placeholder/mock content, not real data.

**Testing level:** Layout validation (template level)

### 3.2 Template — JournalDateScroll

**Story:** `stories/catalog/templates/JournalDateScroll.stories.tsx`
- Variants: empty state, few entries, many entries (scroll), date-grouped, with loading indicator
- Demonstrate: infinite scroll behavior, date grouping, sticky date headers
- **Anti-pattern check:** If this requires heavy IO mocking, extract the scroll logic into a hook and test that separately. The story should focus on rendering behavior.

**Testing level:** Layout validation + scroll behavior (template level)

### 3.3 Molecule — TextFilterStrip

**Story:** `stories/catalog/molecules/TextFilterStrip.stories.tsx`
- Variants: empty, with text, with clear button, URL-synced
- Demonstrate: input → filter state, clear behavior, URL param sync

**Testing level:** Unit (molecule level)

### 3.4 Template — CollectionWorkoutsList

**Story:** `stories/catalog/templates/CollectionWorkoutsList.stories.tsx`
- Variants: empty collection, few workouts, many workouts, with search filter active
- Demonstrate: workout listing, filtering, grouping within collection canvas
- Composes: QueriableListView → FilteredList + FuzzySearchQuery

**Testing level:** Layout validation (template level)

### 3.5 Existing story updates — Collections + Planner

**Collections page story** (`stories/catalog/pages/Collections.stories.tsx`)
- **Current:** Uses `CollectionBrowsePanel` (workbench component, not playground's actual page)
- **Remediation:** Replace or add a `PlaygroundCollections` story that uses the actual `CollectionsPage` from `playground/src/views/CollectionsPage.tsx` with `TextFilterStrip` and grouped category layout
- Keep existing story as `WorkbenchCollections` for internal documentation

**Planner page story** (`stories/catalog/pages/Planner.stories.tsx`)
- **Current:** Uses legacy `PlanPanel` not used in playground
- **Remediation:** Rename to `NoteEditor` or add a `PlaygroundPlanner` story using `JournalPageShell` + `NoteEditor` (the actual playground pattern)
- Add deprecation note to legacy `PlanPanel` story if keeping it

**StickyNavPanel story** (`stories/catalog/molecules/StickyNavPanel.stories.tsx`)
- **Current:** Good standalone coverage but missing canvas context
- **Remediation:** Add a `InsideCanvasPage` story that wraps StickyNavPanel in a CanvasPage shell to demonstrate scroll observation and section highlighting

### Phase 3 deliverable
- 4 new story files + 3 updated
- All playground pages have representative Storybook stories
- View-level composition patterns documented

---

## Phase 4 — Source Component Refactors (anti-pattern fixes) ✅ COMPLETE

**Goal:** Fix the 4 anti-patterns identified in the classification audit. These are source code changes, not Storybook changes.

### 4.1 MetricSourceRow — 10-Prop Test failure (18 props)

**Anti-pattern:** God component tendency — too many responsibilities on one component.

**Remediation options (pick one):**
1. **Props object pattern** — Collapse 18 props into 3-4 config objects:
   ```tsx
   interface MetricSourceRowProps {
     source: MetricSourceConfig;      // id, name, type, indentation
     metrics: MetricDisplayConfig[];   // visualizer data, allowed types
     actions: MetricSourceActions;     // onClick, onDoubleClick, onHover
     state: MetricSourceState;         // selected, highlighted, leaf, header
   }
   ```
2. **Decompose into sub-molecules** — Extract `MetricSourceIndent`, `MetricSourceActions`, `MetricSourceDuration` as separate molecules composed by MetricSourceRow.

**Recommendation:** Option 1 (props object) — lower risk, maintains existing story structure. Option 2 only if the sub-molecules have independent reuse value (Rule of Three).

**Story update:** After refactor, update `MetricSourceRow.stories.tsx` to show the new props pattern.

### 4.2 WorkoutActionButton — God component misclassified as atom (already moved to organisms)

**Status:** ✅ Story moved to `organisms/` in Phase 0.

**Remaining work:** Review the source component for decomposition opportunities:
- 3 internal states (`open`, `entryDates`, `loading`) could be extracted into a `useCalendarEntryDates` hook
- The async data loading logic is tightly coupled to the UI — consider separating data fetching from presentation
- If it composes CalendarCard (molecule) + DropdownMenu (atom) + Button (atom), it's correctly an organism

**Recommendation:** No structural change needed now. The classification move was the fix. Flag for future review if more states are added.

### 4.3 Inline component definitions in stories

**Anti-pattern:** Several story files (CommandInput, CommandPill, VisibilityBadge, ShortcutBadge, GridHeaderCell) inline their component definitions rather than importing from `src/`. These are story-only replicas.

**Remediation:** For each:
1. Check if a production component exists in `src/components/` that matches
2. If yes — import the production component instead of inlining
3. If no — the story is documenting a component that only exists in Storybook. Either:
   - Extract it to `src/components/` as a proper component (if it has reuse value)
   - Add a comment in the story explaining it's a Storybook-only concept demo

**Components to audit:**
- `CommandInput` — likely has a production counterpart
- `CommandPill` — likely has a production counterpart
- `VisibilityBadge` — check `src/components/`
- `ShortcutBadge` — check `src/components/`
- `GridHeaderCell` — check `src/components/`

### 4.4 Duplicate/legacy story cleanup

**Already done:** MetricPill duplicate deleted.

**Remaining:**
- `PlanPanel` in Planner story — legacy, not used in playground. Add deprecation note or remove.
- `CollectionBrowsePanel` in Collections story — not used in playground. Keep as workbench documentation but add `PlaygroundCollections` variant.

---

## Phase 5 — Validation & Guardrails

**Goal:** Ensure the remediated Storybook stays clean going forward.

### 5.1 Storybook smoke test

```bash
bun run storybook          # visual check
bun run build-storybook    # full build — zero errors
bun run test:storybook     # automated Storybook tests (if configured)
```

### 5.2 Coverage verification

After all phases, re-run the coverage audit to confirm:
- All 17 previously missing components now have stories
- All 5 inadequate stories are updated
- No new misclassifications introduced

### 5.3 Add atomic design check to CI

Add a lightweight script that validates new story files are placed in the correct atomic design folder based on the component they import:

```bash
# scripts/check-story-classification.sh
# Warns if a story in atoms/ imports components from molecules/ or organisms/
# Warns if a story in pages/ doesn't import from templates/ or organisms/
```

### 5.4 Update atomic-design skill

After completing all phases, update the skill with:
- wod-wiki-specific examples at each level
- The classification decision tree with concrete project examples
- Anti-patterns found and fixed in this project

---

## Execution Order & Dependencies

```
Phase 0 (housekeeping)
  └── Phase 1 (app shell) ← no dependencies
  └── Phase 2 (content rendering) ← no dependencies
  └── Phase 3 (page views) ← depends on Phase 1 (SidebarLayout for context)
  └── Phase 4 (source refactors) ← independent, can run anytime
  └── Phase 5 (validation) ← depends on all above
```

Phases 1, 2, 3, and 4 can run in parallel. Phase 5 is the final gate.

---

## Summary — Work Items by Phase

| Phase | New Stories | Updated Stories | Source Refactors | Est. Files Touched |
|-------|------------|-----------------|------------------|-------------------|
| 0 — Housekeeping | 1 (Primitives index) | 0 | 0 | 3 |
| 1 — App Shell | 6 | 0 | 0 | 6 |
| 2 — Content Rendering | 5 | 1 (CommandPalette) | 0 | 6 |
| 3 — Page Views | 4 | 3 (Collections, Planner, StickyNavPanel) | 0 | 7 |
| 4 — Source Refactors | 0 | 1 (MetricSourceRow) | 4 anti-patterns | 6 |
| 5 — Validation | 0 | 0 | 0 | 2 |
| **Total** | **16** | **5** | **4** | **30** |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Story mocking complexity (providers, contexts, routers) | Create shared story decorators (`withProviders`, `withRouter`) in `stories/preview.tsx` or `stories/decorators/` |
| Breaking existing stories during refactors | Run `bun run build-storybook` after each phase |
| Over-engineering stories for one-off components | Apply Rule of Three — if a component is used once, a basic story suffices |
| Phase 4 refactors breaking playground | Refactors are internal to components — stories validate behavior before and after |
| CI/classification script false positives | Start as warnings-only, tune thresholds based on results |
