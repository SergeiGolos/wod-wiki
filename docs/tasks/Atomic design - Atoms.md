# Atomic Design — Atoms

> **Purpose:** Current-state inventory of atom-level components and their Storybook coverage.  
> Use the **Change** column in every table to propose additions, removals, or modifications.  
> Stories live in `stories/catalog/atoms/`.

---

## Component Inventory

| Component | File | Story file | Callers | Status | Change |
|-----------|------|-----------|:-------:|--------|--------|
| Button | `src/components/ui/button.tsx` | `Button.stories.tsx` | 18 | ✅ Stories exist | |
| Card | `src/components/ui/card.tsx` | `Card.stories.tsx` | 4 | ✅ Stories exist | |
| Dialog | `src/components/ui/dialog.tsx` | `Dialog.stories.tsx` | 1 | ✅ Stories exist | |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | `DropdownMenu.stories.tsx` | 6 | ✅ Stories exist | |
| CalendarDatePicker | `src/components/ui/CalendarDatePicker.tsx` | `CalendarDatePicker.stories.tsx` | 4 | ✅ Stories exist | |
| WodPlaygroundButton | `src/components/Editor/md-components/WodPlaygroundButton.tsx` | `WodPlaygroundButton.stories.tsx` | 0 | ⚠️ Story only — no app callers | |
| Badge | `src/components/ui/badge.tsx` | — | 4 | ❌ No story | |
| Label | `src/components/ui/label.tsx` | — | 1 | ❌ No story | |
| Progress | `src/components/ui/progress.tsx` | — | 1 | ❌ No story | |
| CommitGraph | `src/components/ui/CommitGraph.tsx` | — | 2 | ❌ No story | |
| HelpTutorial | `src/components/ui/HelpTutorial.tsx` | — | 0 | 🔴 DEPRECATED — dead code | |

---

## Existing Stories Detail

### Button — `Button.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| Variants | All 6 variants: default, secondary, outline, ghost, destructive, link | |
| Sizes | sm / default / lg / icon sizes side-by-side | |
| States | Disabled state for default and outline variants | |

**Component API surface**

| Prop | Type | Default | Change |
|------|------|---------|--------|
| `variant` | `default \| secondary \| outline \| ghost \| destructive \| link` | `default` | |
| `size` | `default \| sm \| lg \| icon` | `default` | |
| `asChild` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |

---

### Card — `Card.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| Standard Card | Card with header, body, footer and two action buttons | |
| Highlighted Card | Card with primary-tinted border and background | |
| Side-by-Side | Two cards in a responsive 2-column grid | |

**Sub-components used**

| Sub-component | Purpose | Change |
|--------------|---------|--------|
| `CardHeader` | Title + description area | |
| `CardTitle` | Bold heading inside header | |
| `CardDescription` | Muted subtitle inside header | |
| `CardContent` | Main body area | |
| `CardFooter` | Footer row for actions | |

---

### Dialog — `Dialog.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| Dialog | Trigger button → modal with header, body, footer; confirm / cancel | |

**Sub-components used**

| Sub-component | Purpose | Change |
|--------------|---------|--------|
| `DialogTrigger` | Element that opens the dialog | |
| `DialogContent` | Portal-rendered modal container | |
| `DialogHeader` | Title + description area | |
| `DialogTitle` | Modal heading | |
| `DialogDescription` | Muted subtitle | |
| `DialogFooter` | Footer row for actions | |

---

### DropdownMenu — `DropdownMenu.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| DropdownMenu | Trigger button → menu with label, separator, items including destructive | |

**Sub-components used**

| Sub-component | Purpose | Change |
|--------------|---------|--------|
| `DropdownMenuTrigger` | Button that opens menu | |
| `DropdownMenuContent` | Floating menu container | |
| `DropdownMenuLabel` | Non-interactive group label | |
| `DropdownMenuSeparator` | Visual divider | |
| `DropdownMenuItem` | Clickable menu row | |

---

### CalendarDatePicker — `CalendarDatePicker.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| CalendarDatePicker | Month grid with selected date; fixture entry dates bolded | |

**Component API surface**

| Prop | Type | Notes | Change |
|------|------|-------|--------|
| `selectedDate` | `Date \| null` | Highlighted in primary colour | |
| `onDateSelect` | `(date: Date \| null) => void` | Controlled selection callback | |
| `entryDates` | `Date[]` | Bolded in the calendar grid | |

---

### WodPlaygroundButton — `WodPlaygroundButton.stories.tsx`

| Story name | What it shows | Change |
|-----------|---------------|--------|
| Simple workout | Button with 21-15-9 Fran content pre-loaded | |
| AMRAP variant | Button with 20-min AMRAP content pre-loaded | |

**Component API surface**

| Prop | Type | Notes | Change |
|------|------|-------|--------|
| `wodContent` | `string` | WOD-wiki syntax string passed to Playground | |

---

## Missing Stories (candidates)

