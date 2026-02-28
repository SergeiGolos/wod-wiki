# Fragment-to-Grid Crosswalk

This document provides a mapping between internal `FragmentType` models, their display columns in the Review Grid, and the lifecycle phase where they are generated.

## 1. Core Time Tracking (Fixed Columns)

These fragments are the "source of truth" for the workout timeline.

| Fragment Type | Grid Column | Lifecycle Phase | Description |
| :--- | :--- | :--- | :--- |
| `Duration` | **Duration** | **Parser** | The planned target (intent) defined in the script (e.g. `5:00`). |
| `Spans` | **Time** | **Execution** | Raw start/stop timestamps recorded by the runtime clock. |
| `SystemTime` | **Timestamp** | **Output (Unmount)** | Wall-clock `Date.now()` recorded when the statement is finalized. |
| *(Derived)* | **Elapsed** | **Output (Unmount)** | Pause-aware active time calculated from `Spans`. |
| *(Derived)* | **Total** | **Output (Unmount)** | Wall-clock bracket calculated from `Spans`. |

## 2. Workout Content (Dynamic Columns)

These fragments describe the "what" of the workout. Most are defined during parsing.

| Fragment Type | Grid Column | Lifecycle Phase | Description |
| :--- | :--- | :--- | :--- |
| `Effort` | **Effort** | **Parser** | The exercise name or primary action (e.g. `Pushups`). |
| `Rep` | **Rep** | **Parser / User** | Number of repetitions. Can be overridden by user input. |
| `Distance` | **Distance** | **Parser** | Distance targets (e.g. `400m`). |
| `Resistance` | **Resistance** | **Parser** | Weight or load (e.g. `95lb`). |
| `Rounds` | **Rounds** | **Parser** | Total number of loops/rounds defined in a block. |
| `CurrentRound`| **CurrentRound**| **Execution** | The current iteration count (e.g. `Round 2 of 10`). |
| `Action` | **Action** | **Parser** | Specific instructional triggers (e.g. `Hold`, `Rest`). |
| `Text` | **Text** | **Parser** | Supplemental notes or instructions. |
| `Label` | **Label** | **Parser** | Custom block identifiers or aliases. |

## 3. System & Debug (Hidden/Special Columns)

These are primarily used for engine diagnostics and UI feedback.

| Fragment Type | Grid Column | Lifecycle Phase | Description |
| :--- | :--- | :--- | :--- |
| `System` | **System** | **Execution** | Lifecycle events (e.g. `push`, `pop`, `next`) emitted by the engine. |
| `Group` | **Group** | **Parser** | Structural grouping signals (e.g. `+` or `,` operators). |
| `Increment` | **Increment** | **Parser** | Progressive changes (e.g. `+ 5lbs`). |
| `Sound` | **Sound** | **Parser / Exec** | Audio cues defined in script or triggered by timer events. |

---

## Lifecycle Definitions

*   **Parser**: Created once when the Markdown is converted to `CodeStatements`. Represents the user's **intent**.
*   **Execution**: Generated/Updated in real-time while the workout is active. Represents **live state**.
*   **Output (Unmount)**: Generated when a block finishes and emits its final `OutputStatement`. Represents **recorded history**.
*   **User**: Back-filled or overridden by the user during or after the workout. Represents **ground truth**.
