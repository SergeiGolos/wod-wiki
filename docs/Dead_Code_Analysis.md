# Dead Code and Unused UI Analysis Report

This document identifies potentially dead code, orphaned files, and unused UI components in the WOD Wiki project.

## Summary

- **React Components Found**: 113
- **Orphaned Files Removed**: 28 files deleted
- **Components Without Storybook but Used Internally**: 65

## 1. Deleted Orphaned Files

The following files were identified as orphaned (never imported) and have been removed from the codebase:

### Clock (1 file)
- ~~`src/clock/hooks/useTimerHierarchy.ts`~~ **DELETED**

### Components (6 files)
- ~~`src/components/WorkoutJournal.tsx`~~ **DELETED**
- ~~`src/components/cast/CastButton.tsx`~~ **DELETED**
- ~~`src/components/layout/EditorIndexPanel.tsx`~~ **DELETED**
- ~~`src/components/layout/MobileWorkbench.tsx`~~ **DELETED**
- ~~`src/components/ui/dialog.tsx`~~ **DELETED**
- ~~`src/markdown-editor/components/SmartStatementInput.tsx`~~ **DELETED**

### Core (1 file)
- ~~`src/core/types/global.d.ts`~~ **DELETED**

### Editor (3 files)
- ~~`src/editor/frontmatter/FrontMatterTable.tsx`~~ **DELETED**
- ~~`src/editor/media/MediaWidget.tsx`~~ **DELETED**
- ~~`src/hooks/editor/useMonacoLifecycle.ts`~~ **DELETED**

### Parser (3 files)
- ~~`src/parser/validators/CircularReferenceValidator.ts`~~ **DELETED**
- ~~`src/parser/validators/NestingDepthValidator.ts`~~ **DELETED**
- ~~`src/parser/validators/TimerEventValidator.ts`~~ **DELETED**

### Runtime (9 files)
- ~~`src/runtime/EventHandler.ts`~~ **DELETED**
- ~~`src/runtime/ResultSpanBuilder.ts`~~ **DELETED**
- ~~`src/runtime/StackValidator.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/BlockCompleteEventHandler.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/CompletionTrackingBehavior.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/ParentContextBehavior.ts`~~ **DELETED**
- ~~`src/runtime/hooks/useAnchorSubscription.ts`~~ **DELETED**
- ~~`src/runtime/models/ExecutionRecord.ts`~~ **DELETED**
- ~~`src/views/runtime/RuntimeDebugView.tsx`~~ **DELETED**

### Tools (4 files)
- ~~`src/tools/ExerciseIndexer.ts`~~ **DELETED**
- ~~`src/tools/generateExerciseIndex.ts`~~ **DELETED**
- ~~`src/tools/testIndexer.ts`~~ **DELETED**
- ~~`src/tools/testNameIndexer.ts`~~ **DELETED**

### Views (1 file)
- ~~`src/views/analytics/AnalyticsLayout.tsx`~~ **DELETED**

## 2. Components Missing Storybook Coverage

These components ARE used internally but have no Storybook stories for documentation/testing:

- **ClockAnchor** (`src/clock/anchors/ClockAnchor.tsx`) - used 1 time(s)
- **StackedClockDisplay** (`src/clock/components/StackedClockDisplay.tsx`) - used 2 time(s)
- **TimeUnit** (`src/clock/components/TimeUnit.tsx`) - used 1 time(s)
- **WodScriptVisualizer** (`src/components/WodScriptVisualizer.tsx`) - used 2 time(s)
- **AudioProvider** (`src/components/audio/AudioContext.tsx`) - used 1 time(s)
- **AudioToggle** (`src/components/audio/AudioToggle.tsx`) - used 1 time(s)
- **StatementDisplay** (`src/components/fragments/StatementDisplay.tsx`) - used 2 time(s)
- **Dialog** (`src/components/headless/Dialog.tsx`) - used 2 time(s)
- **DialogContent** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogHeader** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogTitle** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogDescription** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **RuntimeHistoryLog** (`src/components/history/RuntimeHistoryLog.tsx`) - used 1 time(s)
- **AnalyticsIndexPanel** (`src/components/layout/AnalyticsIndexPanel.tsx`) - used 1 time(s)
- **CollapsibleSection** (`src/components/layout/CollapsibleSection.tsx`) - used 1 time(s)
- **PlanPanel** (`src/components/layout/PlanPanel.tsx`) - used 1 time(s)
- **RuntimeProvider** (`src/components/layout/RuntimeProvider.tsx`) - used 6 time(s)
- **SlidingViewport** (`src/components/layout/SlidingViewport.tsx`) - used 1 time(s)
- **TimerIndexPanel** (`src/components/layout/TimerIndexPanel.tsx`) - used 1 time(s)
- **WodIndexPanel** (`src/components/layout/WodIndexPanel.tsx`) - used 3 time(s)
- **WorkbenchProvider** (`src/components/layout/WorkbenchContext.tsx`) - used 1 time(s)
- **ThemeProvider** (`src/components/theme/ThemeProvider.tsx`) - used 2 time(s)
- **ThemeToggle** (`src/components/theme/ThemeToggle.tsx`) - used 3 time(s)
- **CommitGraph** (`src/components/ui/CommitGraph.tsx`) - used 3 time(s)
- **DropdownMenu** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuTrigger** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuContent** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuItem** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuLabel** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuSeparator** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **AnalyzePanelIndex** (`src/components/workbench/AnalyzePanel.tsx`) - used 1 time(s)
- **AnalyzePanelPrimary** (`src/components/workbench/AnalyzePanel.tsx`) - used 1 time(s)
- **TrackPanelIndex** (`src/components/workbench/TrackPanel.tsx`) - used 1 time(s)
- **TrackPanelPrimary** (`src/components/workbench/TrackPanel.tsx`) - used 1 time(s)
- **RefinedTimerDisplay** (`src/components/workout/RefinedTimerDisplay.tsx`) - used 1 time(s)
- **RuntimeDebugPanel** (`src/components/workout/RuntimeDebugPanel.tsx`) - used 1 time(s)
- **DebugButton** (`src/components/workout/RuntimeDebugPanel.tsx`) - used 2 time(s)
- **TimerDisplay** (`src/components/workout/TimerDisplay.tsx`) - used 1 time(s)
- **WorkoutContextPanel** (`src/components/workout/WorkoutContextPanel.tsx`) - used 2 time(s)
- **WorkoutOverlay** (`src/components/workout/WorkoutOverlay.tsx`) - used 1 time(s)
- **WodWiki** (`src/editor/WodWiki.tsx`) - used 3 time(s)
- **BlockquotePreview** (`src/editor/inline-cards/components/BlockquotePreview.tsx`) - used 1 time(s)
- **CardHeader** (`src/editor/inline-cards/components/CardHeader.tsx`) - used 2 time(s)
- **FrontMatterCard** (`src/editor/inline-cards/components/FrontMatterCard.tsx`) - used 1 time(s)
- **HeadingPreview** (`src/editor/inline-cards/components/HeadingPreview.tsx`) - used 1 time(s)
- **ImagePreview** (`src/editor/inline-cards/components/ImagePreview.tsx`) - used 1 time(s)
- **WodBlockCard** (`src/editor/inline-cards/components/WodBlockCard.tsx`) - used 1 time(s)
- **YouTubePreview** (`src/editor/inline-cards/components/YouTubePreview.tsx`) - used 1 time(s)
- **MarkdownEditorBase** (`src/markdown-editor/MarkdownEditor.tsx`) - used 2 time(s)
- **ContextPanel** (`src/markdown-editor/components/ContextPanel.tsx`) - used 1 time(s)
- **EditableStatementList** (`src/markdown-editor/components/EditableStatementList.tsx`) - used 2 time(s)
- **WodBlockManager** (`src/markdown-editor/components/WodBlockManager.tsx`) - used 1 time(s)
- **WorkoutTimerDialog** (`src/markdown-editor/components/WorkoutTimerDialog.tsx`) - used 1 time(s)
- **CompilationPanel** (`src/runtime-test-bench/components/CompilationPanel.tsx`) - used 1 time(s)
- **ControlsPanel** (`src/runtime-test-bench/components/ControlsPanel.tsx`) - used 2 time(s)
- **EditorPanel** (`src/runtime-test-bench/components/EditorPanel.tsx`) - used 1 time(s)
- **MemoryPanel** (`src/runtime-test-bench/components/MemoryPanel.tsx`) - used 2 time(s)
- **MemoryValueDialog** (`src/runtime-test-bench/components/MemoryValuePopover.tsx`) - used 1 time(s)
- **MemoryValueCell** (`src/runtime-test-bench/components/MemoryValuePopover.tsx`) - used 1 time(s)
- **RuntimeStackPanel** (`src/runtime-test-bench/components/RuntimeStackPanel.tsx`) - used 1 time(s)
- **StatusFooter** (`src/runtime-test-bench/components/StatusFooter.tsx`) - used 1 time(s)
- **TestBenchLayout** (`src/runtime-test-bench/components/TestBenchLayout.tsx`) - used 1 time(s)
- **Toolbar** (`src/runtime-test-bench/components/Toolbar.tsx`) - used 1 time(s)
- **TestBenchProvider** (`src/runtime-test-bench/context/TestBenchContext.tsx`) - used 1 time(s)
- **FragmentVisualizer** (`src/views/runtime/FragmentVisualizer.tsx`) - used 5 time(s)