| Component | Why an atom | Story gap | Change |
|-----------|------------|-----------|--------|
| Badge | Small inline label (variants: default, secondary, destructive, outline) | No story at all | |
| Label | Accessible form field label via Radix | No story at all | |
| Progress | Horizontal progress bar (0–100 value, Radix primitive) | No story at all | |
| CommitGraph | Animated text-in-commit-grid hero visual; many configurable props | No story at all | |
| HelpTutorial | Joyride-based step-by-step overlay; three tutorial types (history, plan, track, review) | No story at all | |
- [ ] add the missing atom stories.


---

## Audit Results

> Run: 2026-04-17. Three parallel audits: component usage, playground/molecule needs, CSS tokens.

### CSS Token Audit

**Design system:** HSL-based mineral palette (light) + Nordic/arctic palette (dark). 31 CSS custom properties.

**Overall score: 82/100** — good token discipline with 8 hardcoded violations.

#### Design tokens

| Token group       | Tokens                                                                                                                               | Change  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Surfaces          | `--background`, `--foreground`, `--card`, `--popover`                                                                                |         |
| Primary / brand   | `--primary`, `--secondary`, `--ring`                                                                                                 |         |
| Semantic states   | `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--border`                                                         |         |
| Metric palette    | `--metric-time`, `--metric-rep`, `--metric-effort`, `--metric-rounds`, `--metric-distance`, `--metric-resistance`, `--metric-action` |         |
| Brand (unused ⚠️) | `brand` tokens (`#5980a8`, `#d6e4f0`, `#3d5c7a`)                                                                                     | [ ] fix |

#### Token usage per atom

| Component | Tokens used | Violations | Change |
|-----------|------------|------------|--------|
| Button | primary, destructive, secondary, accent, background | — | |
| Card | card, card-foreground, border | — | |
| Badge | primary, secondary, destructive, foreground | — | |
| Progress | primary, secondary | — | |
| Label | foreground | — | |
| Dialog | background, accent, ring | `bg-black/80` overlay | |
| DropdownMenu | popover, accent, muted, border | — | |
| CalendarDatePicker | primary, card, border | — | |
| CommitGraph | — | Full palette hardcoded `#1e3a8a … #60a5fa` | |
| HelpTutorial | — | Joyride colors hardcoded `#3b82f6, #1f2937, #ffffff` | |

#### Hardcoded color violations

| File | Issue | Hardcoded value | Should use | Priority | Change |
|------|-------|-----------------|------------|----------|--------|
| `src/index.css:132` | Table border | `#dddddd` | `hsl(var(--border))` | 🟡 Medium | |
| `src/index.css:138` | Table header bg | `#f2f2f2` | `hsl(var(--card))` | 🟡 Medium | |
| `src/index.css:71` | SVG fill | `#3b82f6` | `hsl(var(--primary))` | 🟢 Low | |
| `src/index.css:173` | SVG text | `#FFFFFF` | `hsl(var(--foreground))` | 🟢 Low | |
| `src/index.css:224,234,300` | Blockquote bg | `rgba(128,128,128,0.1)` | `hsl(var(--muted) / 0.1)` | 🟢 Low | |
| `dialog.tsx:22` | Overlay | `bg-black/80` | `bg-background/80` or `--overlay` token | 🟡 Medium | |
| `CommitGraph.tsx:18-19` | Chart palettes | Hex array | Derive from metric tokens | 🟡 Medium | |
| `HelpTutorial.tsx:113-116` | Joyride theme | Hex array | CSS custom properties | 🟡 Medium | |
| `TimelineView.tsx:72` | Dynamic colors | Procedural `hsl(${i * 137.508}…)` | Metric token palette | 🟢 Low | |

#### Unused / dead tokens

| Token | Status | Change |
|-------|--------|--------|
| `brand` color tokens | Defined in tailwind.config.cjs, zero references in code | |
| Missing `--overlay` token | `bg-black/80` pattern used directly in Dialog, not tokenised | |

---

### Playground & Molecule Needs Audit

#### Inline primitives found (not yet atoms)

| Pattern | Location | Priority | Change |
|---------|----------|----------|--------|
| `<kbd>` keyboard shortcut badge | `src/components/list/DefaultListItem.tsx:9-22` | 🔴 High | |
| Capsule / pill label-button | `playground/src/components/HomeHero.tsx:57-63,105-118` | 🔴 High | |
| Status indicator dot (`size-2.5 rounded-full`) | `playground/src/components/MacOSChrome.tsx:11-22`, `review-grid/StatementDisplay.tsx:176` | 🟡 Medium | |
| Overline typography (`text-[10px] font-bold uppercase tracking-wider`) | MetricPill, GridHeader, CalendarWidget, StickyNavPanel | 🟡 Medium | |

#### New atoms to create

| Atom | Extract from | Props sketch | Change |
|------|-------------|-------------|--------|
| `KeyboardKey` | `DefaultListItem` inline `<kbd>` | `children` | |
| `Pill` | `HomeHero` capsule pattern | `children`, `variant?`, `size?` | |
| `StatusDot` | `MacOSChrome` traffic lights | `color`, `size?` | |
| `Overline` | Repeated heading style | `children`, `as?` | |

