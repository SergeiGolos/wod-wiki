# Segment Time Calculation & Lifecycle Logic

This document defines how time-related fields are calculated within the analytics `segments` data structure and how they map to the core runtime fragments.

## 1. Core Time Tracking Elements

We track three primary sources of time data:

*   **Duration** (Parser-Defined): The planned target defined in the script (e.g., "5:00"). Set during parsing at the `CodeStatement` level. It can be a fixed time or a variable to be resolved.
*   **Spans** (Runtime-Tracked): The raw `TimeSpan[]` (start/stop) recordings from the running clock. These are recorded by runtime elements or can be back-filled during analytics via user input.
*   **SystemTime** (Timestamp): Real-world system time (`Date.now()`) recorded as a metric. Ground-truth wall-clock reference independent of the runtime clock.

## 2. Calculated Metrics (Derived)

`Elapsed` and `Total` are calculated from the core `Spans` when needed for display or analysis: or can be defined by user input after.

| Metric      | Unit | Calculation Logic                                                           |
| :---------- | :--- | :-------------------------------------------------------------------------- |
| **Elapsed** | ms   | Σ(end − start) for each active span segment (active time, excludes pauses). |
| **Total**   | ms   | `lastSpan.end - firstSpan.start` (wall-clock bracket, includes pauses).     |

## 3. Analytics Segment Mapping

The `AnalyticsTransformer` maps these fragments into the `Segment` structure:

| Segment Field   | Calculation Logic                                                    |
| :-------------- | :------------------------------------------------------------------- |
| `startTime`     | `(Absolute Start - Workout Global Start) / 1000` (Seconds)           |
| `endTime`       | `(Absolute End - Workout Global Start) / 1000` (Seconds)             |
| `duration`      | Map of `Elapsed / 1000` (Pause-aware active time in Seconds)         |
| `spans`         | Absolute Unix timestamps (Seconds) converted from `Spans` fragments. |
| `relativeSpans` | Seconds offset from workout start for each span.                     |
| `metrics.time`  | Extracted from `Duration` fragments (planned target).                |

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
    2.  Calculates final `duration` (Elapsed).
    3.  Captures the `SystemTime` (timestamp).
    4.  Sets the `completionReason`.
