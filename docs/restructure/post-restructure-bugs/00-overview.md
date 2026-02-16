# Post-Restructure Bug Fix User Stories

These user stories address bugs discovered after the behavior restructure (Phases 0–7). Each story identifies the root cause with specific code references, the goal, and the expected fix.

## Stories

| Story | Bug | Root File(s) | Severity |
|-------|-----|-------------|----------|
| [Story 1](story-1-remove-timer-column.md) | Timer column duplicates Spans column | `gridPresets.ts`, `ReportOutputBehavior.ts` | Low |
| [Story 2](story-2-elapsed-total-double-write.md) | Double-write of elapsed/total to fragment:result | `TimerBehavior.ts`, `ReportOutputBehavior.ts`, `SessionRootBlock.ts` | Medium |
| [Story 3](story-3-duration-nan.md) | Duration shows "NaN:NaN" | `GridRow.tsx`, `useGridData.ts`, `AnalyticsTransformer.ts` | Low |
| [Story 4](story-4-round-tracking.md) | Round counter stuck at 1 | `ChildSelectionBehavior.ts`, `ReEntryBehavior.ts`, `SessionRootBlock.ts` | High |
| [Story 5](story-5-timer-completion.md) | Timer at zero, block never pops | `TimerEndingBehavior.ts`, `ChildrenStrategy.ts`, `ChildSelectionBehavior.ts` | High |

## Recommended Fix Order

1. **[Story 4](story-4-round-tracking.md)** (Round tracking) — fixes the `shouldLoop` bug and behavior ordering, which is a prerequisite for Story 5
2. **[Story 5](story-5-timer-completion.md)** (Timer completion) — depends on Story 4's `shouldLoop` fix to prevent children dispatch after completion
3. **[Story 2](story-2-elapsed-total-double-write.md)** (Double-write) — requires behavior reordering from Story 4 and Timer cleanup
4. **[Story 3](story-3-duration-nan.md)** (Duration NaN) — independent, can be done in parallel with Stories 4/5
5. **[Story 1](story-1-remove-timer-column.md)** (Timer column removal) — independent, can be done in parallel with any story

## Dependency Graph

```
Story 4 (Round tracking)
    │
    ├── Story 5 (Timer completion) — depends on shouldLoop fix
    │
    └── Story 2 (Double-write) — depends on behavior reordering
    
Story 3 (Duration NaN) — independent
Story 1 (Timer column) — independent
```
