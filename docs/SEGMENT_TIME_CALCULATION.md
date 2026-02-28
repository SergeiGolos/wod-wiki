# Segment Time Calculation & Lifecycle Logic

This document defines how time-related fields are calculated within the analytics `segments` data structure and how they map to the core runtime fragments.

## 1. Core Time Tracking Elements

We track three primary sources of time data:

*   **Duration** (Parser-Defined): The planned target defined in the script (e.g., "5:00"). Set during parsing at the `CodeStatement` level. It carries the **intent** of the workout to the engine.
*   **Spans** (Runtime-Tracked): The raw `TimeSpan[]` (start/stop) recordings from the running clock. These are recorded by runtime elements or can be back-filled during analytics via user input.
*   **SystemTime** (Timestamp): Real-world system time (`Date.now()`) recorded as a metric. Ground-truth wall-clock reference independent of the runtime clock.

## 2. Calculated Metrics (Derived)

`Elapsed` and `Total` are calculated from the core `Spans` when needed for display or analysis:

| Metric      | Unit | Calculation Logic                                                           |
| :---------- | :--- | :-------------------------------------------------------------------------- |
| **Elapsed** | ms   | Σ(end − start) for each active span segment (active time, excludes pauses). |
| **Total**   | ms   | `lastSpan.end - firstSpan.start` (wall-clock bracket, includes pauses).     |

## 3. Analytics Segment Mapping

The `AnalyticsTransformer` maps these fragments into the `Segment` structure, focusing on the 4 core types:

| Segment Field | Type | Description |
| :--- | :--- | :--- |
| `duration` | Intent | Parser-defined planned target (Seconds). Extracted from `Duration` fragments. |
| `spans` | Raw | Absolute Unix timestamps (Seconds) converted from `Spans` fragments, made **workout-relative**. |
| `elapsed` | Active | Pause-aware active time (Seconds). Calculated from `Spans` during output. |
| `total` | Wall-clock | Total time from first start to last end (Seconds). Calculated from `Spans` during output. |

The deprecated `relativeSpans` and `metrics.time` have been removed to focus on these core tracked elements.

---

## 4. Lifecycle Mapping (The "When")

The recording and assignment of these times are triggered by specific events:

### `push` (Lifecycle)
*   **Trigger:** When a block is first entered (e.g., `session-root`, `waiting-to-start`).
*   **Effect:** Sets the initial `startTime` and begins the first entry in the `Spans` fragment.

### `tick` / `next` (Event)
*   **Trigger:** Occurs on every second of the timer (`tick`) or when a user manually advances (`next`).
*   **Effect:** Updates the current span in the `Spans` fragment and the `endTime` of the active segment.

### `pop` (Lifecycle)
*   **Trigger:** When a block is completed and removed from the runtime stack.
*   **Effect:** 
    1.  Finalizes the `endTime` and the final span in `Spans`.
    2.  Calculates final `elapsed` and `total` from `Spans`.
    3.  Captures the `SystemTime` (timestamp).
    4.  Sets the `completionReason`.
