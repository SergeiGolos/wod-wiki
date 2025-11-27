# Timer System Redesign Proposal

## Overview
The current timer system is limited to a single active clock and lacks features for tracking total running time, current segments, and dynamic interactions. This proposal outlines a redesign to support a multi-clock architecture with enhanced memory tracking and visualization capabilities, grounded in the existing **WOD Wiki Syntax** and **Runtime Architecture**.

## Goals
1.  **Multi-Clock Support:** Allow multiple timers to run concurrently or be tracked independently.
2.  **Total Running Time:** Track the aggregate time across all segments/timers.
3.  **Current Segment Tracking:** Clearly identify and visualize the active segment (e.g., specific round, rest period).
4.  **Dynamic UI Interactions:** Enable setting and removing buttons dynamically based on events (e.g., "Next" button).
5.  **Memory-Based Targeting:** Leverage the memory space to target specific timers or segments.

## Architectural Changes

### 1. Memory Model Enhancements
The `RuntimeMemory` and `TimerBehavior` interaction needs to be expanded. Currently, `TimerBehavior` allocates `TIME_SPANS` and `IS_RUNNING` for a specific block key.

**Proposed Structure:**

*   **Global Timer Registry:** A dedicated memory location to track all active/registered timer references.
*   **Hierarchical Time Context:**
    *   **Global Clock:** Tracks the total workout time.
    *   **Segment Clock:** Tracks the current active block (e.g., an interval or round).
    *   **Child Clocks:** For nested structures.

**New Memory Types (candidates):**
*   `timer:registry`: List of active timer block IDs.
*   `timer:config`: Configuration for a timer (label, direction, duration).
*   `timer:state`: Current state (running, paused, completed, elapsed).
*   `ui:buttons`: Dynamic button configurations.

### 2. Timer Behavior & Runtime
The `TimerBehavior` (in `src/runtime/behaviors/TimerBehavior.ts`) should be decoupled from just "one" timer. It needs to be aware of its role (Global vs. Local).

*   **RuntimeTick:** The main loop (`ScriptRuntime.tick`) or a dedicated service should manage the "master" time and propagate it.
*   **Targeting:** Actions should be able to target timers by ID or Label using the `[:Action]` syntax.

#### WOD Syntax Integration

**Defining Segments:**
Segments are naturally defined by Groups `(...)`.
```wod
(3 rounds)
  Run 400m
  [:Rest] 2:00  <-- This implicitly creates a Rest segment/timer
```

**Targeting Timers:**
We can extend the Action syntax to target specific timers.
```wod
[:StartTimer target="warmup"]
[:StopTimer target="all"]
```

### 3. Visualization (Timer-Visual)
The `TimerMemoryVisualization` (in `src/clock/TimerMemoryVisualization.tsx`) needs to be upgraded to a `TimerDashboard` or `HeadsUpDisplay`.

*   **Layout:**
    *   **Top Bar:** Global Timer (Total Time).
    *   **Main Area:** Current Active Segment (Large Timer + Label).
    *   **Overlay/Bottom:** Dynamic Buttons (e.g., "Next Round", "Skip Rest").
*   **Cards:** Use the concept of "Cards" for segments. A Segment Card contains:
    *   Label (e.g., "Round 1", "Rest").
    *   Local Timer.
    *   Progress Bar (if time-bound).

### 4. Dynamic Buttons (Interaction Layer)
A new `InteractionBehavior` or `UIBehavior` to manage on-screen controls.

*   **Mechanism:** Blocks can register "Actions" that render as buttons.
*   **Event Binding:** Clicking a button emits a runtime event (e.g., `ui:click:next`).
*   **Handling:** `ScriptRuntime` handles these events to trigger transitions (e.g., popping the current block).

#### WOD Syntax Example for Buttons
```wod
[:Button label="Next Round" action="next"]
[:Button label="Skip Rest" action="skip"]
```

## Detailed Design

### Data Structures

#### Timer State in Memory
Using `TypedMemoryReference` from `src/runtime/IMemoryReference.ts`:
```typescript
interface TimerState {
  id: string;
  label: string;
  type: 'up' | 'down';
  duration?: number;
  spans: TimeSpan[];
  isRunning: boolean;
  parentId?: string; // For hierarchy
}
```

#### UI Button Definition
Stored in a `ui:buttons` memory location:
```typescript
interface UIButton {
  id: string;
  label: string;
  action: string; // Event to emit
  payload?: any;
  variant?: 'primary' | 'secondary' | 'danger';
}
```

### Visualization Mockup

```text
+--------------------------------------------------+
|  Total Time: 12:45                        [Stop] |
+--------------------------------------------------+
|                                                  |
|           CURRENT SEGMENT: EMOM Round 3          |
|                                                  |
|                   00:45                          |
|                                                  |
|              [=================---]              |
|                                                  |
+--------------------------------------------------+
| [Skip Rest]   [Next Round]          [Add 10s]    |
+--------------------------------------------------+
```

## Implementation Plan

1.  **Refactor TimerBehavior:** Support named instances and registration in a global registry using `RuntimeMemory`.
2.  **Implement Global Clock:** A persistent timer that runs for the entire session, likely initialized in `ScriptRuntime`.
3.  **Create UI Memory System:** Define memory structures for UI elements (buttons, active cards).
4.  **Update Visualization Component:** Build the new `TimerDashboard` reacting to these memory structures.
5.  **Event System Update:** Ensure UI events (from buttons) flow back into the `ScriptRuntime.handle()` loop to trigger logic.

## Next Steps
1.  Prototype the `TimerRegistry` in `ScriptRuntime`.
2.  Create a `UIBehavior` for managing buttons.
3.  Build a proof-of-concept `TimerDashboard`.
