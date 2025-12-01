# Storybook Components & Test Plan

This document outlines the plan for expanding the Storybook documentation to include the UI, Layout, and Workout components of the WOD Wiki application.

## 1. UI Components (`src/components/ui/`)

These are the fundamental building blocks of the application. They should be tested for rendering variants and basic interactions.

### 1.1 Button (`src/components/ui/button.tsx`)
- **Stories**:
  - `Default`: Standard button.
  - `Variants`: `destructive`, `outline`, `secondary`, `ghost`, `link`.
  - `Sizes`: `default`, `sm`, `lg`, `icon`.
  - `WithIcon`: Button with an icon (using Lucide icons).
  - `Loading` (if applicable) or `Disabled` state.
- **Test Plan**:
  - Verify all variants render with correct styles (visual).
  - Verify click handlers are called.
  - Verify disabled state prevents clicks.

### 1.2 Badge (`src/components/ui/badge.tsx`)
- **Stories**:
  - `Default`: Standard badge.
  - `Variants`: `secondary`, `destructive`, `outline`.
- **Test Plan**:
  - Verify correct background colors for variants.

### 1.3 Card (`src/components/ui/card.tsx`)
- **Stories**:
  - `Simple`: Basic card with content.
  - `Complete`: Card with Header, Title, Description, Content, and Footer.
- **Test Plan**:
  - Verify layout of header, content, and footer.

### 1.4 Dialog (`src/components/ui/dialog.tsx`)
- **Stories**:
  - `Default`: Basic dialog triggered by a button.
  - `CustomContent`: Dialog with form inputs or complex content.
- **Test Plan**:
  - Verify clicking trigger opens dialog.
  - Verify clicking close button or outside closes dialog.

### 1.5 DropdownMenu (`src/components/ui/dropdown-menu.tsx`)
- **Stories**:
  - `Default`: Basic dropdown with items.
  - `WithSeparators`: Dropdown with groups and separators.
  - `Aligned`: Start, Center, End alignment.
- **Test Plan**:
  - Verify clicking trigger opens menu.
  - Verify clicking item calls action and closes menu (if configured).

### 1.6 Label (`src/components/ui/label.tsx`)
- **Stories**:
  - `Default`: Basic label.
  - `WithInput`: Label paired with an input.
- **Test Plan**:
  - Verify label renders correctly.

### 1.7 Progress (`src/components/ui/progress.tsx`)
- **Stories**:
  - `Default`: Progress at 50%.
  - `Animated`: Progress changing over time (using `useEffect` in story).
  - `Full`: 100%.
  - `Empty`: 0%.
- **Test Plan**:
  - Verify progress bar width corresponds to value.

### 1.8 CommitGraph (`src/components/ui/CommitGraph.tsx`)
- **Stories**:
  - `Default`: Standard graph.
  - `CustomText`: Displaying custom text.
  - `CustomColors`: Different themes/colors.
- **Test Plan**:
  - Verify canvas/grid renders.
  - Verify updates when props change.

## 2. Layout Components (`src/components/layout/`)

### 2.1 CollapsibleSection (`src/components/layout/CollapsibleSection.tsx`)
- **Stories**:
  - `Default`: Basic usage.
  - `InitiallyExpanded`: Expanded by default.
  - `Nested`: Collapsible within collapsible.
  - `WithBadgeAndActions`: Showing badges and action buttons in header.
- **Test Plan**:
  - Verify clicking header toggles content visibility.
  - Verify actions in header do not toggle section (propagation stopped).

## 3. Workout Components (`src/components/workout/`)

### 3.1 WorkoutContextPanel (`src/components/workout/WorkoutContextPanel.tsx`)
- **Stories**:
  - `EditMode`: Showing editable statement list with mock statements.
  - `RunMode`: Read-only mode with active statement highlighting.
  - `AnalyzeMode`: Showing completed statements.
  - `Empty`: No block selected.
- **Test Plan**:
  - Verify "Start Workout" button appears in Edit mode.
  - Verify edit/delete callbacks are triggered in Edit mode.
  - Verify no edit buttons in Run/Analyze mode.
  - Verify active highlighting works.

---

## Implementation Status

- [ ] UI Components
- [ ] Layout Components
- [ ] Workout Components
