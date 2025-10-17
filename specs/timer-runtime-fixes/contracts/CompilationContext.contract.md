# CompilationContext Enhancement Contract

**Interface**: `CompilationContext` (enhanced)  
**Purpose**: Pass inherited metrics from parent to child during compilation  
**Type**: Value Object  
**Status**: Enhancement (add fields to existing interface)

---

## Interface Definition

```typescript
export interface CompilationContext {
  // EXISTING fields (no changes)
  // ... existing fields ...
  
  // NEW fields (added)
  parentBlock?: IRuntimeBlock;
  inheritedMetrics?: InheritedMetrics;
  roundState?: RoundState;
}

export interface InheritedMetrics {
  reps?: number;
  duration?: number;
  resistance?: number;
}

export interface RoundState {
  currentRound: number;
  totalRounds: number;
  repScheme?: number[];
}
```

---

## Usage Pattern

### Parent Creating Context

```typescript
// RoundsBehavior compiling child
const context: CompilationContext = {
  parentBlock: this.block,
  inheritedMetrics: {
    reps: this.getRepsForCurrentRound()  // 21, 15, or 9
  },
  roundState: {
    currentRound: this.currentRound,
    totalRounds: this.totalRounds,
    repScheme: [21, 15, 9]
  }
};

const childBlock = runtime.jit.compile([child], runtime, context);
```

### Child Consuming Context

```typescript
// EffortStrategy extracting inherited reps
compile(statements: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock {
  // Try inherited reps first
  const inheritedReps = context?.inheritedMetrics?.reps;
  
  // Fallback to fragment reps
  const fragmentReps = this.extractRepsFromFragments(statements);
  
  // Use inherited if available, otherwise fragment
  const reps = inheritedReps ?? fragmentReps;
  
  return new EffortBlock(runtime, statements, reps);
}
```

---

## Test Scenarios

### Should Pass Metrics Through Compilation

```typescript
it('should inherit reps from parent round', () => {
  const context: CompilationContext = {
    inheritedMetrics: { reps: 21 }
  };
  
  const childBlock = jit.compile([effortStatement], runtime, context);
  expect(childBlock.getReps()).toBe(21);
});
```

### Should Fallback to Fragment Metrics

```typescript
it('should use fragment reps when no inheritance', () => {
  const statement = parseWorkout('Thrusters 15');
  const childBlock = jit.compile([statement], runtime); // No context
  expect(childBlock.getReps()).toBe(15);
});
```

---

## Backward Compatibility

**Impact**: None

**Reasoning**: All new fields are optional (undefined by default)

**Migration**: Existing code without context continues working

---

**Status**: ✅ READY FOR IMPLEMENTATION
