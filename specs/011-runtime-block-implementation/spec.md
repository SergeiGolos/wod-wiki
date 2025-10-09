# Feature Specification: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock

**Feature Branch**: `011-runtime-block-implementation`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: User description: "Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock for workout execution"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Implement specialized runtime blocks for workout execution
2. Extract key concepts from description
   → Identified: TimerBlock, RoundsBlock, EffortBlock, workout execution behaviors
3. For each unclear aspect:
   → UI interaction patterns for rep completion marked
4. Fill User Scenarios & Testing section
   → User flow: Execute various workout types (AMRAP, For Time, variable reps)
5. Generate Functional Requirements
   → All requirements testable via workout execution scenarios
6. Identify Key Entities
   → Blocks, behaviors, timer states, round states
7. Run Review Checklist
   → Spec ready for planning phase
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-08
- Q: How should athletes indicate rep completion during exercise execution? → A: Hybrid - tap to increment OR bulk entry at any time
- Q: What happens when an athlete needs to restart or abandon a workout mid-execution? → A: Both B and C - pause/resume OR abandon without saving
- Q: What is the required timer precision and tick rate for workout execution? → A: Timer events use sub-second precision internally; display shows 0.1s resolution; completion records exact timestamp from trigger event
- Q: How should the system handle partial round completion in AMRAP workouts when time expires? → A: End child blocks and record timer value; metrics calculated separately afterward
- Q: Should workout state (timer, rounds, reps) persist across browser sessions or app restarts? → A: No persistence - state lost on close/refresh

---

## User Scenarios & Testing

### Primary User Story
As a CrossFit athlete, I want to execute different types of workouts (AMRAP, For Time, and variable rep schemes) with proper timing and round tracking, so that I can complete workouts according to their prescribed format and track my performance accurately.

### Acceptance Scenarios

1. **Given** a "For Time" workout like Fran (21-15-9 of Thrusters and Pullups), **When** the athlete starts the workout, **Then** the system counts up from zero and tracks rounds and reps correctly through all three rounds.

2. **Given** an AMRAP workout like Cindy (20-minute AMRAP of 5 Pullups, 10 Pushups, 15 Squats), **When** the athlete starts the workout, **Then** the system counts down from 20 minutes while allowing continuous round progression until time expires.

3. **Given** a workout with variable reps (21-15-9), **When** the athlete completes round 1, **Then** the system automatically adjusts the target reps for round 2 from 21 to 15.

4. **Given** an athlete is in the middle of a round, **When** they complete all prescribed reps for an exercise, **Then** the system advances to the next exercise in the round.

5. **Given** a timed workout is running, **When** the timer completes (countdown reaches zero or athlete finishes all work), **Then** the system records the final time as the workout result.

### Edge Cases
- What happens when an athlete pauses mid-workout? Timer should pause and resume correctly. State maintained in memory during same session.
- What happens when an athlete closes browser or refreshes during a workout? All workout state is lost - no persistence across sessions.
- What happens when an athlete abandons a workout? System discards all progress without recording any results.
- How does the system handle completing a "For Time" workout faster than expected? Timer stops immediately upon completion.
- What happens when time expires in an AMRAP before completing a round? System ends child block execution and records timer value. Metrics and scoring are calculated separately from recorded state.
- How does the system track progress within a single exercise (e.g., 21 reps)? Athletes can either tap a button to increment by 1 rep (interactive during workout) OR enter bulk rep count at any time and mark complete.

## Requirements

### Functional Requirements

**Timer Management**
- **FR-001**: System MUST support countdown timers that start from a specified duration and count down to zero
- **FR-002**: System MUST support count-up timers that start from zero and track elapsed time
- **FR-003**: System MUST emit timer tick events using sub-second precision for internal time tracking
- **FR-003a**: System MUST display timer values with 0.1 second (100ms) resolution to users
- **FR-003b**: System MUST record exact timestamp (full precision) at completion or button click events for accurate final time
- **FR-004**: System MUST signal completion when a countdown timer reaches zero
- **FR-005**: System MUST allow pausing and resuming timers during workout execution
- **FR-005a**: System MUST maintain workout state in memory when paused to allow resumption within same session (timer, round, exercise, reps)
- **FR-005b**: System MUST provide abandon capability that discards workout without recording any results
- **FR-005c**: System MUST NOT persist workout state across browser close/refresh or application restarts