## 3. Recommendations

### Add Storybook Coverage (Low Priority)

These actively-used components should have Storybook stories added:

- `RuntimeProvider` (6 usages)
- `FragmentVisualizer` (5 usages)
- `ThemeToggle` (3 usages)
- `CommitGraph` (3 usages)
- `WodIndexPanel` (3 usages)
- `WodWiki` (3 usages)
- `WodScriptVisualizer` (2 usages)
- `StatementDisplay` (2 usages)
- `ThemeProvider` (2 usages)
- `Dialog` (2 usages)

### Story Implementation Plan

The following table outlines the recommended stories, scenarios, and validation states for each component:

#### 1. RuntimeProvider (`src/components/layout/RuntimeProvider.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Provider wraps child components | Children render correctly |
| WithRuntime | Runtime initialized with valid WodBlock | `runtime` is not null, `isInitializing` is false |
| InitializingState | Runtime is being created | `isInitializing` is true, loading indicator visible |
| ErrorState | Runtime factory throws error | `error` is populated, component displays error state |
| DisposalOnUnmount | Component unmounts with active runtime | Runtime disposed, no memory leaks |
| ReinitializeRuntime | New block passed while runtime exists | Old runtime disposed, new runtime created |

#### 2. FragmentVisualizer (`src/views/runtime/FragmentVisualizer.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Display array of mixed fragments | All fragments render with correct icons/colors |
| EmptyFragments | Empty fragment array | "No fragments to display" message shown |
| WithParseError | Error object provided | Error panel with message, line, column displayed |
| CompactMode | `compact={true}` | Smaller padding, reduced font sizes |
| TimerFragments | Timer-only fragments | ⏱️ icon, orange color scheme |
| RoundsFragments | Rounds-only fragments | 🔄 icon, proper color scheme |
| MixedFragments | Timer + Rounds + Effort + Rep | All fragment types render correctly |

#### 3. ThemeToggle (`src/components/theme/ThemeToggle.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| DarkMode | Theme set to dark | Moon icon visible, sun hidden |
| LightMode | Theme set to light | Sun icon visible, moon hidden |
| SystemMode | Theme follows system preference | Correct icon based on prefers-color-scheme |
| ToggleInteraction | User clicks toggle | Theme switches, icon animates |

#### 4. CommitGraph (`src/components/ui/CommitGraph.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Default text "WOD.WIKI++" | Grid renders with text pattern |
| CustomText | Custom text prop | Text renders in grid pattern |
| DarkTheme | Dark theme active | Blue dark palette (dark → bright) |
| LightTheme | Light theme active | Blue light palette (light → dark) |
| NoRandomness | `randomness={false}` | Only text pixels lit (default adds random background dots) |
| CustomDimensions | Custom rows/cols | Grid dimensions match props |

#### 5. WodIndexPanel (`src/components/layout/WodIndexPanel.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | List of document items | Headers and WOD blocks render |
| EmptyDocument | Empty items array | "Empty document" message shown |
| ActiveBlock | Block marked as active | Active block has ring highlight |
| HoverHighlight | Block hovered | Hovered block has background highlight |
| MobileMode | `mobile={true}` | Larger padding, touch-friendly sizes |
| ParsedState | WOD block with state="parsed" | Green badge shows "parsed" |
| ClickInteraction | User clicks item | `onBlockClick` callback fires |

#### 6. WodWiki (`src/editor/WodWiki.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Empty editor | Monaco editor renders, syntax highlighting active |
| WithCode | Pre-populated workout script | Code displays with proper tokenization |
| ReadOnly | `readonly={true}` | Editor is not editable |
| HighlightedLine | `highlightedLine` prop set | Specific line has decoration |
| WithExerciseProvider | Exercise provider configured | Typeahead suggestions work |
| ValueChange | User edits code | `onValueChange` callback fires with parsed result |

