import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo } from '../../compiler/JitCompilerDemo';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Runtime/Strategies/Strategy Matching',
  component: JitCompilerDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Demonstrates how different workout syntaxes are matched to appropriate runtime strategies. Each strategy has specific matching criteria that determine which workout patterns it handles.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    initialScript: {
      control: 'text',
      description: 'Initial workout script to test strategy matching'
    },
    showRuntimeStack: {
      control: 'boolean',
      description: 'Show runtime stack visualization'
    },
    showMemory: {
      control: 'boolean',
      description: 'Show memory visualization'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// TIME BOUND ROUNDS STRATEGY (AMRAP Workouts)
// ============================================================================

export const AMRAPBasic: Story = {
  name: 'AMRAP: Basic Time-Bound Rounds',
  args: {
    initialScript: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'AMRAP (As Many Rounds As Possible) workout. TimeBoundRoundsStrategy matches Timer + AMRAP action, creating a countdown timer that wraps an infinite rounds block.'
      }
    }
  }
};

export const AMRAPWithRounds: Story = {
  name: 'AMRAP: Timer + Rounds Combination',
  args: {
    initialScript: `15:00 (3 rounds)
  5 Handstand Pushups
  10 Pistols
  15 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'TimeBoundRoundsStrategy also matches Timer + Rounds fragments, creating a time-bounds multi-round workout.'
      }
    }
  }
};

export const AMRAPShort: Story = {
  name: 'AMRAP: Short Duration',
  args: {
    initialScript: `5:00 AMRAP
  10 Thrusters 95lb
  15 Pullups`,
    showRuntimeStack: true,
    showMemory: true
  }
};

// ============================================================================
// INTERVAL STRATEGY (EMOM Workouts)
// ============================================================================

export const EMOMSingleExercise: Story = {
  name: 'EMOM: Single Exercise',
  args: {
    initialScript: `EMOM 10
  5 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'EMOM (Every Minute On the Minute) workout. IntervalStrategy matches Timer + EMOM action, creating interval-based execution with child exercises performed at the start of each interval.'
      }
    }
  }
};

export const EMOMMultipleExercises: Story = {
  name: 'EMOM: Multiple Exercises',
  args: {
    initialScript: `EMOM 15
  5 Pullups
  10 Pushups
  15 Air Squats`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'EMOM workout with multiple exercises. All exercises are performed at the start of each minute interval.'
      }
    }
  }
};

export const EMOMComplex: Story = {
  name: 'EMOM: Complex with Loading',
  args: {
    initialScript: `EMOM 20
  3 Deadlifts 315lb
  6 Hang Power Cleans 185lb
  9 Front Squats 135lb`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex EMOM workout with varying weights and rep schemes. IntervalStrategy handles the timing while child strategies handle the individual exercises.'
      }
    }
  }
};

export const EMOMExplicitInterval: Story = {
  name: 'EMOM: Explicit Interval Syntax',
  args: {
    initialScript: `Every 1 minute for 10 minutes
  5 Burpees
  10 Situps`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'EMOM workout using explicit interval syntax. IntervalStrategy recognizes various EMOM patterns.'
      }
    }
  }
};

// ============================================================================
// TIMER STRATEGY (Simple Timer Workouts)
// ============================================================================

export const TimerBasic: Story = {
  name: 'Timer: Simple Duration',
  args: {
    initialScript: `30s Plank Hold`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple timer-based workout. TimerStrategy matches Timer fragments without rounds or EMOM, creating basic timing blocks.'
      }
    }
  }
};

export const TimerWithResistance: Story = {
  name: 'Timer: Timer + Resistance',
  args: {
    initialScript: `45s KB Swings 53lb`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Timer workout with resistance specified. TimerStrategy handles the timing while effort components handle the exercise details.'
      }
    }
  }
};

