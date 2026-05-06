										# Atomic Design Audit — wod-wiki Storybook

> **Analyzed:** 2026-04-21
> **Scope:** All 38 Storybook entries across `stories/catalog/{atoms,molecules,organisms,templates,pages}/`
> **Method:** Source code inspection of each component's props, composition, internal state, and behavioral complexity against atomic design classification rules.

---

## Summary

| Classification | Total | Correct | Misclassified                                         |
| -------------- | ----- | ------- | ----------------------------------------------------- |
| **Atoms**      | 25    | 11      | **14**                                                |
| **Molecules**  | 6     | 2       | **4** (2 should be organisms, 1 duplicate, 1 missing) |
| **Organisms**  | 3     | 3       | 0                                                     |
| **Templates**  | 8     | 8       | 0                                                     |
| **Pages**      | 4     | 4       | 0                                                     |

**17 misclassifications found.** The `atoms/` folder is heavily overloaded — it contains components that are clearly molecules (composing 2+ atoms) and one organism. The root cause is likely that "atom" was used as a catch-all for "anything that isn't a full page section."

---

## Misclassifications

### Atoms → Should be Molecules (14)

These components compose multiple atoms into a functional unit. They fail the atom test: *"Single HTML element, style variants only, no behavioral logic."*

| Component | Current | Should Be | Why |
|-----------|---------|-----------|-----|
| **CommandItem** (DefaultListItem) | atom | **molecule** | Composes 5+ atoms: leading icon, label+subtitle, badge, ShortcutBadge (kbd), action buttons. Has interactive states (active, selected, disabled). |
| **CommandInput** | atom | **molecule** | Composes 3 elements: Search icon + text input + Esc kbd badge. A composed row, not a single element. |
| **MetricVisualizer** | atom | **molecule** | Has data transformation logic (useMemo filtering, type overrides, name overrides), error/empty state rendering, 3 size variants. Data-driven rendering, not just style variants. |
| **StatementDisplay** | atom | **molecule** | Composes MetricVisualizer (itself a molecule) into a statement container with active/grouped/compact states and actions slot. Also exports BlockDisplay (13 props) and MetricList. |
| **CommandPill** | atom | **molecule** | Composes 2 buttons + divider. Has internal state (`splitOk`) for success flash animation with setTimeout. Async split-click handler. |
| **ResultListItem** | atom | **molecule** | Composes 4 elements: timestamp column (ClockIcon + text), status icon (CheckCircleIcon), title heading, subtitle paragraph. Classic list item molecule. |
| **GridHeaderCell** | atom | **molecule** | HeaderCell composes icon + label + SortIndicator + graph toggle button (4 elements). FilterCell composes th + input. AddColumnButton has internal state (open) with click-outside detection. |
| **ButtonGroup** | atom | **molecule** | Composes 2 buttons + divider into a two-sided pill. Has action execution logic (`fireAction`) dispatching nav actions. |
| **ButtonGroupDropdown** | atom | **molecule** | Composes button + DropdownMenu (Content, Items, Separators) + divider + ChevronDown icon. Action dispatch logic. |
| **CalendarSplitButton** | atom | **molecule** | Composes button + CalendarCard (itself a molecule) + DropdownMenu. 2 pieces of internal state (`open`, `triggerRef`). Uses `usePopoverAlign` hook. |
| **CalendarButton** | atom | **molecule** | Composes DropdownMenu + CalendarCard (molecule) + CalendarDays icon. 2 pieces of internal state. Date formatting logic. |
| **CalendarCard** | atom | **molecule** | Internal state (`viewDate`), month navigation, date selection, computed calendar grid (useMemo), entry dot indicators, today highlighting. ~180 lines. Fully interactive calendar widget. |
| **CommitGraph** | atom | **molecule** | Uses canvas API for text-to-pixel conversion. 2 pieces of internal state (`gridData`, `resolvedTheme`). useEffect for theme resolution. Random grid generation. ~152 lines. |
| **MetricSourceRow** | atom | **molecule** | Composes MetricVisualizer (molecule) + indentation + duration column + actions slot. **18 props** with click/double-click/hover handlers. |

### Atoms → Should be Organisms (1)

| Component | Current | Should Be | Why |
|-----------|---------|-----------|-----|
| **WorkoutActionButton** | atom | **organism** | Composes molecules (Button, CalendarCard, DropdownMenu). 3 pieces of internal state (`open`, `entryDates`, `loading`). Async data loading from provider. Complex split-button UX with date picking and loading states. 8 props. |

### Molecules → Should be Organisms (2)

| Component | Current | Should Be | Why |
|-----------|---------|-----------|-----|
| **CommandPalette** | molecule | **organism** | Composes Dialog + Command system (Input/List/Empty/Group/Item). Data transformation (filtering, normalizing, grouping). Keyboard event handling. Context usage (`useCommandPalette`). Full interactive feature section. |
| **ListView** | molecule | **organism** | 10+ props. Complex internal state via `useListState` (selectedIds, activeId, query, visibleItems, groups). Router hooks (`useNavigate`, `useSearchParams`). Search, grouping, multi-select, keyboard navigation, custom renderers. |

### Duplicate Story (1)

