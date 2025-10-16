import { JitCompilerDemo } from "../compiler/JitCompilerDemo";

export default {
  title: 'Runtime/Overview',
  component: JitCompilerDemo,
};

// SINGLE STATEMENT EXAMPLES - Various Fragment Combinations

export const SingleStatementRepAction = {
  name: 'Single Statement: Rep + Action',
  args: {
    initialScript: `10 Burpees`
  },
};

export const SingleStatementRepActionResistance = {
  name: 'Single Statement: Rep + Action + Resistance',
  args: {
    initialScript: `5 Deadlifts 225lb`
  },
};

export const SingleStatementTimerAction = {
  name: 'Single Statement: Timer + Action',
  args: {
    initialScript: `30s Plank Hold`
  },
};

export const SingleStatementDistanceAction = {
  name: 'Single Statement: Distance + Action',
  args: {
    initialScript: `400m Run`
  },
};

export const SingleStatementTimerActionResistance = {
  name: 'Single Statement: Timer + Action + Resistance',
  args: {
    initialScript: `45s KB Swings 53lb`
  },
};

export const SingleStatementActionOnly = {
  name: 'Single Statement: Action Only',
  args: {
    initialScript: `[Rest]`
  },
};

// GROUPED WORKOUTS - Uses RoundsStrategy (Rounds fragments without Timer)

export const GroupedWorkoutBasic = {
  name: 'Grouped Workout: Basic Round Structure (RoundsStrategy)',
  args: {
    initialScript: `(5)
  20 Pullups
  30 Pushups
  40 Situps`
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic multi-round workout using RoundsStrategy. Matches Rounds fragments without Timer to create fixed-count round execution with exercise rotation.'
      }
    }
  }
};

export const GroupedWorkoutWithRest = {
  name: 'Grouped Workout: With Rest (RoundsStrategy)',
  args: {
    initialScript: `(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  3:00 Rest`
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-round workout with rest periods using RoundsStrategy. Shows how rest periods become separate blocks within the round structure.'
      }
    }
  }
};

// REP SCHEME VARIATIONS (x-x-x) VERSION

export const RepSchemeDescending = {
  name: 'Rep Scheme: Descending (21-15-9)',
  args: {
    initialScript: `(21-15-9) 
  Thrusters 95lb
  Pullups`
  },
};

export const RepSchemeAscending = {
  name: 'Rep Scheme: Ascending (9-15-21)',
  args: {
    initialScript: `(9-15-21)
  Box Jumps 24"
  Push Presses 75lb`
  },
};

export const RepSchemePyramid = {
  name: 'Rep Scheme: Pyramid (1-2-3-4-5)',
  args: {
    initialScript: `(1-2-3-4-5)
  Muscle-ups
  Handstand Pushups`
  },
};

export const RepSchemeComplex = {
  name: 'Rep Scheme: Complex (50-40-30-20-10)',
  args: {
    initialScript: `(50-40-30-20-10)
  Double-Unders
  Situps`
  },
};

// EMOM MULTIPLE ITEMS - Uses IntervalStrategy (Timer + EMOM action)

export const EMOMSingle = {
  name: 'EMOM: Single Exercise (IntervalStrategy)',
  args: {
    initialScript: `EMOM 12
  5 Burpees`
  },
  parameters: {
    docs: {
      description: {
        story: 'EMOM workout using IntervalStrategy. Matches Timer + EMOM action pattern to create interval-based execution where exercises are performed at the start of each minute.'
      }
    }
  }
};

