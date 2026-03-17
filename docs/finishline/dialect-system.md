# Dialect System - Implementation Strategy

## Overview
WodScript is designed to support different contexts of use through "dialects." While the core syntax remains the same, the *execution semantics* change based on the active dialect. The three primary dialects are `wod` (live execution), `log` (historical recording), and `plan` (future targeting).

## The Dialects

### 1. The `wod` Dialect (Execution Mode)
This is the default, real-time tracking mode.
- **Trigger:** ` ```wod `
- **Semantics:**
  - Timers run in real-time.
  - The runtime waits for user interaction (e.g., clicking "Next" or swiping) to complete untimed blocks (like rounds or specific movements).
  - Emits real-time tracking events used by the Timer UI and Tracker views.
  - State transitions strictly follow the live lifecycle (idle -> running -> complete).

### 2. The `log` Dialect (Historical Mode)
Used for recording past workouts where the actual time has already elapsed.
- **Trigger:** ` ```log `
- **Semantics:**
  - Timers *do not* run in real-time. They act as data-entry fields where the user inputs the completed duration.
  - The runtime optimizes for rapid data entry rather than pacing.
  - Pushing a block onto the stack immediately requests completion data rather than starting a clock.
  - Analytics engines interpret this data as past performance.

### 3. The `plan` Dialect (Planning Mode)
Used for scheduling future workouts or calculating expected volume.
- **Trigger:** ` ```plan `
- **Semantics:**
  - Execution is entirely simulated or static.
  - Used to extract target metrics (e.g., total planned reps, expected duration based on formulas).
  - UI renders read-only previews or scheduling interfaces rather than active timers.
  - No completion events are emitted; instead, a "plan profile" is generated.

## Architectural Changes Needed

### Parser & Core
The Lezer parser and AST already support identifying the fence tag. We need to ensure the `dialect` attribute is firmly attached to the root AST node or the `SessionRootBlock`.

### Strategy & Behavior Injectors
Currently, `RuntimeBuilder` or `JitCompiler` uses a standard set of strategies. We need to implement a **Strategy Factory** or **Behavior Injector** that is dialect-aware.
- Example: Instead of always injecting `CountdownTimerBehavior` for an EMOM, if the dialect is `log`, it injects `HistoricalTimerEntryBehavior`.
- The `DialectRegistry` should be expanded to map dialects to their specific strategy implementations.

### UI Rendering
The Editor's `SectionRenderers` and the Companion Overlays must inspect the `dialect`.
- A `wod` block shows the "Run" button.
- A `log` block might show a "Record" or "Save" button.
- A `plan` block might show "Add to Calendar".

## Next Steps
- [ ] Define the specific interfaces for dialect-aware strategy injection.
- [ ] Implement the `HistoricalTimerEntryBehavior` and related `log` behaviors.
- [ ] Update the `RuntimeBuilder` to accept a `dialect` parameter and load the appropriate behavior set.
- [ ] Update UI components (`WodCompanion`, `TimerStackView`) to alter their controls based on the active dialect.
- [ ] Ensure the new comprehensive runtime test suite covers all three dialects.
