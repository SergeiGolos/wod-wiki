import type { Meta, StoryObj } from '@storybook/react';
import { JitCompilerDemo } from '../../compiler/JitCompilerDemo';

const meta: Meta<typeof JitCompilerDemo> = {
  title: 'Runtime/Strategies/Strategy Comparison',
  component: JitCompilerDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Side-by-side comparisons of different strategies with similar workout patterns. Helps understand when to use each strategy and how they handle different syntax patterns.'
      }
    }
  },
  argTypes: {
    initialScript: {
      control: 'text',
      description: 'Workout script for comparison'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// TIMING STRATEGY COMPARISONS
// ============================================================================

export const TimingComparison: Story = {
  name: 'Comparison: Timing Strategies',
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
        story: 'Compare TimeBoundRoundsStrategy (AMRAP) vs TimerStrategy. AMRAP creates time-bound round execution, while TimerStrategy creates simple duration-based execution.'
      }
    }
  }
};

export const TimingAMRAPvsEMOM: Story = {
  name: 'Comparison: AMRAP vs EMOM',
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
        story: 'Compare AMRAP (continuous execution for time) vs EMOM (execution at interval boundaries). Both use Timer fragments but create different execution patterns.'
      }
    }
  }
};

// ============================================================================
// ROUND STRATEGY COMPARISONS
// ============================================================================

export const RoundsComparison: Story = {
  name: 'Comparison: Round Strategies',
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
        story: 'Compare RoundsStrategy vs GroupStrategy. RoundsStrategy manages fixed-count round execution, while GroupStrategy creates hierarchical block structures.'
      }
    }
  }
};

export const RoundsFixedvsTimeBound: Story = {
  name: 'Comparison: Fixed vs Time-Bound Rounds',
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
        story: 'Compare fixed rounds (3 rounds) vs time-bound rounds (as many as possible in time). TimeBoundRoundsStrategy creates countdown timer with infinite rounds.'
      }
    }
  }
};

// ============================================================================
// EXERCISE ORGANIZATION COMPARISONS
// ============================================================================

export const OrganizationComparison: Story = {
  name: 'Comparison: Exercise Organization',
  args: {
    initialScript: `(3 rounds)
  5 Pullups
  10 Pushups
  15 Squats`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Compare RoundsStrategy (flat organization) vs GroupStrategy (nested organization). Same exercises, different structural approaches.'
      }
    }
  }
};

export const OrganizationFlatvsNested: Story = {
  name: 'Comparison: Flat vs Nested Organization',
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
        story: 'Compare flat exercise organization (single round group) vs nested organization (multiple sub-groups). GroupStrategy enables hierarchical exercise structuring.'
      }
    }
  }
};

// ============================================================================
// EXECUTION PATTERN COMPARISONS
// ============================================================================

export const ExecutionComparison: Story = {
  name: 'Comparison: Execution Patterns',
  args: {
    initialScript: `EMOM 10
  5 Burpees
  10 Situps`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Compare IntervalStrategy (boundary-based execution) vs TimerStrategy (continuous execution). Same exercises, different timing patterns.'
      }
    }
  }
};

export const ExecutionIntervalvsContinuous: Story = {
  name: 'Comparison: Interval vs Continuous Execution',
  args: {
    initialScript: `30s Plank Hold`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Compare interval-based execution (discrete time blocks) vs continuous execution (smooth timing). Different approaches to time management.'
      }
    }
  }
};

// ============================================================================
// COMPLEXITY COMPARISONS
// ============================================================================

export const ComplexitySimple: Story = {
  name: 'Comparison: Simple Workouts',
  args: {
    initialScript: `10 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple workout comparison: EffortStrategy handles basic exercises efficiently without complex timing or round management overhead.'
      }
    }
  }
};

export const ComplexityModerate: Story = {
  name: 'Comparison: Moderate Complexity',
  args: {
    initialScript: `(5)
  10 Pullups
  15 Pushups
  20 Squats`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Moderate complexity: RoundsStrategy handles multi-round workouts with exercise rotation and round management.'
      }
    }
  }
};

export const ComplexityHigh: Story = {
  name: 'Comparison: High Complexity',
  args: {
    initialScript: `20:00 AMRAP
  (3)
    5 Pullups
    10 Pushups
    15 Squats
  2:00 Rest`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'High complexity: TimeBoundRoundsStrategy combined with nested Groups creates sophisticated workout structures with multiple execution patterns.'
      }
    }
  }
};

// ============================================================================
// PRECEDENCE DEMONSTRATIONS
// ============================================================================

export const PrecedenceTimer: Story = {
  name: 'Precedence: Timer-Based Strategies',
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
        story: 'Timer-based strategy precedence: TimeBoundRoundsStrategy > IntervalStrategy > TimerStrategy. Shows how specificity determines strategy selection.'
      }
    }
  }
};

export const PrecedenceRounds: Story = {
  name: 'Precedence: Round-Based Strategies',
  args: {
    initialScript: `15:00 (3 rounds)
  5 Handstand Pushups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Round-based strategy precedence: TimeBoundRoundsStrategy > TimerStrategy > RoundsStrategy. Combined Timer + Rounds gets most specific strategy.'
      }
    }
  }
};

export const PrecedenceStructure: Story = {
  name: 'Precedence: Structure-Based Strategies',
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
        story: 'Structure-based strategy precedence: GroupStrategy > EffortStrategy. Nested structures get GroupStrategy, simple exercises get EffortStrategy.'
      }
    }
  }
};

// ============================================================================
// PERFORMANCE COMPARISONS
// ============================================================================

export const PerformanceSmall: Story = {
  name: 'Performance: Small Workouts',
  args: {
    initialScript: `5 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance comparison: Small workout compilation efficiency. EffortStrategy provides lightweight compilation for simple exercises.'
      }
    }
  }
};

export const PerformanceMedium: Story = {
  name: 'Performance: Medium Workouts',
  args: {
    initialScript: `(5)
  10 Pullups
  15 Pushups
  20 Squats
  25 Situps`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance comparison: Medium workout compilation. RoundsStrategy provides efficient round management without excessive overhead.'
      }
    }
  }
};

export const PerformanceLarge: Story = {
  name: 'Performance: Large Workouts',
  args: {
    initialScript: `20:00 AMRAP
  (3 rounds)
    5 Pullups
    10 Pushups
    15 Squats
    20 Situps
  25 Burpees`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance comparison: Large workout compilation. Combined strategies create complex structures while maintaining performance through efficient block management.'
      }
    }
  }
};

// ============================================================================
// ERROR HANDLING COMPARISONS
// ============================================================================

export const ErrorHandlingValid: Story = {
  name: 'Error Handling: Valid Input',
  args: {
    initialScript: `10 Pullups
  20 Pushups
  30 Squats`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Error handling comparison: Valid input processing. All strategies handle valid syntax gracefully and provide appropriate feedback.'
      }
    }
  }
};

export const ErrorHandlingInvalid: Story = {
  name: 'Error Handling: Invalid Input',
  args: {
    initialScript: `invalid syntax here`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Error handling comparison: Invalid input processing. Shows how strategies handle parsing errors and provide user feedback.'
      }
    }
  }
};

export const ErrorHandlingPartial: Story = {
  name: 'Error Handling: Partial Validity',
  args: {
    initialScript: `10 Pullups
  invalid line here
  20 Pushups`,
    showRuntimeStack: true,
    showMemory: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Error handling comparison: Partial validity. Shows how strategies handle mixed valid/invalid input and recover where possible.'
      }
    }
  }
};