export const TabataStyle: Story = {
  name: 'Timer: Tabata Style',
  args: {
    initialScript: `(8) 20s/10s
  Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabata-style interval workout. Uses TimerStrategy for the timing component combined with RoundsStrategy for the repetition structure.'
      }
    }
  }
};

// ============================================================================
// ROUNDS STRATEGY (Multi-Round Workouts)
// ============================================================================

export const RoundsBasic: Story = {
  name: 'Rounds: Basic Multi-Round',
  args: {
    initialScript: `(5)
  20 Pullups
  30 Pushups
  40 Situps`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic multi-round workout. RoundsStrategy matches Rounds fragments without Timer, creating fixed-count round structures.'
      }
    }
  }
};

export const RoundsWithRest: Story = {
  name: 'Rounds: With Rest Periods',
  args: {
    initialScript: `(3)
  10 Thrusters 95lb
  15 Pullups
  2:00 Rest`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-round workout with rest periods. Rest periods become separate blocks managed by the rounds coordinator.'
      }
    }
  }
};

export const RepSchemeDescending: Story = {
  name: 'Rounds: Rep Scheme (21-15-9)',
  args: {
    initialScript: `(21-15-9)
  Thrusters 95lb
  Pullups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'CrossFit-style rep scheme workout. RoundsStrategy handles the varying rep counts across rounds.'
      }
    }
  }
};

export const RepSchemeAscending: Story = {
  name: 'Rounds: Rep Scheme Ascending',
  args: {
    initialScript: `(9-15-21)
  Box Jumps 24"
  Push Presses 75lb`,
    showRuntimeStack: true,
    showMemory: true
  }
};

// ============================================================================
// GROUP STRATEGY (Nested/Grouped Exercises)
// ============================================================================

export const GroupBasic: Story = {
  name: 'Group: Basic Nested Structure',
  args: {
    initialScript: `(3 rounds)
  (2 rounds)
    5 Pullups
  10 Pushups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Nested workout structure with groups. GroupStrategy matches statements with children, creating hierarchical block structures for complex workout compositions.'
      }
    }
  }
};

export const GroupComplex: Story = {
  name: 'Group: Complex Hierarchy',
  args: {
    initialScript: `(3 rounds)
  (2 rounds)
    5 Pullups
    10 Pushups
  15 Squats
  1:00 Rest`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex nested workout with multiple hierarchy levels. GroupStrategy enables sophisticated workout organization and execution patterns.'
      }
    }
  }
};

// ============================================================================
// EFFORT STRATEGY (Fallback for Simple Efforts)
// ============================================================================

export const EffortBasic: Story = {
  name: 'Effort: Simple Exercise',
  args: {
    initialScript: `10 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple effort-based exercise. EffortStrategy is the fallback strategy that matches anything without Timer, Rounds, or children.'
      }
    }
  }
};

export const EffortWithResistance: Story = {
  name: 'Effort: Exercise + Resistance',
  args: {
    initialScript: `5 Deadlifts 225lb`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple effort with resistance. EffortStrategy handles basic exercises that don\'t require complex timing or round management.'
      }
    }
  }
};

export const EffortDistance: Story = {
  name: 'Effort: Distance-Based',
  args: {
    initialScript: `400m Run`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Distance-based exercise. EffortStrategy handles various exercise types including cardio movements.'
      }
    }
  }
};

// ============================================================================
// STRATEGY PRECEDENCE EXAMPLES
// ============================================================================

export const PrecedenceAMRAPvsTimer: Story = {
  name: 'Precedence: AMRAP vs Timer',
  args: {
    initialScript: `20:00 AMRAP
  5 Pullups
  10 Pushups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates strategy precedence: TimeBoundRoundsStrategy matches Timer + AMRAP before TimerStrategy can match the Timer fragment alone.'
      }
    }
  }
};

export const PrecedenceEMOMvsTimer: Story = {
  name: 'Precedence: EMOM vs Timer',
  args: {
    initialScript: `EMOM 10
  5 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates strategy precedence: IntervalStrategy matches Timer + EMOM before TimerStrategy can match the Timer fragment alone.'
      }
    }
  }
};

export const PrecedenceGroupvsOthers: Story = {
  name: 'Precedence: Group vs Other Strategies',
  args: {
    initialScript: `(3 rounds)
  (2 rounds)
    5 Pullups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates strategy precedence: GroupStrategy matches nested structures before EffortStrategy can match individual exercises.'
      }
    }
  }
};