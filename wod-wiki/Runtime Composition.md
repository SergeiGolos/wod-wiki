## RuntimeBlock Implementations Overview

### 1. RootBlock

**Purpose:**

- Root container for the script runtime, serving as the top-level block in the execution hierarchy.

**Behaviors:**

- `PublicSpanBehavior`: Creates spans visible to children
- **AllocateChildren**  - reads the child elements and identify the grouping based on the Lap fragment of the child nodes. `string[][]` as `+` lap values would be grouped as multiple code blocks into a single runtime block.
- **AllocateIndex** - write the tracking information around the index of the loop and in the index of the current child. 
- **NextChildBehavior** - pushes  the Jit of the next child group onto the stack.
- **NoLoopBehavior** - registers the exist condition for the loop existing after a single pass though the children.
- **OnEventEndBehavior** - handles ending the program for external end events.
- **StopOnPopBehavior** - Stops the timers on the segment when the segment is popped.
- **JournalOnPopBehavior** - writes the metrics and spans for this to long term memory.  (for now that will be a services that will just create a separate list)
- **EndOnPopBehavior** - end the program execution when this completes.

### 2. TimeBoundBlock

**Purpose:**

- Basic timing unit for duration-based workout segments 

**Behaviors:**

- **AllocatateSpanBehavior**: Creates spans for the current block.
- **DurationEventBehavior**: creates a duration event that listens to tick events and figures out if the span associated with the event has elapsed.  if it has the internal event function the behavior is pointing to will fire. (this will be passed into the behavior, as special subtype of EventBehvarios)
- **PopOnNextBehavior** - when next event is fired, the current blocked is we trigger the stack pop and pop for all the children.
- **JournalOnPopBehavior**
- **AllocateMetrics** - write the metrics to the memory location

### 3. TimedBlock

- **AllocatateSpanBehavior**: Creates spans for the current block.
- **AllocateMetrics** 
- **PopOnNextBehavior** 
- **CompleteEventBehavior**: waits for an event for "Complete" to be pushed to the event handler.
- **JournalOnPopBehavior**

### 4. BoundedLoopingBlock 

Has a defined number of rounds to execute the child blocks before exiting.

**Behaviors:**

- **AllocatateSpanBehavior** - Creates spans visible to children
- **AllocateChildren**  - reads the child elements and identify the grouping based on the Lap fragment of the child nodes. `string[][]` as `+` lap values would be grouped as multiple code blocks into a single runtime block.
- **AllocateIndex** - write the tracking information around the index of the loop and in the index of the current child. 
- **NextChildBehavior** - pushes  the Jit of the next child group onto the stack.
- **BoundLoopBehavior** - Loops X number of times before existing
- **StopOnPopBehavior** - Stops the timers on the segment when the segment is popped.
- **JournalOnPopBehavior** - writes the metrics and spans for this to long term memory.  (for now that will be a services that will just create a separate list)

### 5. BoundedLoopingParentBlock

**Purpose:**

- Iterates child statements across multiple rounds with repetition tracking
- rep count is promoted to public for child elements to pick up during jit.

**Behaviors:**

- - **AllocatateSpanBehavior**: Creates spans visible to children
- **AllocateChildren**  - reads the child elements and identify the grouping based on the Lap fragment of the child nodes. `string[][]` as `+` lap values would be grouped as multiple code blocks into a single runtime block.
- **AllocateIndex** - write the tracking information around the index of the loop and in the index of the current child. 
- **NextChildBehavior** - pushes  the Jit of the next child group onto the stack.
- **BoundLoopBehavior**
- **PromotePublic** - Duration Metric  (time repetitions ectra )  needs more work on figuring out how this works in the future, but EMOM for example should in promote the 1 min timer to the children.  and a (21-15-9) scheme is a 3 round workout wher the rep scheme changes promoting different metrics.
- - **StopOnPopBehavior** - Stops the timers on the segment when the segment is popped.
- **JournalOnPopBehavior** - writes the metrics and spans for this to long term memory.  (for now that will be a services that will just create a separate list)


### 6. TimeBoundedLoopingBlock

**Purpose:**

- Repeats child statements for a fixed duration (count-up timer)
- Handles timed rounds with a positive duration

**Behaviors:**

- - AllocatateSpanBehavior: Creates spans visible to children
- **AllocateChildren**  - reads the child elements and identify the grouping based on the Lap fragment of the child nodes. `string[][]` as `+` lap values would be grouped as multiple code blocks into a single runtime block.
- **AllocateIndex** - write the tracking information around the index of the loop and in the index of the current child. 
- **NextChildBehavior** - pushes  the Jit of the next child group onto the stack.
- - **DurationEventBehavior**: creates a duration event that listens to tick events and figures out if the span associated with the event has elapsed.  if it has the internal event function the behavior is pointing to will fire. (this will be passed into the behavior, as special subtype of EventBehvarios)
- **StopOnPopBehavior** - Stops the timers on the segment when the segment is popped.
- **JournalOnPopBehavior** - writes the metrics and spans for this to long term memory.  (for now that will be a services that will just create a separate list)