| Component | Location | Issue |
|-----------|----------|-------|
| **MetricPill** | `molecules/MetricPill.stories.tsx` | Exact duplicate of `atoms/MetricPill.stories.tsx` — imports the same `@/components/review-grid/MetricPill`. Single-element presentational badge correctly classified as atom. The molecules/ copy should be removed. |

---

## Correctly Classified

### Atoms (11) ✅
Button, Label, Badge, Card, Progress, Dialog, DropdownMenu, MetricPill, VisibilityBadge, ShortcutBadge — all single-element presentational components or thin Radix/shadcn primitive wrappers.

### Molecules (2) ✅
- **StickyNavPanel** — Composes buttons into a nav bar with active state. Single responsibility.
- **MetricTrackerCard** — Renders session analytics as floating metric bubbles. One specific thing.

### Organisms (3) ✅
- **TimerStackView** — 17+ props, SVG timer ring, transport controls, gesture support, spatial navigation. ~286 lines.
- **Syntax** — Full editor workbench with plan/track/review panels.
- **ParallaxSection** — IntersectionObserver-based scroll section with responsive layout. ~187 lines.

### Templates (8) ✅
All Tracker (Mobile/Web/Chromecast), Review (Mobile/Web/Chromecast), and NoteEditor (Mobile/Web) — layout skeletons with placeholder content.

### Pages (4) ✅
JournalPageShell, Collections, Planner, Calendar — specific instances with route-specific data.

---

## Anti-Patterns Detected

### 1. Over-fragmentation of the "Atom" Label
The `atoms/` folder has become a dumping ground for anything that isn't obviously a page section. 14 of 25 entries (56%) are actually molecules. This dilutes the usefulness of the Storybook navigation — a developer looking for primitive building blocks has to sift through complex interactive components.

### 2. MetricSourceRow Fails the 10-Prop Test
18 props is nearly double the threshold. This component manages indentation, metrics visualization, duration, action slots, interactive states, and event handlers. It should either be split or accept a config object to reduce prop surface area.

### 3. WorkoutActionButton is a God Component Misclassified as an Atom
8 props, 3 internal states, async data loading, composes 3 other components — classified as the most basic level. This is the most severe misclassification. It's an organism that was put in atoms.

### 4. Duplicate MetricPill Story
The same component appears in both `atoms/` and `molecules/`. The molecules/ version adds no additional stories or context — it's a straight duplicate.

---

## Suggested Updates

### File Moves

```
# Atoms → Molecules
stories/catalog/atoms/CommandItem.stories.tsx      → stories/catalog/molecules/
stories/catalog/atoms/CommandInput.stories.tsx      → stories/catalog/molecules/
stories/catalog/atoms/MetricVisualizer.stories.tsx   → stories/catalog/molecules/
stories/catalog/atoms/StatementDisplay.stories.tsx   → stories/catalog/molecules/
stories/catalog/atoms/CommandPill.stories.tsx        → stories/catalog/molecules/
stories/catalog/atoms/ResultListItem.stories.tsx     → stories/catalog/molecules/
stories/catalog/atoms/GridHeaderCell.stories.tsx     → stories/catalog/molecules/
stories/catalog/atoms/ButtonGroup.stories.tsx        → stories/catalog/molecules/
stories/catalog/atoms/ButtonGroupDropdown.stories.tsx → stories/catalog/molecules/
stories/catalog/atoms/CalendarSplitButton.stories.tsx → stories/catalog/molecules/
stories/catalog/atoms/CalendarButton.stories.tsx     → stories/catalog/molecules/
stories/catalog/atoms/CalendarCard.stories.tsx       → stories/catalog/molecules/
stories/catalog/atoms/CommitGraph.stories.tsx        → stories/catalog/molecules/
stories/catalog/atoms/MetricSourceRow.stories.tsx    → stories/catalog/molecules/

# Atoms → Organisms
stories/catalog/atoms/WorkoutActionButton.stories.tsx → stories/catalog/organisms/

# Molecules → Organisms
stories/catalog/molecules/CommandPalette.stories.tsx → stories/catalog/organisms/
stories/catalog/molecules/ListView.stories.tsx       → stories/catalog/organisms/

# Duplicate removal
stories/catalog/molecules/MetricPill.stories.tsx      → DELETE
```

### After Moves — Expected Distribution

| Classification | Before | After |
|---------------|--------|-------|
| **Atoms** | 25 | **11** |
| **Molecules** | 6 | **17** |
| **Organisms** | 3 | **6** |
| **Templates** | 8 | 8 |
| **Pages** | 4 | 4 |

---

## Recommendations

1. **Move files first, fix imports second.** Storybook uses file-system routing, so moves may break `import.meta` references in some story files. Verify with `bun run storybook` after each batch.

2. **Consider splitting MetricSourceRow.** At 18 props, it's the clearest candidate for decomposition. The indentation logic, metrics visualization, and action slot could be separated.

3. **Audit inline component definitions.** Several story files (CommandInput, CommandPill, VisibilityBadge, ShortcutBadge, GridHeaderCell) inline their component definitions rather than importing from `src/`. These are story-only replicas, not the production component. Consider whether the production component should be the story's subject instead.

4. **Add classification guidelines to AGENTS.md.** To prevent future misclassification, add a section to `AGENTS.md` with the decision tree from the atomic-design skill.
