# API Contracts: Runtime Blocks

**Feature**: Runtime Block Implementation  
**Date**: 2025-10-08

This document defines the public interfaces (contracts) for the runtime block system. These are TypeScript interfaces that external consumers can rely on.

---

## TimerBlock Public API

### Constructor
```typescript
class TimerBlock implements RuntimeBlock {
  constructor(config: TimerBlockConfig);
}

interface TimerBlockConfig {
  direction: 'up' | 'down';
  durationMs?: number;           // Required for 'down', ignored for 'up'
  children?: RuntimeBlock[];     // Nested blocks to execute
}
```

**Contract**:
- MUST throw TypeError if `direction` is not 'up' or 'down'
- MUST throw TypeError if `direction === 'down'` and `durationMs` is undefined
- MUST throw RangeError if `durationMs` is provided but <= 0
- MUST initialize with `isRunning === false`

### Methods
```typescript
interface TimerBlock {
  // Lifecycle
  push(): void;                  // Start timer
  pop(): void;                   // Stop timer, preserve state
  dispose(): void;               // Cleanup resources
  
  // State access (read-only)
  getElapsedMs(): number;
  getDisplayTime(): number;      // Rounded to 0.1s
  isRunning(): boolean;
  isPaused(): boolean;
  
  // Control
  pause(): void;
  resume(): void;
}
```

**Contracts**:
- `push()`: MUST start timer interval, MUST emit 'timer:started' event
- `pop()`: MUST stop timer interval, MUST NOT reset elapsed time
- `dispose()`: MUST clear all intervals, MUST complete in <50ms
- `pause()`: MUST stop updates, MUST preserve elapsed time
- `resume()`: MUST restart updates from current elapsed time
- `getDisplayTime()`: MUST return value with precision exactly 0.1s

### Events
```typescript
interface TimerTickEvent {
  type: 'timer:tick';
  blockId: string;
  elapsedMs: number;
  displayTime: number;
  direction: 'up' | 'down';
}

interface TimerCompleteEvent {
  type: 'timer:complete';
  blockId: string;
  finalTime: number;             // Exact completion time
}
```

**Contract**:
- `timer:tick` MUST be emitted every ~100ms while running
- `timer:complete` MUST be emitted when countdown reaches zero
- `timer:complete` MUST include exact timestamp at completion

---

## RoundsBlock Public API

### Constructor
```typescript
class RoundsBlock implements RuntimeBlock {
  constructor(config: RoundsBlockConfig);
}

interface RoundsBlockConfig {
  totalRounds: number;
  repScheme?: number[];          // Variable reps per round
  children: RuntimeBlock[];      // Template for each round
}
```

**Contract**:
- MUST throw RangeError if `totalRounds` < 1
- MUST throw TypeError if `children` is empty array
- MUST throw RangeError if `repScheme.length !== totalRounds`
- MUST throw RangeError if any `repScheme` value <= 0

### Methods
```typescript
interface RoundsBlock {
  // Lifecycle
  push(): void;
  pop(): void;
  dispose(): void;
  
  // State access (read-only)
  getCurrentRound(): number;     // 1-indexed
  getTotalRounds(): number;
  getCompletedRounds(): number;
  isComplete(): boolean;
  
  // Compilation context (for JIT)
  getCompilationContext(): RoundCompilationContext;
}

interface RoundCompilationContext {
  currentRound: number;
  totalRounds: number;
  repScheme?: number[];
  
  getRepsForCurrentRound(): number | undefined;
}
```

**Contracts**:
- `push()`: MUST initialize `currentRound = 1`
- `getCurrentRound()`: MUST return value in range [1, totalRounds]
- `getCompilationContext()`: MUST return context with current round data
- `getRepsForCurrentRound()`: MUST return `repScheme[currentRound - 1]` if scheme exists

### Events
```typescript
interface RoundsChangedEvent {
  type: 'rounds:changed';
  blockId: string;
  currentRound: number;
  totalRounds: number;
  completedRounds: number;
}

interface RoundsCompleteEvent {
  type: 'rounds:complete';
  blockId: string;
  totalRoundsCompleted: number;
}
```

**Contract**:
- `rounds:changed` MUST be emitted when `currentRound` advances
- `rounds:complete` MUST be emitted when `currentRound > totalRounds`
- Events MUST include accurate round counts

---

## EffortBlock Public API

### Constructor
```typescript
class EffortBlock implements RuntimeBlock {
  constructor(config: EffortBlockConfig);
}

interface EffortBlockConfig {
  exerciseName: string;
  targetReps: number;
}
```

**Contract**:
- MUST throw TypeError if `exerciseName` is empty string
- MUST throw RangeError if `targetReps` < 1
- MUST initialize with `currentReps = 0`

