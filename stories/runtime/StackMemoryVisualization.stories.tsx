import { JitCompilerDemo } from "../compiler/JitCompilerDemo";

export default {
  title: 'Runtime/Stack & Memory Visualization',
  component: JitCompilerDemo,
  parameters: {
    docs: {
      description: {
        component: `
## Stack & Memory Visualization Debug Harness

This debug harness provides visual separation of the runtime stack and memory allocations, 
allowing developers to understand how execution state (stack) relates to data state (memory).

### Features:
- **Visual Separation**: Stack execution blocks on one side, memory allocations on the other
- **Hover Associations**: Hover over stack blocks to see their memory allocations highlighted
- **Monaco Editor Integration**: Line highlighting in the code editor when hovering blocks
- **Memory-to-Stack Mapping**: Hover over memory entries to highlight the owning runtime block

### Usage:
1. Hover over runtime blocks in the stack to see associated memory and source highlighting
2. Hover over memory entries to see which runtime block owns them
3. Click "Next Block" to advance the runtime and see how stack/memory state changes
        `
      }
    }
  }
};

// Stories that demonstrate different runtime states and memory patterns

export const BasicWorkout = {
  name: 'Basic Workout: Simple AMRAP',
  args: {
    initialScript: `20:00 AMRAP
5 Pullups
10 Pushups
15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'A simple AMRAP workout showing timer block and effort blocks with their memory allocations.'
      }
    }
  }
};

export const RoundsWorkout = {
  name: 'Rounds Workout: Multiple Rounds',
  args: {
    initialScript: `(5)
20 Pullups
30 Pushups
40 Situps`
  },
  parameters: {
    docs: {
      description: {
        story: 'A rounds-based workout showing group block structure and nested memory allocations.'
      }
    }
  }
};

export const ComplexWorkout = {
  name: 'Complex Workout: Mixed Patterns',
  args: {
    initialScript: `(3)
+ 20 Thrusters 95lb
+ 30 Pullups
+ 40 Air Squats
2:00 Rest`
  },
  parameters: {
    docs: {
      description: {
        story: 'A complex workout with rounds, different rep types, and rest periods, showing hierarchical memory structures.'
      }
    }
  }
};

export const RepSchemeWorkout = {
  name: 'Rep Scheme: Descending Pattern',
  args: {
    initialScript: `(21-15-9)
Thrusters 95lb
Pullups`
  },
  parameters: {
    docs: {
      description: {
        story: 'A descending rep scheme workout demonstrating variable round metrics stored in memory.'
      }
    }
  }
};

export const EMOMWorkout = {
  name: 'EMOM: Every Minute On the Minute',
  args: {
    initialScript: `(12) :60 EMOM
+ 5 Pullups
+ 10 Pushups
+ 15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'An EMOM (Every Minute On the Minute) workout showing timer-based execution with interval memory management.'
      }
    }
  }
};

export const TabataWorkout = {
  name: 'Tabata: High-Intensity Intervals',
  args: {
    initialScript: `(8) 20s/10s
Burpees`
  },
  parameters: {
    docs: {
      description: {
        story: 'A Tabata-style workout with work/rest intervals, demonstrating time-based memory allocations.'
      }
    }
  }
};

export const MemoryDebugDemo = {
  name: 'Memory Debug: Extensive Allocations',
  args: {
    initialScript: `For Time:
(3)
+ 21 Deadlifts 225lb
+ 15 Handstand Pushups
+ 9 Box Jumps 24"
400m Run
(2)
+ 15 Deadlifts 225lb
+ 10 Handstand Pushups
+ 5 Box Jumps 24"
200m Run`
  },
  parameters: {
    docs: {
      description: {
        story: 'A complex workout designed to showcase extensive memory allocations and stack-memory relationships for debugging purposes.'
      }
    }
  }
};