#### 7. WodScriptVisualizer (`src/components/WodScriptVisualizer.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Array of statements | UnifiedItemList renders statements |
| WithActiveStatements | Active statement IDs provided | Active items highlighted |
| WithSelection | Statement selected | Selected item has selection styling |
| CompactMode | `compact={true}` | Reduced spacing and sizes |
| HoverInteraction | User hovers item | `onHover` callback fires |
| EmptyStatements | Empty array | Empty message displays |

#### 8. StatementDisplay (`src/components/fragments/StatementDisplay.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Default | Single statement with fragments | Fragments render via FragmentVisualizer |
| ActiveState | `isActive={true}` | Primary color background highlight |
| GroupedMode | `isGrouped={true}` | No outer border, reduced styling |
| CompactMode | `compact={true}` | Smaller padding |
| WithActions | Custom actions passed | Action buttons render on right |
| ClickableStatement | onClick handler provided | Cursor pointer, click triggers handler |

#### 9. ThemeProvider (`src/components/theme/ThemeProvider.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| DarkTheme | `defaultTheme="dark"` | Document has "dark" class |
| LightTheme | `defaultTheme="light"` | Document has "light" class |
| SystemTheme | `defaultTheme="system"` | Theme follows system preference |
| PersistsToStorage | Theme changed | localStorage updated with new theme |
| CustomStorageKey | Custom `storageKey` prop | Uses custom key in localStorage |

#### 10. Dialog (`src/components/headless/Dialog.tsx`)
| Story | Scenario | Validation State |
|-------|----------|------------------|
| Closed | `open={false}` | Dialog not visible |
| Open | `open={true}` | Dialog visible with backdrop |
| WithContent | Full dialog structure | Title, description, content render |
| CloseOnBackdrop | User clicks backdrop | `onOpenChange(false)` called |
| AnimatedTransition | Dialog opens/closes | Smooth fade and scale animation |
| CustomClassName | Custom className on content | Styles applied correctly |

### Implementation Priority

Based on usage frequency and component complexity, the recommended implementation order is:

1. **High Priority** (Foundation components used across the app):
   - `ThemeProvider` / `ThemeToggle` - Foundation for theming
   - `Dialog` - Used for modals throughout the app
   
2. **Medium Priority** (Core visualization components):
   - `FragmentVisualizer` - Core to workout display
   - `StatementDisplay` - Builds on FragmentVisualizer
   - `WodScriptVisualizer` - Statement collection display
   
3. **Lower Priority** (Context-specific components):
   - `RuntimeProvider` - Requires mocked runtime factory
   - `WodWiki` - Complex Monaco integration
   - `WodIndexPanel` - Document navigation
   - `CommitGraph` - Visual branding element

### Testing Strategy

Each story should validate:

1. **Render States**: Component renders without errors in all scenarios
2. **Visual States**: Correct styling/colors for each state
3. **Interactive States**: User interactions trigger correct callbacks
4. **Edge Cases**: Empty data, error states, loading states
5. **Accessibility**: Keyboard navigation, ARIA attributes where applicable

### File Naming Convention

Stories should follow the existing project pattern, organized by category:
```
stories/{category}/{ComponentName}.stories.tsx
```

Where `{category}` matches existing directories like `components/`, `clock/`, `runtime/`, etc.

Example story structure for `FragmentVisualizer`:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { FragmentVisualizer } from '../../src/views/runtime/FragmentVisualizer';
import { FragmentType } from '../../src/core/models/CodeFragment';

const meta: Meta<typeof FragmentVisualizer> = {
  title: 'Components/Runtime/FragmentVisualizer',
  component: FragmentVisualizer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FragmentVisualizer>;

// Note: ICodeFragment uses both 'type' (string) and 'fragmentType' (enum) fields
// The 'type' field is retained for compatibility but will be replaced by fragmentType
export const Default: Story = {
  args: {
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300000, image: '5:00' },
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
    ]
  }
};

export const EmptyFragments: Story = {
  args: { fragments: [] }
};

export const CompactMode: Story = {
  args: {
    fragments: [
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ],
    compact: true
  }
};
```

---

*Updated after cleanup: 28 orphaned files removed*
