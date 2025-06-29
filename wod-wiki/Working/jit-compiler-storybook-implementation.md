---
title: "Implementation: JIT Compiler Storybook Demonstration"
date: 2025-06-29
tags: [implementation, storybook, jit-compiler, runtime-stack]
implements: ../Core/Runtime/JitCompiler.md
related: ["../Core/Runtime/IRuntimeBlock.md", "../Core/Runtime/Stack.md"]
status: complete
---

# Implementation: JIT Compiler Storybook Demonstration

## Overview
This implementation creates a comprehensive Storybook story that demonstrates the [JIT Compiler](../Core/Runtime/JitCompiler.md) functionality with visual runtime stack processing. The story provides an interactive interface showing how workout statements are compiled into runtime blocks and executed through the runtime stack.

## Design Reference
This implementation follows the specifications in [JIT Compiler Design](../Core/Runtime/JitCompiler.md) and demonstrates the runtime stack management described in [Runtime Stack](../Core/Runtime/Stack.md).

## Implementation Details

### File Structure
```
stories/runtime/
├── JitCompiler.stories.tsx      # Storybook story definitions
└── JitCompilerDemo.tsx          # Main demo component
```

### Key Features

#### 1. Runtime Stack Visualization
- **Stack Display**: Shows all blocks in the runtime stack from bottom (root) to top (current)
- **Execution Depth**: Visual indentation indicates block depth in the execution hierarchy
- **Active State**: Highlights currently executing block and shows stack progression
- **Block Types**: Color-coded blocks (Root, Timer, Effort, Group, Completion, Idle)

#### 2. Compilation Process Visualization
- **Phase Indicators**: Shows the four main JIT compilation phases:
  1. Fragment Compilation
  2. Metric Inheritance
  3. Block Creation
  4. Stack Execution
- **Progress Animation**: Visual feedback during compilation with phase transitions
- **Real-time Updates**: Live compilation when workout script is modified

#### 3. Interactive Block Execution
- **Next Button**: Steps through runtime blocks one by one
- **Stack Updates**: Runtime stack updates to reflect current execution state
- **Block Details**: Displays runtime metrics, block types, and execution context
- **Reset Functionality**: Returns to beginning of execution cycle

#### 4. Comprehensive Block Display
- **Runtime Metrics**: Visual representation of compiled metrics (reps, resistance, time, etc.)
- **Block Hierarchy**: Shows parent-child relationships between blocks
- **Execution Context**: Displays block keys, depth, and metric inheritance
- **Type Classification**: Different visual styles for different block types

### Mock Implementation Strategy

Since the actual runtime components are still in development, the story uses comprehensive mocks that demonstrate the intended behavior:

#### Mock Runtime Stack
```typescript
interface MockRuntimeStack {
  blocks: MockRuntimeBlock[];
  currentIndex: number;
}
```

#### Mock Runtime Blocks
```typescript
interface MockRuntimeBlock extends IRuntimeBlock {
  displayName: string;
  description: string;
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Completion' | 'Idle';
  depth: number;
}
```

### Compilation Phases Demonstration

#### Phase 1: Fragment Compilation
- Parses workout statements from the script editor
- Converts code fragments into structured RuntimeMetric objects
- Shows metric types: repetitions, resistance, distance, time, rounds

#### Phase 2: Metric Inheritance
- Demonstrates inheritance from parent blocks in the runtime stack
- Shows how metrics cascade down the execution hierarchy
- Applies composition rules (override, delete, create-only)

#### Phase 3: Block Creation
- Uses strategy pattern to select appropriate block types
- Creates blocks with compiled metrics and proper block keys
- Establishes parent-child relationships

#### Phase 4: Stack Execution
- Shows how blocks are pushed onto and popped from the runtime stack
- Demonstrates the next() method execution flow
- Visualizes stack depth and execution context

### Visual Design Patterns

#### Color Coding
- **Root Blocks**: Slate gray - foundation of execution
- **Timer Blocks**: Blue - time-based operations
- **Effort Blocks**: Green - exercise/movement blocks
- **Group Blocks**: Purple - grouping/repeating constructs
- **Completion Blocks**: Emerald - workflow completion
- **Idle Blocks**: Gray - inactive/waiting states

#### Stack Visualization
- **Indentation**: Shows execution depth through visual nesting
- **Active Indicators**: Green dots and highlighting for active blocks
- **Progression Arrows**: "← CURRENT" indicators for active block
- **Opacity Levels**: Future blocks shown with reduced opacity

## Integration with Existing Patterns

### Parser Story Consistency
- Uses similar fragment visualization patterns from parser stories
- Maintains consistent color schemes and visual metaphors
- Follows established Storybook story structure and naming

### Runtime Design Alignment
- Implements the three-phase compilation process from design docs
- Demonstrates metric inheritance system as specified
- Shows strategy pattern usage for block creation
- Visualizes stack management according to runtime specifications

## Usage Examples

### Basic Workout Compilation
```typescript
export const BasicCompilation = {
  args: {
    text: `(21-15-9) 
  Thrusters 95lb
  Pullups`
  },
};
```

### Timer-Based Workouts
```typescript
export const TimerCompilation = {
  args: {
    text: `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`
  },
};
```

### Complex Nested Structures
```typescript
export const ComplexWorkout = {
  args: {
    text: `(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest`
  },
};
```

## Technical Implementation Notes

### React State Management
- Uses React hooks for managing compilation state
- Implements proper cleanup and phase transitions
- Handles async compilation simulation with timeouts

### Component Architecture
- **JitCompilerDemo**: Main container component
- **RuntimeStackVisualizer**: Dedicated stack visualization
- **CompilationPhaseIndicator**: Phase progress display
- **RuntimeBlockDisplay**: Individual block rendering
- **MetricValueDisplay**: Runtime metric visualization

### Performance Considerations
- Efficient re-rendering with proper React keys
- Optimized stack updates to prevent unnecessary renders
- Lazy loading for large workout compilations

## Validation Checklist

- [x] Complies with JIT Compiler design specifications
- [x] Follows runtime stack management patterns
- [x] Demonstrates all four compilation phases
- [x] Shows proper metric inheritance
- [x] Visualizes block creation strategy pattern
- [x] Maintains consistency with parser story patterns
- [x] Provides interactive execution demonstration
- [x] Includes comprehensive block type support
- [x] Shows proper parent-child block relationships
- [x] Demonstrates stack depth and execution context

## Future Enhancements

### Integration with Real Runtime
- Replace mock implementations with actual runtime components
- Connect to real JIT compiler when available
- Integrate with actual strategy pattern implementations

### Enhanced Visualizations
- Add animation for stack push/pop operations
- Include metric inheritance flow visualization
- Add execution timing and performance metrics

### Extended Block Types
- Support for more complex block strategies
- Demonstration of custom block implementations
- Advanced inheritance pattern examples

## Related Components

- [JIT Compiler Core Design](../Core/Runtime/JitCompiler.md)
- [Runtime Block Interface](../Core/Runtime/IRuntimeBlock.md)
- [Runtime Stack Management](../Core/Runtime/Stack.md)
- [Parser Story Implementations](../stories/parsing/)
