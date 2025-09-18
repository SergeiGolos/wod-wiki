## RuntimeBlock Behaviors Overview

### Behavioral Categories

#### 1. Block Lifecycle and Structure Behaviors

**AllocateChildren**

- **Purpose:** Reads child elements and identifies grouping based on Lap fragments.
- **Functions:**
    - Parses child nodes and groups them as multiple code blocks into single runtime blocks.
    - Handles `+` lap values for proper block grouping.
    - pushes a `string[][]` collection onPush to memory with SourceIds of the blocks in each group.
- **Used By:** RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

**AllocateIndex**

- **Purpose:** Writes tracking information for loop execution.
- **Functions:**
    - Manages the index of the loop.
    - Tracks the index of the current child.
- **Used By:** RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

**NextChildBehavior**

- **Purpose:** Handles transition between child blocks.
- **Functions:**
    - onNext() looks at the current child requires the index reference
    - Pushes the JIT-compiled next child group onto the runtime stack.
    - Manages the flow of execution between child blocks.
- **Used By:** RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

#### 2. Loop Control Behaviors

**NoLoopBehavior**

- **Purpose:** Controls single-pass execution of child blocks.
- **Functions:**
    - Registers the exit condition to end after a single pass through children.
    - Prevents repetitive execution of child blocks.
- **Used By:** RootBlock

**BoundLoopBehavior**

- **Purpose:** Enables fixed-count repetition of child blocks.
- **Functions:**
    - Loops X number of times before exiting.
    - Maintains count of remaining iterations.
- **Used By:** BoundedLoopingBlock, BoundedLoopingParentBlock

#### 3. Duration and Event Behaviors

**DurationEventBehavior**

- **Purpose:** Manages timed segments within a workout.
- **Functions:**
    - Creates duration events that listen to tick events.
    - Determines if the span associated with the event has elapsed.
    - Triggers internal event functions when duration completes.
- **Used By:** TimeBoundBlock, TimeBoundedLoopingBlock

**CompleteEventBehavior**

- **Purpose:** Handles manual completion signals.
- **Functions:**
    - Waits for a "Complete" event to be pushed to the event handler.
    - Triggers appropriate completion actions when received.
- **Used By:** TimedBlock

**OnEventEndBehavior**

- **Purpose:** Handles program termination from external events.
- **Functions:**
    - Processes external end events.
    - Ensures proper shutdown of workout program.
- **Used By:** RootBlock

#### 4. Cleanup and Transition Behaviors

**PopOnNextBehavior**

- **Purpose:** Manages block stack transitions.
- **Functions:**
    - Triggers stack pop for current block when next event fires.
    - Ensures proper pop for all children.
- **Used By:** TimeBoundBlock, TimedBlock

**StopOnPopBehavior**

- **Purpose:** Handles cleanup of timer resources.
- **Functions:**
    - Stops timers on segments when they are popped from the stack.
    - Ensures proper cleanup of timing resources.
- **Used By:** RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

**JournalOnPopBehavior**

- **Purpose:** Records metrics and spans to persistent storage.
- **Functions:**
    - Writes metrics and spans for the block to long-term memory.
    - Currently implemented as a service creating a separate list.
- **Used By:** RootBlock, TimeBoundBlock, TimedBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

**EndOnPopBehavior**

- **Purpose:** Terminates program execution upon block completion.
- **Functions:**
    - Ends program execution when the block completes.
    - Ensures clean program termination.
- **Used By:** RootBlock

#### 5. Memory and Metrics Behaviors

**AllocateMetrics**

- **Purpose:** Manages workout metrics data.
- **Functions:**
    - Writes metrics to the designated memory location.
    - Creates and maintains measurement data structures.
- **Used By:** TimeBoundBlock, TimedBlock

**PromotePublic**

- **Purpose:** Shares metrics from parent to child blocks.
- **Functions:**
    - Makes Duration Metrics (time, repetitions, etc.) available to child blocks.
    - Enables patterns like EMOM (Every Minute On the Minute) to promote 1-min timer to children.
    - Supports rep schemes like (21-15-9) to promote different metrics across 3 rounds.
- **Used By:** BoundedLoopingParentBlock

**AllocateSpanBehavior**

- **Purpose:** Creates spans visible to child blocks.
- **Functions:**
    - Creates and manages span data that can be accessed by child blocks.
    - Provides hierarchical context for timing and measurements.
- **Used By:** RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

**AllocateSpanBehavior**

- **Purpose:** Creates spans for the current block.
- **Functions:**
    - Creates span structures for tracking block execution.
    - Manages span lifecycle and data.
- **Used By:** TimeBoundBlock, TimedBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock

## RuntimeBlock Implementations

### 1. RootBlock

**Purpose:** Root container for the script runtime, serving as the top-level block in the execution hierarchy.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **AllocateChildren**
- **AllocateIndex**
- **NextChildBehavior**
- **NoLoopBehavior**
- **OnEventEndBehavior**
- **StopOnPopBehavior**
- **JournalOnPopBehavior**
- **EndOnPopBehavior**

### 2. TimeBoundBlock

**Purpose:** Basic timing unit for duration-based workout segments.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **DurationEventBehavior**
- **PopOnNextBehavior**
- **JournalOnPopBehavior**
- **AllocateMetrics**

### 3. TimedBlock

**Purpose:** Segment that completes upon external signal rather than fixed duration.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **AllocateMetrics**
- **PopOnNextBehavior**
- **CompleteEventBehavior**
- **JournalOnPopBehavior**

### 4. BoundedLoopingBlock

**Purpose:** Has a defined number of rounds to execute the child blocks before exiting.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **AllocateChildren**
- **AllocateIndex**
- **NextChildBehavior**
- **BoundLoopBehavior**
- **StopOnPopBehavior**
- **JournalOnPopBehavior**

### 5. BoundedLoopingParentBlock

**Purpose:** Iterates child statements across multiple rounds with repetition tracking; rep count is promoted to public for child elements to pick up during JIT.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **AllocateChildren**
- **AllocateIndex**
- **NextChildBehavior**
- **BoundLoopBehavior**
- **PromotePublic**
- **StopOnPopBehavior**
- **JournalOnPopBehavior**

### 6. TimeBoundedLoopingBlock

**Purpose:** Repeats child statements for a fixed duration (count-up timer); handles timed rounds with a positive duration.

**Behaviors Used:**

- **AllocateSpanBehavior**
- **AllocateChildren**
- **AllocateIndex**
- **NextChildBehavior**
- **DurationEventBehavior**
- **StopOnPopBehavior**
- **JournalOnPopBehavior**

---

## Behaviors Needing Additional Details

The following behaviors appear to be used in runtime blocks but may need additional clarification:

1. **CompleteEventBehavior** - Additional details on the event types that trigger completion and how they're processed would be helpful.
   --- there would be a button that would push taht to handle on the runtime.  at that point. we end the current span if it is open and we call next on the current block.
    
2. **PromotePublic** - More specifics on which metrics are promoted and how child blocks can access/leverage them would enhance understanding.
   --- Takes some reference passed to it for a memory location and makes memory location visible to the JIT for child elements to inherit that memory location.
3. **AllocateMetrics** - Further details on the specific metrics that are allocated and their structure would be valuable.
   -- the metric object as they are on the runtime block now, will now live in memory.