export const EMOMMultiple = {
  name: 'EMOM: Multiple Exercises (IntervalStrategy)',
  args: {
    initialScript: `EMOM 15
  + 5 Pullups
  + 10 Pushups
  + 15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'EMOM workout with multiple exercises using IntervalStrategy. All exercises are performed at the start of each minute interval.'
      }
    }
  }
};

export const EMOMComplex = {
  name: 'EMOM: Complex Loading (IntervalStrategy)',
  args: {
    initialScript: `EMOM 20
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb`
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex EMOM workout with varying weights using IntervalStrategy. Shows how interval timing works with complex exercise configurations.'
      }
    }
  }
};

// VARIETY OF REP TYPES: + / - (none)

export const RepTypeAddition = {
  name: 'Rep Type: Addition (+)',
  args: {
    initialScript: `(3)
  + 5 Pullups
  + 10 Pushups
  + 15 Squats`
  },
};

export const RepTypeSubtraction = {
  name: 'Rep Type: Subtraction (-)',
  args: {
    initialScript: `(3)
  - 20 Burpees
  - 15 Box Jumps
  - 10 Muscle-ups`
  },
};

export const RepTypeNone = {
  name: 'Rep Type: None (Standard)',
  args: {
    initialScript: `(5)
  10 Thrusters 95lb
  15 Pullups
  20 Box Jumps`
  },
};

export const RepTypeMixed = {
  name: 'Rep Type: Mixed (+/-/none)',
  args: {
    initialScript: `(4)
  + 5 Strict Pullups
  10 Regular Pushups
  - 15 Jumping Squats`
  },
};

// COUNT DOWN TIMER - Uses TimeBoundRoundsStrategy (Timer + AMRAP action)

export const CountdownTimer = {
  name: 'Countdown Timer: AMRAP (TimeBoundRoundsStrategy)',
  args: {
    initialScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'AMRAP workout using TimeBoundRoundsStrategy. Matches Timer + AMRAP action pattern to create time-bound round execution where athletes complete as many rounds as possible within the time limit.'
      }
    }
  }
};

export const CountdownTimerTabata = {
  name: 'Countdown Timer: Tabata Style',
  args: {
    initialScript: `(8) 20s/10s
  Burpees`
  },
};

// COUNT UP AND COUNT DOWN

export const CountUpTimer = {
  name: 'Count Up: For Time',
  args: {
    initialScript: `For Time:
  100 Burpees
  75 Situps
  50 Pushups
  25 Handstand Pushups`
  },
};

export const CountDownCountUp = {
  name: 'Count Down + Count Up: Mixed Timing',
  args: {
    initialScript: `15:00 Time Cap
  For Time:
  (21-15-9)
  Deadlifts 225lb
  Handstand Pushups`
  },
};

export const IntervalTraining = {
  name: 'Interval: Count Down with Rest',
  args: {
    initialScript: `(5)
  4:00 Work
  + 20 Thrusters 95lb
  + 30 Pullups
  2:00 Rest`
  },
};

// ============================================================================
// NEW STRATEGY-SPECIFIC EXAMPLES
// ============================================================================

// TimeBoundRoundsStrategy examples (Timer + Rounds/AMRAP)
export const TimeBoundRoundsExplicit: Story = {
  name: 'Time-Bound Rounds: Timer + Rounds (TimeBoundRoundsStrategy)',
  args: {
    initialScript: `15:00 (3 rounds)
  5 Handstand Pushups
  10 Pistols
  15 Burpees`
  },
  parameters: {
    docs: {
      description: {
        story: 'TimeBoundRoundsStrategy example with explicit rounds. Shows how Timer + Rounds fragments create time-bounded multi-round execution.'
      }
    }
  }
};

// IntervalStrategy examples (Timer + EMOM action)
export const IntervalStrategyExplicit: Story = {
  name: 'Interval Strategy: Explicit EMOM (IntervalStrategy)',
  args: {
    initialScript: `Every 1 minute for 10 minutes
  5 Burpees
  10 Situps`
  },
  parameters: {
    docs: {
      description: {
        story: 'IntervalStrategy example with explicit interval syntax. Shows how various EMOM patterns are recognized and compiled into interval-based execution.'
      }
    }
  }
};

// GroupStrategy examples (nested structures)
export const GroupStrategyExample: Story = {
  name: 'Group Strategy: Nested Structure (GroupStrategy)',
  args: {
    initialScript: `(3 rounds)
  (2 rounds)
    5 Pullups
    10 Pushups
  15 Squats`
  },
  parameters: {
    docs: {
      description: {
        story: 'GroupStrategy example with nested structure. Shows how hierarchical workout organizations are compiled into nested block structures.'
      }
    }
  }
};

// Strategy Precedence examples
export const StrategyPrecedenceDemo: Story = {
  name: 'Strategy Precedence: Complex Pattern',
  args: {
    initialScript: `20:00 AMRAP
  EMOM 1
    5 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex pattern showing strategy precedence. TimeBoundRoundsStrategy matches the outer AMRAP pattern, creating a time-bound structure that contains nested interval execution.'
      }
    }
  }
};
