# Archived Clock Stories

**Migration Date**: October 6, 2025
**Feature**: 010-replaceing-the-existing

## Migrated Stories

The following clock stories have been migrated to the new integrated clock + memory visualization format:

### From `ClockAnchor.stories.tsx` → New Stories

| Old Story | New Equivalent | New Category | Duration | Running State |
|-----------|----------------|--------------|----------|---------------|
| `Default` | `MediumCompleted` | Completed Timers | 185,000ms (3:05) | false |
| `Empty` | `MinimumDuration` | Edge Cases | 0ms | false |
| `OneSpanRunning` | `ShortDuration` | Running Timers | 50,000ms (50s) | true |
| `LongDuration` | `VeryLongDuration` | Edge Cases | 2d 3h 45m 10s | false |
| `OneMinute` | `ShortCompleted` | Completed Timers | 60,000ms (1:00) | false |
| `SecondsOnly` | `ShortDuration` | Running Timers | 45,000ms (45s) | true |
| `ZeroDuration` | `MinimumDuration` | Edge Cases | 0ms | false |
| `LongHours` | `VeryLongDuration` | Edge Cases | 1d 23h 59m 59s | false |

## New Story Structure

The old standalone clock stories have been replaced with integrated clock + memory visualization stories organized into three categories:

### 1. Running Timers (`RunningTimers.stories.tsx`)
- ShortDuration (5 seconds)
- MediumDuration (3 minutes)
- LongDuration (15 minutes)
- VeryShortDuration (10 seconds)

### 2. Completed Timers (`CompletedTimers.stories.tsx`)
- ShortCompleted (5 seconds)
- MediumCompleted (3 minutes)
- LongCompleted (1 hour)
- VeryShortCompleted (1.5 seconds)

### 3. Edge Cases (`EdgeCases.stories.tsx`)
- MinimumDuration (1 second)
- VeryLongDuration (24 hours)
- MultipleTimeSpans (pause/resume scenarios)
- ZeroDuration (edge case handling)

## Benefits of Migration

1. **Enhanced Debugging**: Each story now shows both clock display AND timer memory state
2. **Interactive Learning**: Hover highlighting shows correlation between clock and memory
3. **Better Organization**: Stories grouped by logical categories instead of flat list
4. **Comprehensive Coverage**: All original scenarios preserved plus additional edge cases
5. **Memory Visualization**: Developers can see internal timer state (time spans, running state)

## Accessing Old Stories

The original `ClockAnchor.stories.tsx` file is preserved in this archive for reference. All functionality has been migrated to the new integrated stories with enhanced features.

## Implementation Details

- **Component**: `ClockMemoryStory` wrapper combines `ClockAnchor` + `TimerMemoryVisualization`
- **Layout**: Side-by-side panels (clock left, memory right)
- **Interaction**: Hover-based bidirectional highlighting
- **Validation**: Config validation ensures all stories have proper parameters
- **Testing**: Comprehensive contract and integration tests