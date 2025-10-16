import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo } from '../../compiler/JitCompilerDemo';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Runtime/Strategies/Compilation Process',
  component: JitCompilerDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Demonstrates the compilation process and how strategies transform parsed statements into executable runtime blocks. Shows the relationship between workout syntax, strategy selection, and runtime block creation.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    initialScript: {
      control: 'text',
      description: 'Workout script to compile and demonstrate strategy selection'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// COMPILATION DEMONSTRATION STORIES
// ============================================================================

export const CompilationOverview: Story = {
  name: 'Compilation: Process Overview',
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
        story: 'Complete compilation process demonstration. Shows how TimeBoundRoundsStrategy matches the Timer + AMRAP pattern and creates the appropriate runtime block structure.'
      }
    }
  }
};

// ============================================================================
// TIME BOUND ROUNDS COMPILATION EXAMPLES
// ============================================================================

export const CompileAMRAP: Story = {
  name: 'Compile: AMRAP Time-Bound Rounds',
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
        story: 'TimeBoundRoundsStrategy compilation process. Creates a countdown TimerBlock that wraps an infinite RoundsBlock. The timer controls the overall workout duration while the rounds block manages exercise repetition.'
      }
    }
  }
};

export const CompileAMRAPWithExplicitRounds: Story = {
  name: 'Compile: AMRAP with Explicit Rounds',
  args: {
    initialScript: `15:00 (3 rounds)
  5 Handstand Pushups
  10 Pistols`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'TimeBoundRoundsStrategy compilation with explicit rounds. Shows how the strategy handles Timer + Rounds combinations, creating time-bounded round execution.'
      }
    }
  }
};

// ============================================================================
// INTERVAL COMPILATION EXAMPLES
// ============================================================================

export const CompileEMOM: Story = {
  name: 'Compile: EMOM Intervals',
  args: {
    initialScript: `EMOM 10
  5 Pullups
  10 Pushups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'IntervalStrategy compilation process. Creates a LoopCoordinatorBehavior with LoopType.INTERVAL that manages child exercise execution at specified intervals (every minute in EMOM).'
      }
    }
  }
};

export const CompileComplexEMOM: Story = {
  name: 'Compile: Complex EMOM with Loading',
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
        story: 'Complex IntervalStrategy compilation with varying weights and rep schemes. Shows how the interval timer manages child exercise execution while preserving exercise-specific details.'
      }
    }
  }
};

// ============================================================================
// ROUNDS COMPILATION EXAMPLES
// ============================================================================

export const CompileRounds: Story = {
  name: 'Compile: Multi-Round Workout',
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
        story: 'RoundsStrategy compilation process. Creates a LoopCoordinatorBehavior that manages fixed-count round execution with child exercise rotation.'
      }
    }
  }
};

export const CompileRepScheme: Story = {
  name: 'Compile: Rep Scheme (21-15-9)',
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
        story: 'RoundsStrategy compilation with descending rep scheme. Shows how the strategy handles varying rep counts across rounds while maintaining the same exercise sequence.'
      }
    }
  }
};

// ============================================================================
// TIMER COMPILATION EXAMPLES
// ============================================================================

export const CompileTimer: Story = {
  name: 'Compile: Simple Timer Workout',
  args: {
    initialScript: `30s Plank Hold`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'TimerStrategy compilation process. Creates a TimerBehavior with count-up timing that manages simple duration-based exercises.'
      }
    }
  }
};

export const CompileTabata: Story = {
  name: 'Compile: Tabata Intervals',
  args: {
    initialScript: `(8) 20s/10s
  Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabata-style compilation combining TimerStrategy for work/rest periods with RoundsStrategy for repetition. Creates alternating timer blocks within a round structure.'
      }
    }
  }
};

// ============================================================================
// GROUP COMPILATION EXAMPLES
// ============================================================================

export const CompileGroup: Story = {
  name: 'Compile: Nested Group Structure',
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
        story: 'GroupStrategy compilation process. Creates hierarchical block structures where parent groups contain child blocks. Enables complex workout organization with nested execution patterns.'
      }
    }
  }
};

export const CompileComplexGroup: Story = {
  name: 'Compile: Complex Nested Structure',
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
        story: 'Complex GroupStrategy compilation with multiple hierarchy levels. Shows how nested groups are compiled into a hierarchical runtime block structure with proper parent-child relationships.'
      }
    }
  }
};

// ============================================================================
// EFFORT COMPILATION EXAMPLES
// ============================================================================

export const CompileEffort: Story = {
  name: 'Compile: Simple Effort Exercise',
  args: {
    initialScript: `10 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'EffortStrategy compilation process. Creates simple completion-based blocks for basic exercises that don\'t require complex timing or round management.'
      }
    }
  }
};

export const CompileEffortWithLoading: Story = {
  name: 'Compile: Effort with Loading',
  args: {
    initialScript: `5 Deadlifts 225lb`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'EffortStrategy compilation with resistance/weight. Shows how exercise details are preserved in the compiled block while maintaining simple completion-based execution.'
      }
    }
  }
};

// ============================================================================
// COMPILATION EDGE CASES
// ============================================================================

export const CompileEmptyWorkout: Story = {
  name: 'Compile: Empty Workout',
  args: {
    initialScript: ``,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge case: Empty workout script. Shows how the compiler handles missing or empty input and provides appropriate error feedback.'
      }
    }
  }
};

export const CompileInvalidSyntax: Story = {
  name: 'Compile: Invalid Syntax',
  args: {
    initialScript: `invalid workout syntax here`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge case: Invalid workout syntax. Shows how the parser and compiler handle malformed input and provide error feedback.'
      }
    }
  }
};

export const CompileMinimalValid: Story = {
  name: 'Compile: Minimal Valid Workout',
  args: {
    initialScript: `1 Pushup`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge case: Minimal valid workout. Shows how EffortStrategy handles the simplest possible valid workout input.'
      }
    }
  }
};

// ============================================================================
// COMPILATION PERFORMANCE EXAMPLES
// ============================================================================

export const CompileLongWorkout: Story = {
  name: 'Compile: Long Complex Workout',
  args: {
    initialScript: `(21-15-9)
  Thrusters 95lb
  Pullups
  Box Jumps 24"
  Wall Balls 20lb
  Double-Unders
  Row 500m
  Rest 2:00`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance example: Long complex workout with multiple exercises and rest periods. Shows how the compiler handles complex multi-statement workouts efficiently.'
      }
    }
  }
};

export const CompileManyShortRounds: Story = {
  name: 'Compile: Many Short Rounds',
  args: {
    initialScript: `(50)
  1 Burpee`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance example: Many short rounds. Shows how RoundsStrategy efficiently handles large numbers of rounds without performance degradation.'
      }
    }
  }
};