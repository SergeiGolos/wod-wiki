# History and Timer Diagnostics & Implementation Plan

## Diagnostics Report

Based on the comparison between `docs/history-and-timer.md` and the current codebase (`RuntimeEventLog.tsx`, `TimerDisplay.tsx`), the following gaps have been identified:

### 1. Missing "Ready" / "Idle" State in History
- **Expectation:** The history timeline should show an "Initiated" or "Ready" state when the workout is loaded but not yet started (or in an initial idle block).
- **Current Behavior:** `RuntimeEventLog.tsx` explicitly filters out blocks with type 'idle' (`filter(r => r.type.toLowerCase() !== 'idle')`).
- **Impact:** Users don't see the "Ready" state in the log, and the "Workout Started" event might be misaligned or missing if it depends on non-idle blocks.

### 2. Missing Inherited Metrics in History Items
- **Expectation:** Leaf items (exercises) should display inherited metrics from their parents (e.g., "21x Thrusters" where "21x" comes from the parent round).
- **Current Behavior:** `RuntimeEventLog` renders fragments based on `record.metrics`. If the runtime engine doesn't explicitly copy inherited metrics (like rep counts from a parent RepScheme) down to the leaf execution record, they won't appear.
- **Impact:** Context is lost in the history view (e.g., seeing just "Thrusters" without the rep count).

### 3. "Round 2 Missing" / Grouping Issues
- **Expectation:** All rounds should be visible as section headers.
- **Current Behavior:** The grouping logic in `RuntimeEventLog` relies on `sectionsByBlockId` and `entry.parentId`. If a Round block doesn't emit a persistent "active" or "completed" record that is recognized as a container *before* its children are processed, or if the parent ID mapping is off, the section won't be created or populated correctly.
- **Impact:** Intermediate rounds might be merged into previous ones or appear as flat lists.

### 4. Timer Card Missing "Small Timer"
- **Expectation:** The active card in the timer display should show a small running timer for that specific block (distinct from the main workout timer).
- **Current Behavior:** `ActivityCard` displays metrics and titles but does not include a live timer component. Secondary timers are shown as separate badges above/outside the card.
- **Impact:** Users can't easily see the duration of the *current specific exercise* within the card context.

### 5. Dynamic Control Logic
- **Expectation:** "Next" functionality and other controls should be driven by the active block (especially for Idle/Ready states).
- **Current Behavior:** `TimerDisplay` relies on a `controls` object from memory, but the fallback logic is hardcoded. The `IdleBehavior` needs to correctly populate this `controls` memory to show "Start" or "Next" buttons appropriate for the state.

---

## Implementation Plan

### Phase 1: Fix History Timeline (`RuntimeEventLog.tsx`)

1.  **Enable Idle/Ready Blocks:**
    -   Remove or modify the filter `r.type.toLowerCase() !== 'idle'` in `RuntimeEventLog.tsx`.
    -   Add specific styling/handling for 'idle' type records to appear as "Ready" or "Initiated" sections.

2.  **Improve Grouping Logic:**
    -   Refactor the `sectionsByBlockId` logic to be more robust.
    -   Ensure that any record with children (determined by `parentId`) is treated as a potential section header.
    -   Verify that `LoopCoordinatorBehavior` (or equivalent) emits a proper "start" record for each round that persists in the execution log.

3.  **Visualize Inherited Metrics:**
    -   Investigate `metricsToFragments`.
    -   If `record.metrics` is missing inherited values, we may need to look up the parent chain in `RuntimeEventLog` (using `parentId`) to find relevant context (like Rep Schemes) and merge them into the display fragments. *Alternatively, ensure the Runtime Engine pushes these down, but doing it in the view is safer for now.*

### Phase 2: Enhance Timer Display (`TimerDisplay.tsx`)

1.  **Add Block Timer to Activity Card:**
    -   Modify `ActivityCard` to accept a `startTime` or `duration` prop (or look it up via memory like `SecondaryTimerBadge` does).
    -   Embed a small timer (MM:SS) inside the card layout, perhaps next to the metrics or in the corner.

2.  **Integrate Dynamic Controls:**
    -   Ensure `TimerDisplay` strictly respects the `controls` prop from memory.
    -   Verify `IdleBehavior` (in `src/runtime/behaviors/IdleBehavior.ts` - *need to check if this exists*) sets up the "Start" button correctly.

### Phase 3: Verification

1.  **Manual Test:**
    -   Load a workout with rounds (e.g., Fran).
    -   Verify "Ready" state in history.
    -   Start workout.
    -   Verify "Round 1", "Round 2", etc., appear correctly in history.
    -   Verify "21x", "15x", "9x" are shown on the exercise lines.
    -   Verify the active card shows a small timer counting up for the current exercise.

## Proposed Changes

#### [MODIFY] [RuntimeEventLog.tsx](file:///d:/Dev/wod-wiki/src/components/workout/RuntimeEventLog.tsx)
- Remove `idle` filter.
- Add logic to fetch parent metrics for leaf nodes if missing.
- Refactor grouping to ensure all rounds are captured.

#### [MODIFY] [TimerDisplay.tsx](file:///d:/Dev/wod-wiki/src/components/workout/TimerDisplay.tsx)
- Update `ActivityCard` to render a mini-timer.

#### [MODIFY] [IdleBehavior.ts](file:///d:/Dev/wod-wiki/src/runtime/behaviors/IdleBehavior.ts) (If exists, or create)
- Ensure it pushes correct `RuntimeControls` to memory.
