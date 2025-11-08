# JIT Compilation Testing Deep Dive

## Overview

This document provides a comprehensive analysis of the Just-In-Time (JIT) compilation testing architecture for the WOD (Workout of the Day) scripting language runtime. The JIT system dynamically compiles parsed statements into executable runtime blocks using a strategy pattern approach, enabling flexible and extensible workout execution.

## Table of Contents

1. [JIT Compilation Architecture](#jit-compilation-architecture)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Core JIT Components](#core-jit-components)
4. [Strategy Pattern Testing](#strategy-pattern-testing)
5. [Block Compilation Testing](#block-compilation-testing)
6. [Fragment Compilation Testing](#fragment-compilation-testing)
7. [Testing Patterns and Best Practices](#testing-patterns-and-best-practices)
8. [Compilation Context Testing](#compilation-context-testing)
9. [Performance and Memory Testing](#performance-and-memory-testing)
10. [Error Handling and Edge Cases](#error-handling-and-edge-cases)
11. [Future Testing Enhancements](#future-testing-enhancements)

## JIT Compilation Architecture

### 1. Central JIT Compiler (`JitCompiler.ts`)

The JIT compiler serves as the central compilation engine coordinating strategy selection and block creation:

```typescript
export class JitCompiler {
  constructor(private strategies: IRuntimeBlockStrategy[] = []) {
  }

  registerStrategy(strategy: IRuntimeBlockStrategy): void {
    this.strategies.push(strategy);
  }

  compile(nodes: CodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock | undefined {
    if (nodes.length === 0) {
      console.warn('JitCompiler: No nodes to compile.');
      return undefined;
    }

    for (const strategy of this.strategies) {
      if (strategy.match(nodes, runtime)) {
        return strategy.compile(nodes, runtime, context);
      }
    }
    console.warn('JitCompiler: No suitable strategy found.');
    return undefined;
  }
}
```

**Key Features:**
- **Strategy Pattern**: Pluggable compilation strategies
- **Priority-Based**: First matching strategy wins
- **Context Support**: Compilation context for metric inheritance
- **Graceful Fallback**: Returns undefined when no strategy matches

### 2. Strategy Interface (`IRuntimeBlockStrategy.ts`)

Defines the contract for compilation strategies:

```typescript
export interface IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
    compile(statements: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock;
}
```

**Strategy Types:**
- **TimerStrategy**: Compiles timer-based blocks
- **RoundsStrategy**: Compiles round-based workout blocks
- **EffortStrategy**: Compiles simple effort blocks (fallback)
- **IntervalStrategy**: Compiles EMOM-style interval workouts
- **TimeBoundRoundsStrategy**: Compiles AMRAP-style time-bound rounds
- **GroupStrategy**: Compiles generic grouping constructs

### 3. Compilation Context (`CompilationContext.ts`)

Enables metric inheritance from parent blocks to child blocks:

```typescript
export interface CompilationContext {
  round?: number;
  totalRounds?: number;
  position?: number;
  reps?: number;
  intervalDurationMs?: number;
  parent?: CompilationContext;
  parentBlock?: any;
  inheritedMetrics?: InheritedMetrics;
  roundState?: RoundState;
}
```

**Use Cases:**
- **Rep Scheme Inheritance**: Parent rounds provide reps to child exercises
- **Context Propagation**: Nested blocks access grandparent context
- **Round State Management**: Complete round context for child compilation

### 4. Fragment Compilation (`FragmentCompilers.ts`)

Transforms individual fragments into runtime metrics:

```typescript
export class RepFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rep';
    compile(fragment: RepFragment, _context: IScriptRuntime): MetricValue[] {
        return [{ type: 'repetitions', value: fragment.value, unit: '' }];
    }
}
```

**Fragment Types:**
- **RepFragment**: Repetition counts
- **TimerFragment**: Time durations
- **ResistanceFragment**: Weight/Resistance values
- **DistanceFragment**: Distance measurements
- **ActionFragment**: Workout actions and tags

## Testing Infrastructure

### Test Configuration

The JIT compilation tests are organized under `tests/jit-compilation/` and include:

- **block-compilation.test.ts**: Block creation and metadata testing
- **strategy-matching.test.ts**: Strategy selection logic testing
- **strategy-precedence.test.ts**: Strategy precedence and order testing
- **fragment-compilation.test.ts**: Fragment-to-metric transformation testing

### Test Environment Setup

Comprehensive mocking for runtime components:

```typescript
beforeEach(() => {
  mockJitCompiler = {
    compile: vi.fn(),
    strategies: []
  };

  mockStack = {
    push: vi.fn(),
    pop: vi.fn(),
    current: vi.fn(),
    peek: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn()
  };

  mockMemory = {
    allocate: vi.fn((type, ownerId, initialValue, visibility) => ({
      id: `ref-${type}`,
      ownerId,
      type,
      visibility,
      get: vi.fn(() => initialValue),
      set: vi.fn()
    })),
    get: vi.fn(),
    set: vi.fn(),
    search: vi.fn(() => []),
    release: vi.fn()
  };
});
```

## Core JIT Components

### 1. Runtime Block (`RuntimeBlock.ts`)

Base class for all compiled runtime blocks:

```typescript
export class RuntimeBlock implements IRuntimeBlock {
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;
    public readonly blockType?: string;
    public readonly context: IBlockContext;
    
    constructor(
        protected _runtime: IScriptRuntime,
        public readonly sourceIds: number[] = [],
        behaviors: IRuntimeBehavior[] = [],
        contextOrBlockType?: IBlockContext | string,
        blockKey?: BlockKey,
        blockTypeParam?: string
    ) {
        // Implementation...
    }
}
```

**Key Features:**
- **Behavior Composition**: Pluggable behaviors for different execution patterns
- **Memory Management**: Automatic memory allocation and cleanup
- **Lifecycle Management**: Mount, next, unmount, and dispose methods
- **Type Safety**: TypeScript interfaces for compile-time checking

### 2. Specialized Blocks

**RoundsBlock**: Multi-round workout execution with rep schemes
**TimerBlock**: Timer-based workout execution
**EffortBlock**: Simple effort-based workout execution

## Strategy Pattern Testing

### 1. Strategy Matching Tests (`strategy-matching.test.ts`)

**Purpose**: Validate strategy selection logic

**Test Coverage**:
```typescript
describe('TSC-001: TimerStrategy matches statements with Timer fragments', () => {
  it('should return true when statement contains Timer fragment', () => {
    // GIVEN: A code statement with Timer fragment
    const statement: ICodeStatement = {
      id: new BlockKey('test-1'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
      ],
      children: [],
      meta: undefined
    };

    // WHEN: TimerStrategy.match() is called
    const strategy = new TimerStrategy();
    const result = strategy.match([statement], mockRuntime);

    // THEN: Returns true
    expect(result).toBe(true);
  });
});
```

**Key Test Areas:**
- **Positive Matching**: Correct fragment combinations match appropriate strategies
- **Negative Matching**: Incorrect fragment combinations are rejected
- **Edge Cases**: Empty arrays, missing fragments, undefined values
- **Precedence Validation**: Specific strategies match before general ones

### 2. Strategy Precedence Tests (`strategy-precedence.test.ts`)

**Purpose**: Validate strategy registration order and precedence

**Test Coverage**:
```typescript
describe('TSP-001: TimerStrategy evaluated before RoundsStrategy', () => {
  it('should compile Timer block when both TimerStrategy and RoundsStrategy registered', () => {
    // GIVEN: JitCompiler with TimerStrategy and RoundsStrategy registered
    const compiler = new JitCompiler();
    compiler.registerStrategy(new TimerStrategy());
    compiler.registerStrategy(new RoundsStrategy());

    // GIVEN: Statement with Timer fragment
    const statement: ICodeStatement = {
      id: new BlockKey('test-1'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
      ],
      children: [],
      meta: undefined
    };

    // WHEN: Compiler compiles statement
    const block = compiler.compile([statement], mockRuntime);

    // THEN: Block has Timer type (not Rounds)
    expect(block).toBeDefined();
    expect(block!.blockType).toBe("Timer");
  });
});
```

**Precedence Rules:**
1. **TimerStrategy**: Timer fragments (most specific)
2. **RoundsStrategy**: Rounds fragments
3. **IntervalStrategy**: Timer + EMOM action combinations
4. **TimeBoundRoundsStrategy**: Timer + Rounds/AMRAP combinations
5. **GroupStrategy**: Statements with children but no specific fragments
6. **EffortStrategy**: Pure effort statements (fallback)

## Block Compilation Testing

### 1. Block Creation Tests (`block-compilation.test.ts`)

**Purpose**: Validate proper block creation and metadata

**Test Coverage**:
```typescript
describe('TBC-001: TimerStrategy compiles block with "Timer" type metadata', () => {
  it('should create block with Timer type when compiling timer statement with children', () => {
    // GIVEN: A timer statement with children
    const statement: ICodeStatement = {
      id: new BlockKey('timer-1'),
      fragments: [
        { fragmentType: FragmentType.Timer, value: 1200, type: 'timer' }
      ],
      children: [
        { id: new BlockKey('child-1'), fragments: [], children: [], meta: undefined }
      ],
      meta: undefined
    };

    // WHEN: TimerStrategy.compile() is called
    const strategy = new TimerStrategy();
    const block = strategy.compile([statement], mockRuntime);

    // THEN: Block has Timer type metadata
    expect(block).toBeDefined();
    expect(block!.blockType).toBe("Timer");
    expect(block!.sourceIds).toEqual([statement.id]);
  });
});
```

**Validation Points:**
- **Block Type Metadata**: Correct block type assignment
- **Source ID Preservation**: Original statement ID tracking
- **Runtime Reference**: Runtime instance accessibility
- **Multiple Statement Handling**: Edge case with multiple statements

### 2. Block Lifecycle Testing

**Mount Phase**:
- Block initialization and setup
- Memory allocation and event registration
- Behavior initialization

**Next Phase**:
- Child block coordination
- Progress tracking
- Event emission

**Unmount Phase**:
- Cleanup and resource release
- Result collection
- State preservation

## Fragment Compilation Testing

### 1. Fragment Compiler Tests (`fragment-compilation.test.ts`)

**Purpose**: Validate fragment-to-metric transformation

**Current Status**: TODO - Tests planned but not yet implemented

**Planned Test Areas:**
```typescript
/**
 * TODO: Implement FragmentCompilationManager and fragment compiler validation
 * - Test TimerFragmentCompiler
 * - Test RoundsFragmentCompiler
 * - Test EffortFragmentCompiler
 * - Test RepFragmentCompiler
 * - Test ActionFragmentCompiler
 * - Test DistanceFragmentCompiler
 * - Test WeightFragmentCompiler
 * - Test MetricValue output format validation
 * - Test compiler registration and lookup
 * - Test fragment → MetricValue[] transformation
 */
```

### 2. Fragment Types and Compilers

**TimerFragmentCompiler**:
```typescript
export class TimerFragmentCompiler implements IFragmentCompiler {
    readonly type = 'duration';
    compile(fragment: TimerFragment, _context: IScriptRuntime): MetricValue[] {
        return [{ type: 'time', value: fragment.value, unit: 'ms' }];
    }
}
```

**RepFragmentCompiler**:
```typescript
export class RepFragmentCompiler implements IFragmentCompiler {
    readonly type = 'rep';
    compile(fragment: RepFragment, _context: IScriptRuntime): MetricValue[] {
        return [{ type: 'repetitions', value: fragment.value, unit: '' }];
    }
}
```

## Testing Patterns and Best Practices

### 1. AAA Pattern (Arrange, Act, Assert)

Consistent use of AAA pattern across all JIT tests:

```typescript
it('should compile timer statement with proper block type', () => {
  // Arrange
  const statement = createTimerStatement(1200);
  const strategy = new TimerStrategy();
  
  // Act
  const block = strategy.compile([statement], mockRuntime);
  
  // Assert
  expect(block).toBeDefined();
  expect(block!.blockType).toBe("Timer");
});
```

### 2. Test Data Factories

**Mock Statement Creation**:
```typescript
const createTimerStatement = (value: number): ICodeStatement => ({
  id: new BlockKey(`timer-${value}`),
  fragments: [
    { fragmentType: FragmentType.Timer, value, type: 'timer' }
  ],
  children: [],
  meta: undefined
});

const createRoundsStatement = (rounds: number): ICodeStatement => ({
  id: new BlockKey(`rounds-${rounds}`),
  fragments: [
    { fragmentType: FragmentType.Rounds, value: rounds, type: 'rounds' }
  ],
  children: [],
  meta: undefined
});
```

### 3. Comprehensive Mock Runtime

**Memory Management Mocking**:
```typescript
const mockMemory = {
  allocate: vi.fn((type, ownerId, initialValue, visibility) => ({
    id: `ref-${type}`,
    ownerId,
    type,
    visibility,
    get: vi.fn(() => initialValue),
    set: vi.fn()
  })),
  search: vi.fn(() => []),
  release: vi.fn()
};
```

### 4. Strategy Test Naming Convention

**TSC (Strategy Contract) Tests**:
- TSC-001: TimerStrategy matching positive case
- TSC-002: TimerStrategy matching negative case
- TSC-003: RoundsStrategy matching positive case

**TSP (Strategy Precedence) Tests**:
- TSP-001: TimerStrategy precedence over RoundsStrategy
- TSP-002: RoundsStrategy precedence over EffortStrategy
- TSP-003: EffortStrategy fallback behavior

**TBC (Block Compilation) Tests**:
- TBC-001: TimerStrategy block type metadata
- TBC-002: RoundsStrategy block type metadata
- TBC-003: EffortStrategy block type metadata

## Compilation Context Testing

### 1. Context Propagation

**Parent-to-Child Context Inheritance**:
```typescript
describe('Compilation Context Inheritance', () => {
  it('should inherit reps from parent rounds block', () => {
    // GIVEN: Parent context with reps
    const parentContext: CompilationContext = {
      round: 1,
      totalRounds: 3,
      reps: 21,
      roundState: {
        currentRound: 1,
        totalRounds: 3,
        repScheme: [21, 15, 9]
      }
    };

    // WHEN: Child block compiled with context
    const childBlock = strategy.compile([childStatement], mockRuntime, parentContext);

    // THEN: Child block inherits reps from context
    expect(childBlock).toBeDefined();
    // Additional context inheritance validation
  });
});
```

### 2. Metric Inheritance

**Inherited Metrics Interface**:
```typescript
export interface InheritedMetrics {
  reps?: number;
  duration?: number;
  resistance?: number;
}
```

**Use Case Example - Fran Workout**:
```
(21-15-9) Thrusters, Pullups
```

- **RoundsBlock Context**: round=1, totalRounds=3, reps=21
- **Thrusters Child**: Inherits reps=21 from context
- **Pullups Child**: Inherits reps=21 from context
- **Round 2 Context**: round=2, totalRounds=3, reps=15

## Performance and Memory Testing

### 1. Compilation Performance

**Performance Requirements**:
- **Compilation Speed**: <50ms for typical workout statements
- **Memory Usage**: Efficient memory allocation and cleanup
- **Strategy Selection**: Fast matching algorithm

**Performance Testing Framework**:
```typescript
describe('JIT Compilation Performance', () => {
  it('should compile simple statements within performance threshold', () => {
    const statements = Array(100).fill(null).map((_, i) => 
      createEffortStatement(`Exercise-${i}`)
    );
    
    const start = performance.now();
    statements.forEach(stmt => compiler.compile([stmt], mockRuntime));
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // 100ms for 100 compilations
  });
});
```

### 2. Memory Management Testing

**Resource Cleanup Validation**:
```typescript
describe('Memory Management', () => {
  it('should properly clean up memory on block disposal', () => {
    const memoryRefs: string[] = [];
    
    // Track memory allocations
    mockRuntime.memory.allocate = vi.fn((type, ownerId, initialValue, visibility) => {
      const ref = `ref-${type}-${Math.random()}`;
      memoryRefs.push(ref);
      return { id: ref, get: vi.fn(() => initialValue), set: vi.fn() };
    });
    
    // Compile and dispose block
    const block = strategy.compile([statement], mockRuntime);
    block.dispose(mockRuntime);
    
    // Verify cleanup
    expect(mockRuntime.memory.release).toHaveBeenCalledTimes(memoryRefs.length);
  });
});
```

## Error Handling and Edge Cases

### 1. Strategy Matching Edge Cases

**Defensive Programming Tests**:
```typescript
describe('Edge Cases and Error Handling', () => {
  it('should handle empty statements array gracefully', () => {
    const strategy = new TimerStrategy();
    expect(strategy.match([], mockRuntime)).toBe(false);
  });
  
  it('should handle undefined fragments array', () => {
    const statement: ICodeStatement = {
      id: new BlockKey('test'),
      fragments: undefined as any,
      children: [],
      meta: undefined
    };
    
    const strategy = new TimerStrategy();
    expect(strategy.match([statement], mockRuntime)).toBe(false);
  });
});
```

### 2. Compilation Error Recovery

**Graceful Error Handling**:
```typescript
describe('Compilation Error Recovery', () => {
  it('should return undefined when no strategy matches', () => {
    const compiler = new JitCompiler();
    // No strategies registered
    
    const result = compiler.compile([statement], mockRuntime);
    expect(result).toBeUndefined();
  });
  
  it('should handle compilation failures gracefully', () => {
    const strategy = new TimerStrategy();
    vi.spyOn(strategy, 'compile').mockImplementation(() => {
      throw new Error('Compilation failed');
    });
    
    const compiler = new JitCompiler();
    compiler.registerStrategy(strategy);
    
    expect(() => compiler.compile([statement], mockRuntime)).not.toThrow();
    // Should handle error and return undefined
  });
});
```

## Advanced Testing Scenarios

### 1. Complex Workout Structures

**Nested Block Testing**:
```typescript
describe('Complex Workout Structures', () => {
  it('should compile nested rounds with rep schemes', () => {
    const complexWorkout = {
      id: new BlockKey('complex'),
      fragments: [
        { fragmentType: FragmentType.Rounds, value: 3, type: 'rounds' }
      ],
      children: [
        {
          id: new BlockKey('round-1'),
          fragments: [
            { fragmentType: FragmentType.Effort, value: 'Thrusters', type: 'effort' },
            { fragmentType: FragmentType.Rep, value: 21, type: 'rep' }
          ],
          children: [],
          meta: undefined
        }
      ],
      meta: undefined
    };
    
    const block = compiler.compile([complexWorkout], mockRuntime);
    expect(block).toBeDefined();
    expect(block!.blockType).toBe("Rounds");
  });
});
```

### 2. Integration Testing

**End-to-End Compilation Testing**:
```typescript
describe('JIT Compilation Integration', () => {
  it('should compile complete workout from parsed statements', () => {
    // GIVEN: Parsed workout statements
    const parsedStatements = [
      createTimerStatement(1200), // 20:00 AMRAP
      createRoundsStatement(5)    // With children
    ];
    
    // WHEN: JIT compiles to runtime blocks
    const blocks = parsedStatements.map(stmt => 
      compiler.compile([stmt], mockRuntime)
    ).filter(Boolean);
    
    // THEN: Valid runtime blocks created
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.blockType).toBe("Timer");
    expect(blocks[1]!.blockType).toBe("Rounds");
  });
});
```

## Future Testing Enhancements

### 1. Planned Improvements

**Fragment Compilation Testing**:
- Implement comprehensive fragment compiler tests
- Validate metric value transformations
- Test compiler registration and lookup
- Validate output format standardization

**Advanced Strategy Testing**:
- Complex strategy combination scenarios
- Dynamic strategy registration testing
- Strategy performance optimization testing
- Custom strategy extension testing

### 2. Test Coverage Expansion

**Additional Test Areas**:
- **Concurrent Compilation**: Multiple compilation operations
- **Memory Pressure**: Compilation under memory constraints
- **Large Workouts**: Compilation of complex workout structures
- **Error Recovery**: Robust error handling and recovery
- **Performance Regression**: Continuous performance monitoring

### 3. Test Automation and CI/CD

**Automated Testing Pipeline**:
- Automated JIT test execution on code changes
- Performance regression detection and alerting
- Memory usage monitoring and reporting
- Compilation time benchmarks and trend analysis

**Test Data Management**:
- Automated test case generation
- Workout statement factory patterns
- Mock runtime scenario libraries
- Edge case test data repositories

## Conclusion

The JIT compilation testing architecture demonstrates a comprehensive approach to dynamic code compilation validation. The testing strategy encompasses:

1. **Strategy Pattern Testing**: Validation of flexible compilation strategy selection
2. **Block Creation Testing**: Proper runtime block instantiation and metadata
3. **Fragment Compilation Testing**: Accurate fragment-to-metric transformation
4. **Context Propagation Testing**: Metric inheritance and parent-child relationships
5. **Performance Testing**: Compilation speed and memory efficiency validation
6. **Error Handling Testing**: Robust error recovery and edge case management

The testing infrastructure provides a solid foundation for JIT compiler development, maintenance, and enhancement. The comprehensive test suite ensures the reliability, performance, and correctness of the JIT compilation system, supporting the dynamic execution of complex workout definitions.

The modular approach to testing, combined with comprehensive mocking and clear test organization, enables confident development of new compilation strategies and runtime behaviors while maintaining backward compatibility and system stability.

This testing approach ensures the JIT compilation system can reliably transform parsed workout statements into executable runtime blocks, supporting the full range of workout types and execution patterns required by the WOD scripting language.