#### Radix primitives — all properly wrapped ✅

All Radix dependencies are wrapped in `src/components/ui/`: Label → react-label, Progress → react-progress, Dialog → react-dialog, DropdownMenu → react-dropdown-menu. No naked Radix usage found.

#### Molecule / organism dependencies

| Story | Atoms used correctly | Gaps | Change |
|-------|---------------------|------|--------|
| ListView | Badge (via prop), raw buttons | KeyboardKey used inline | |
| MetricPill | Custom pill styling | Could adopt `Pill` atom | |
| MetricTrackerCard | No atom dependencies | — | |
| StickyNavPanel | Button, raw `<div>` | — | |
| ParallaxSection | `<h2>`, `<p>` only | Overline pattern inline | |
| Syntax | Workbench only | — | |
| TimerStackView | Display-only | — | |

---

### Component Usage Audit

Import-site counts across `src/` and `playground/` (excluding story files).

| Component           | Import sites | Callers (non-story)                                                                                                                                                                                                                                                                        | Status                      | Change |
| ------------------- | :----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------ |
| Button              |      18      | ClockAnchor, AudioToggle, CastButton, HistoryLayout, ImportMarkdownDialog, Workbench, NotebookMenu, AddToNotebookButton, CreateNotebookDialog, NotePreview, WorkoutActionButton, WorkoutContextPanel, ListFilter, RuntimeDebugPanel, CollectionsPage, DebugModeContext, CastButtonRpc, App | 🟢 Core — heavily used      |        |
| DropdownMenu        |      6       | HistoryLayout, Workbench, NotebookMenu, AddToNotebookButton, AddWodToNoteDropdown, WorkoutActionButton                                                                                                                                                                                     | 🟢 Active                   |        |
| CalendarDatePicker  |      4       | JournalNavPanel, AddWodToNoteDropdown, NoteDetailsPanel, WorkoutActionButton                                                                                                                                                                                                               | 🟢 Active                   |        |
| Badge               |      4       | ClockAnchor, DigitalClock, Workbench, RuntimeDebugPanel                                                                                                                                                                                                                                    | 🟢 Active                   |        |
| Card                |      4       | ClockAnchor, DigitalClock, visual-state-panel, CollectionsPage                                                                                                                                                                                                                             | 🟢 Active                   |        |
| CommitGraph         |      2       | HistoryLayout, Workbench                                                                                                                                                                                                                                                                   | 🟡 Niche — decoration only  |        |
| Dialog              |      1       | ImportMarkdownDialog                                                                                                                                                                                                                                                                       | 🟡 Low usage                |        |
| Label               |      1       | ClockAnchor                                                                                                                                                                                                                                                                                | 🟡 Low usage                |        |
| Progress            |      1       | ClockAnchor                                                                                                                                                                                                                                                                                | 🟡 Low usage                |        |
| WodPlaygroundButton |      1       | (stories only — no app caller)                                                                                                                                                                                                                                                             | 🔴 Possibly orphaned        |        |
| **HelpTutorial**    |    **0**     | **Never imported outside its own file**                                                                                                                                                                                                                                                    | **🔴 DEPRECATED CANDIDATE** |        |

#### Deprecation analysis

| Component               | Finding                                                                                              | Recommendation                                                | Change                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HelpTutorial            | 0 external imports; defined in `src/components/ui/` but never consumed anywhere in app or playground | **Remove** — dead code                                        |                                                                                                                                                                                                                                                                                                                                          |
| CastCallout             | 0 imports anywhere; `src/components/cast/CastCallout.tsx` not exported or wired up                   | **Remove or implement** — incomplete feature                  |                                                                                                                                                                                                                                                                                                                                          |
| WodPlaygroundButton     | Only in story; not imported in app or playground                                                     | Verify intent — keep if docs-only, move to `stories/_shared/` | - [ ] keep, thisis but and create two varations, combo allowing anyu number of actions to be split uip into two and a secondary version with a dropdown menu and a thrid that support calendar, these are 3 varations on the group button type that should be a (3 basic atoms)  using support for the INavAction to define the buttons. |
| `brand` Tailwind tokens | Defined in config, zero references in any `.tsx`                                                     | Remove from `tailwind.config.cjs`                             |                                                                                                                                                                                                                                                                                                                                          |

---

### Story Quality Notes

| Observation | Affected story | Change |
|-------------|---------------|--------|
| Only one interaction state (disabled) shown for Button | Button.stories.tsx | |
| No loading/spinner state demonstrated | Button.stories.tsx | |
| Calendar fixture dates source (`FIXTURE_ENTRY_DATES`) not documented inline | CalendarDatePicker.stories.tsx | |
| Dialog has no uncontrolled / form-inside variant | Dialog.stories.tsx | |
| DropdownMenu has no checkbox or radio item variants | DropdownMenu.stories.tsx | |
| WodPlaygroundButton has no error / empty content variant | WodPlaygroundButton.stories.tsx | |