**Round Management**
- **FR-006**: System MUST track the current round number and total rounds for round-based workouts
- **FR-007**: System MUST support variable rep schemes (e.g., 21-15-9) where rep targets change between rounds
- **FR-008**: System MUST provide the correct rep target for each exercise based on the current round
- **FR-009**: System MUST advance to the next round automatically when all exercises in the current round are completed
- **FR-010**: System MUST signal completion when all prescribed rounds are finished

**Exercise/Effort Execution**
- **FR-011**: System MUST track individual exercises (efforts) within a workout with their prescribed rep targets
- **FR-012**: System MUST allow athletes to mark exercises as complete when target reps are achieved
- **FR-012a**: System MUST support incremental rep counting via single button press (increment by 1)
- **FR-012b**: System MUST support bulk rep entry where athlete can input completed count directly
- **FR-012c**: System MUST allow switching between incremental and bulk entry modes at any time during an exercise
- **FR-013**: System MUST advance to the next exercise automatically when the current exercise is completed
- **FR-014**: System MUST maintain rep targets that can be dynamically set by parent round contexts

**Workout Completion**
- **FR-015**: System MUST determine when a "For Time" workout is complete (all work finished) and stop the timer
- **FR-016**: System MUST determine when an AMRAP workout is complete (time expired) and end child block execution
- **FR-016a**: System MUST record timer value at moment of AMRAP completion (time expiry or early termination)
- **FR-017**: System MUST capture workout state at completion (timer value, current block, exercise, rep progress)
- **FR-017a**: Metric calculation and scoring occur separately from workout execution using captured state

**Workout Types**
- **FR-018**: System MUST support "For Time" workouts where the goal is to complete prescribed work as quickly as possible
- **FR-019**: System MUST support "AMRAP" (As Many Rounds As Possible) workouts with countdown timers
- **FR-020**: System MUST support workouts with fixed rounds (e.g., "3 rounds of X, Y, Z")
- **FR-021**: System MUST support workouts combining multiple characteristics (e.g., "21-15-9 For Time")

### Key Entities

- **TimerBlock**: Represents time-based workout segments with countdown or count-up timing capability
  - Manages current time and duration
  - Emits tick events during execution
  - Signals completion based on time conditions

- **RoundsBlock**: Represents multi-round workout segments with optional variable rep schemes
  - Tracks current round and total rounds
  - Maintains rep scheme arrays for variable rep workouts
  - Provides rep context to child exercises
  - Advances rounds upon completion of all exercises

- **EffortBlock**: Represents individual exercises or movements within a workout
  - Tracks target reps and current progress
  - Accepts completion signals from athletes
  - No child blocks (terminal execution unit)

- **Timer State**: The current timing information for a workout
  - Duration (for countdowns)
  - Current time (tracked with sub-second precision internally)
  - Display time (rounded to 0.1s for presentation)
  - Direction (up or down)
  - Completion timestamp (exact time when workout finishes)

- **Round State**: The current round information for multi-round workouts
  - Total rounds
  - Current round number
  - Rep scheme (array of rep targets per round)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
- [x] Clarifications completed (5/5 questions answered)

---

## Notes

**Input Source**: This specification was derived from the implementation details document `implementation-details-runtime-blocks.md` which describes the proposed behavior-based architecture for executing different workout types.

**Key Design Principles Referenced**:
- Behavior composition over complex inheritance
- Specialized blocks for specific workout characteristics
- Event-driven completion and advancement
- Dynamic context provision for nested execution units

**Example Workouts Covered**:
- **Cindy**: 20-min AMRAP of 5 Pullups, 10 Pushups, 15 Squats (AMRAP with countdown)
- **Fran**: 21-15-9 of Thrusters and Pullups, For Time (variable reps, count-up timer)
- **Mary**: 20-min AMRAP of 5 Handstand Pushups, 10 Pistols, 15 Pullups (AMRAP with countdown)
- **Grace**: 30 Clean & Jerks For Time (count-up timer, single effort)
- **Barbara**: 5 rounds of 20 Pullups, 30 Pushups, 40 Situps, 50 Squats (fixed rounds)
- **Nancy**: 5 rounds of 400m Run, 15 Overhead Squats (fixed rounds)
- **Helen**: 3 rounds of 400m Run, 21 Kettlebell Swings, 12 Pullups (fixed rounds)

---
