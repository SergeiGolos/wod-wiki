# Integration Contracts: Story Implementation

**Feature**: 010-replaceing-the-existing  
**Date**: October 6, 2025  
**Status**: Complete

## Integration Overview

This document defines the contracts between story files, test utilities, and the Storybook framework. It specifies how stories are structured, configured, and tested.

## 1. Story File Structure Contract

### Purpose
Ensure consistent story file organization across all clock-memory stories.

### Contract

**File Location**: `stories/clock/[story-name].stories.tsx`

**Required Structure**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ClockMemoryStory } from './ClockMemoryStory';

const meta: Meta<typeof ClockMemoryStory> = {
  title: 'Clock/[Category]',
  component: ClockMemoryStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ClockMemoryStory>;

export const StoryName: Story = {
  args: {
    config: {
      durationMs: number,
      isRunning: boolean,
      timeSpans: TimeSpan[] | undefined,
      title: string,
      description: string,
    },
  },
};
```

**Behavioral Requirements**:

1. **MUST export default meta object**
   - Type: `Meta<typeof ClockMemoryStory>`
   - Title format: 'Clock/[Category]'
   - Include 'autodocs' tag

2. **MUST export typed Story type**
   - Type: `StoryObj<typeof ClockMemoryStory>`
   - Based on meta object

3. **MUST export at least one story**
   - Named export (PascalCase)
   - Type: `Story`
   - Include `args` with full config

4. **MUST provide complete config**
   - All required fields present
   - Valid values (no negative durations)
   - Descriptive title and description

5. **MUST use centered layout**
   - Parameter: `layout: 'centered'`
   - Consistent across all stories

**Invariants**:
- Every story file has exactly one default export (meta)
- Story names are unique within the file
- All configs are valid (pass validation)

## 2. Story Configuration Contract

### Purpose
Ensure story configs are valid and consistent.

### Contract

**Configuration Schema**:
```typescript
interface ClockMemoryStoryConfig {
  durationMs: number;      // MUST be > 0
  isRunning: boolean;      // MUST be true or false
  timeSpans?: TimeSpan[];  // OPTIONAL: custom time spans
  title: string;           // MUST be non-empty
  description: string;     // MUST be non-empty
}
```

**Validation Rules**:

1. **durationMs Validation**
   - MUST be positive integer
   - MUST be >= 1000 (1 second minimum)
   - SHOULD be realistic (< 24 hours)
   - Example valid: 5000, 185000, 3600000
   - Example invalid: 0, -100, 0.5

2. **isRunning Validation**
   - MUST be boolean type
   - MUST be true or false (no undefined/null)
   - Example valid: true, false
   - Example invalid: undefined, null, "true"

3. **timeSpans Validation** (if provided)
   - MUST be array or undefined
   - If array: each element MUST have `start` (Date)
   - `stop` can be Date or undefined (for running)
   - Example valid: `[{start: new Date(), stop: undefined}]`
   - Example invalid: `[{start: "2025-01-01"}]`

4. **title Validation**
   - MUST be non-empty string
   - SHOULD be descriptive (> 5 chars)
   - SHOULD use Title Case
   - Example valid: "Timer Running for 5 Seconds"
   - Example invalid: "", " ", "timer"

5. **description Validation**
   - MUST be non-empty string
   - SHOULD explain the scenario (> 20 chars)
   - SHOULD be complete sentence
   - Example valid: "Shows a timer that has been running for 5 seconds with memory visualization."
   - Example invalid: "", "timer", "a timer"

**Error Handling**:
- Invalid configs MUST throw validation error
- Validation happens in TimerTestHarness
- Error message MUST include field name and reason

**Validation Implementation**:
```typescript
function validateConfig(config: ClockMemoryStoryConfig): void {
  if (config.durationMs <= 0) {
    throw new Error(`Invalid durationMs: ${config.durationMs}. Must be > 0.`);
  }
  if (typeof config.isRunning !== 'boolean') {
    throw new Error(`Invalid isRunning: ${config.isRunning}. Must be boolean.`);
  }
  if (!config.title || config.title.trim().length === 0) {
    throw new Error(`Invalid title: "${config.title}". Must be non-empty.`);
  }
  if (!config.description || config.description.trim().length === 0) {
    throw new Error(`Invalid description: "${config.description}". Must be non-empty.`);
  }
  if (config.timeSpans !== undefined) {
    if (!Array.isArray(config.timeSpans)) {
      throw new Error(`Invalid timeSpans: must be array or undefined.`);
    }
    config.timeSpans.forEach((span, index) => {
      if (!(span.start instanceof Date)) {
        throw new Error(`Invalid timeSpans[${index}].start: must be Date.`);
      }
      if (span.stop !== undefined && !(span.stop instanceof Date)) {
        throw new Error(`Invalid timeSpans[${index}].stop: must be Date or undefined.`);
      }
    });
  }
}
```

## 3. Story Category Organization Contract

### Purpose
Maintain consistent story organization in Storybook navigation.

### Contract

**Category Structure**:
```
Clock/
├── Running Timers/
│   ├── Short Duration (< 1 min)
│   ├── Medium Duration (1-10 min)
│   └── Long Duration (> 10 min)
├── Completed Timers/
│   ├── Short Duration
│   ├── Medium Duration
│   └── Long Duration
└── Edge Cases/
    ├── Zero Duration
    ├── Very Long Duration
    └── Multiple Time Spans
```

**Naming Convention**:
- Category: `'Clock/[Category Name]'`
- Story: PascalCase (e.g., `ShortRunningTimer`)
- Title: Title Case (e.g., "Short Running Timer")

**Behavioral Requirements**:

1. **MUST group related stories**
   - All running timers in "Running Timers/"
   - All completed timers in "Completed Timers/"
   - Edge cases in "Edge Cases/"

2. **MUST use consistent titles**
   - Format: `'Clock/[Category]/[Story Name]'`
   - Example: `'Clock/Running Timers/Short Duration'`

3. **SHOULD cover duration ranges**
   - Short: < 60 seconds
   - Medium: 1-10 minutes
   - Long: > 10 minutes

4. **SHOULD include edge cases**
   - Minimum duration (1 second)
   - Maximum reasonable (24 hours)
   - Multiple time spans (paused/resumed)

**Story Count Target**: 10-15 total stories

## 4. Test Story Contract

### Purpose
Ensure stories are testable with Storybook test-runner and visual regression.

### Contract

**Test File Location**: `tests/stories/ClockMemoryStories.test.ts`

**Required Tests**:

1. **Snapshot Tests**
   ```typescript
   describe('Clock Memory Stories', () => {
     stories.forEach((story) => {
       it(`${story.name} matches snapshot`, async () => {
         // Render story
         // Take snapshot
         // Compare to baseline
       });
     });
   });
   ```

2. **Accessibility Tests**
   ```typescript
   it('${story.name} has no a11y violations', async () => {
     // Render story
     // Run axe accessibility scan
     // Assert no violations
   });
   ```

3. **Interaction Tests**
   ```typescript
   it('${story.name} highlights on hover', async () => {
     // Render story
     // Hover over clock
     // Assert memory is highlighted
     // Hover over memory
     // Assert clock is highlighted
   });
   ```

**Behavioral Requirements**:

1. **MUST run for all stories**
   - Iterate over all exported stories
   - Apply tests to each one
   - Report failures per story

2. **MUST verify visual output**
   - Snapshot test captures rendered output
   - Compare against baseline (first run)
   - Flag differences for review

3. **MUST verify accessibility**
   - No WCAG violations
   - Proper heading hierarchy
   - Color contrast meets AA standard

4. **MUST verify interactions**
   - Hover events work
   - Highlight state updates
   - Cleanup on unmount

**Performance Requirements**:
- All tests complete in < 30 seconds
- Individual story test < 2 seconds
- No memory leaks across tests

## 5. Storybook Play Function Contract

### Purpose
Add interactive demonstrations to stories.

### Contract

**Implementation** (optional but recommended):
```typescript
export const InteractiveExample: Story = {
  args: {
    config: {
      durationMs: 5000,
      isRunning: true,
      title: "Interactive Timer",
      description: "Try hovering over the clock or memory sections!",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Wait for components to render
    await waitFor(() => {
      expect(canvas.getByText(/Interactive Timer/i)).toBeInTheDocument();
    });
    
    // Simulate hover on clock
    const clockSection = canvas.getByTestId('clock-section');
    await userEvent.hover(clockSection);
    
    // Verify memory is highlighted
    const memorySection = canvas.getByTestId('memory-section');
    expect(memorySection).toHaveClass('bg-blue-100');
    
    // Unhover
    await userEvent.unhover(clockSection);
    
    // Verify highlight removed
    expect(memorySection).not.toHaveClass('bg-blue-100');
  },
};
```

**Behavioral Requirements**:

1. **SHOULD demonstrate key interactions**
   - Hover behavior
   - State changes
   - Error states

2. **MUST not modify component state permanently**
   - Reset state after play
   - Clean up side effects
   - Don't leave timers running

3. **SHOULD include assertions**
   - Verify expected outcomes
   - Use Storybook testing library
   - Assert on visual changes

**Performance**:
- Play function completes in < 5 seconds
- No infinite loops or hangs
- Proper async handling

## 6. Story Documentation Contract

### Purpose
Provide clear documentation for each story.

### Contract

**Required Documentation** (in story args):

1. **Title**: Clear, descriptive name
   - Example: "Timer Running for 5 Seconds"

2. **Description**: Explains the scenario
   - Example: "Displays a timer that has been actively running for 5 seconds. The memory visualization shows one time span with a start timestamp and no stop timestamp (indicating it's still running)."

3. **Purpose** (optional): Why this scenario matters
   - Example: "Demonstrates the running timer state with accurate memory representation."

**MDX Documentation** (optional but recommended):

Create `stories/clock/ClockMemory.mdx`:
```mdx
import { Meta } from '@storybook/blocks';

<Meta title="Clock/Overview" />

# Clock & Memory Visualization

This collection demonstrates timer displays with memory visualization.

## Features

- Side-by-side clock and memory display
- Interactive hover highlighting
- Multiple timer states (running, completed)
- Edge case coverage

## Usage

Hover over either the clock or memory section to highlight both.

## Architecture

Each story uses:
- `TimerTestHarness` for runtime setup
- `ClockAnchor` for time display
- `TimerMemoryVisualization` for memory state
```

**Behavioral Requirements**:

1. **MUST explain what the story shows**
   - Timer state (running/completed)
   - Duration
   - Memory state

2. **SHOULD explain why it's useful**
   - Testing edge cases
   - Demonstrating features
   - Visual verification

3. **SHOULD link to related docs**
   - Runtime API
   - Memory system
   - Timer behavior

## 7. Story Migration Contract

### Purpose
Ensure existing clock stories are properly replaced.

### Contract

**Stories to Replace** (from `stories/clock/`):
1. `ClockAnchor.stories.tsx` (Default, FiveSeconds, ThreeMinutes, etc.)
2. Any other standalone timer stories

**Migration Requirements**:

1. **MUST preserve all scenarios**
   - If old story shows "5 seconds", new story includes same config
   - If old story shows "completed timer", new story matches
   - Cover all duration ranges

2. **MUST maintain story names** (where possible)
   - Old: `FiveSeconds` → New: `FiveSecondsRunning`
   - Old: `ThreeMinutes` → New: `ThreeMinutesCompleted`
   - Keep naming intuitive

3. **MUST verify equivalence**
   - For each old story, identify corresponding new story
   - Visual comparison (screenshot diff)
   - Behavior comparison (hover not in old stories)

4. **MUST clean up old stories**
   - Archive old story files (move to `__archive__/`)
   - Update imports in other files
   - Remove from Storybook navigation

**Migration Verification**:
```markdown
| Old Story | New Story | Status | Notes |
|-----------|-----------|--------|-------|
| ClockAnchor/Default | Clock/Running Timers/Default | ✅ | Equivalent |
| ClockAnchor/FiveSeconds | Clock/Running Timers/Five Seconds | ✅ | Equivalent |
| ClockAnchor/ThreeMinutes | Clock/Completed Timers/Three Minutes | ✅ | Equivalent |
```

## Integration Tests

### Test File: `ClockMemoryStories.integration.test.tsx`

```typescript
describe('Clock Memory Stories Integration', () => {
  it('all stories render without errors', async () => {
    // Load all stories
    // Render each one
    // Assert no console errors
  });
  
  it('all stories have valid configurations', async () => {
    // Extract configs from all stories
    // Validate each config
    // Assert all pass validation
  });
  
  it('all stories display both clock and memory', async () => {
    // Render each story
    // Assert clock present
    // Assert memory present
  });
  
  it('all stories support hover interaction', async () => {
    // Render each story
    // Simulate hover
    // Assert highlight works
  });
  
  it('story categories are organized correctly', async () => {
    // Load story metadata
    // Assert categories exist
    // Assert stories in correct categories
  });
});
```

## Acceptance Criteria

Integration contracts are met when:

1. ✅ All story files follow structure contract
2. ✅ All configs pass validation
3. ✅ Stories organized in correct categories
4. ✅ All integration tests pass
5. ✅ Story count meets target (10-15)
6. ✅ Old stories archived and replaced
7. ✅ Documentation complete (MDX or inline)
8. ✅ Play functions work (if implemented)

## Next Steps

These contracts guide the implementation of story files. Start with:

1. Create `ClockMemoryStory.tsx` wrapper component
2. Create first story file (e.g., `RunningTimers.stories.tsx`)
3. Add validation to `TimerTestHarness`
4. Write integration tests
5. Migrate remaining stories
6. Archive old story files

Follow test-driven development: write tests first, implement to pass.