### Methods
```typescript
interface EffortBlock {
  // Lifecycle
  push(): void;
  pop(): void;
  dispose(): void;
  
  // State access (read-only)
  getExerciseName(): string;
  getTargetReps(): number;
  getCurrentReps(): number;
  isComplete(): boolean;
  
  // Rep tracking (user actions)
  incrementRep(): void;          // Add 1 rep
  setReps(count: number): void;  // Bulk entry
  markComplete(): void;          // Force complete
}
```

**Contracts**:
- `incrementRep()`: MUST increment `currentReps` by 1, MUST emit 'reps:updated'
- `setReps(count)`: MUST set `currentReps = count`, MUST emit 'reps:updated'
- `setReps(count)`: MUST throw RangeError if `count < 0` or `count > targetReps`
- `markComplete()`: MUST set `currentReps = targetReps`, MUST emit 'reps:complete'
- `isComplete()`: MUST return true when `currentReps >= targetReps`

### Events
```typescript
interface RepsUpdatedEvent {
  type: 'reps:updated';
  blockId: string;
  exerciseName: string;
  currentReps: number;
  targetReps: number;
  completionMode: 'incremental' | 'bulk';
}

interface RepsCompleteEvent {
  type: 'reps:complete';
  blockId: string;
  exerciseName: string;
  finalReps: number;
}
```

**Contract**:
- `reps:updated` MUST be emitted after every rep change
- `reps:complete` MUST be emitted when target reached
- `completionMode` MUST reflect last update method used

---

## JitCompiler Extensions

### New Compilation Methods
```typescript
interface JitCompiler {
  // Existing methods...
  
  // New block compilation
  compileTimerBlock(node: TimerNode, context: CompilationContext): TimerBlock;
  compileRoundsBlock(node: RoundsNode, context: CompilationContext): RoundsBlock;
  compileEffortBlock(node: EffortNode, context: CompilationContext): EffortBlock;
}

interface CompilationContext {
  // Existing context fields...
  
  // Round context (provided by RoundsBehavior)
  currentRound?: number;
  repScheme?: number[];
}
```

**Contracts**:
- Compilation methods MUST return valid block instances
- MUST apply `context.repScheme` when compiling EffortBlocks inside RoundsBlocks
- MUST validate AST nodes before compilation
- MUST throw CompilationError for invalid AST structures

---

## ScriptRuntime Extensions

### Event System
```typescript
interface ScriptRuntime {
  // Existing methods...
  
  // Event emission (used by behaviors)
  emit(eventType: string, data: any): void;
  
  // Event subscription (for UI components)
  on(eventType: string, handler: (event: any) => void): () => void;
  
  // Block stack access (read-only)
  getCurrentBlock(): RuntimeBlock | undefined;
  getBlockById(id: string): RuntimeBlock | undefined;
}
```

**Contracts**:
- `emit()`: MUST notify all subscribed handlers synchronously
- `on()`: MUST return unsubscribe function
- Unsubscribe function MUST remove handler from registry
- `getCurrentBlock()`: MUST return topmost block on stack or undefined

---

## Performance Contracts

### Timing Requirements
```typescript
interface PerformanceContract {
  'block:push': '< 1ms (99th percentile)';
  'block:pop': '< 1ms (99th percentile)';
  'block:dispose': '< 50ms (max)';
  'timer:tick': '< 16ms (max for 60fps)';
  'jit:compile': '< 100ms (typical workout)';
}
```

**Validation**: Performance tests MUST measure and assert these requirements.

---

## Error Handling Contracts

### Error Types
```typescript
class BlockConfigurationError extends Error {
  constructor(blockType: string, message: string);
}

class BlockLifecycleError extends Error {
  constructor(blockId: string, operation: string, message: string);
}

class CompilationError extends Error {
  constructor(nodeType: string, message: string);
}
```

**Contracts**:
- Invalid configuration MUST throw `BlockConfigurationError` during construction
- Invalid lifecycle operations MUST throw `BlockLifecycleError`
- Invalid AST nodes MUST throw `CompilationError` during compilation
- All errors MUST include descriptive messages for debugging

---

## Backward Compatibility

### Existing RuntimeBlock Interface
All new blocks MUST implement existing `RuntimeBlock` interface without breaking changes.

### Existing Behaviors
New behaviors MUST follow existing behavior pattern:
- Implement `RuntimeBehavior` interface
- Support lifecycle hooks: `onPush`, `onPop`, `onNext`, `onEvent`
- Properly clean up in `dispose()`

---

**Status**: Contracts defined ✅  
**Test Coverage**: Each contract requires corresponding contract test
