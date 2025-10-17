# Phase 1: Data Model

**Feature**: Timer Runtime Coordination Fixes  
**Date**: October 16, 2025  
**Status**: Complete

---

## Entity Overview

This feature introduces coordination logic for existing runtime entities. No new domain entities are created; instead, we enhance coordination between existing blocks, behaviors, and compilation contexts.

---

## Entity 1: CompilationContext

**Purpose**: Carries inherited metrics and parent context during JIT compilation

**Location**: `src/runtime/CompilationContext.ts`

**Type**: Value Object (immutable compilation state)

###

 Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `parentBlock` | `IRuntimeBlock \| undefined` | No | Reference to immediate parent block | Must implement IRuntimeBlock if present |
| `inheritedMetrics` | `InheritedMetrics \| undefined` | No | Metrics passed from parent to child | Must match InheritedMetrics interface |
| `roundState` | `RoundState \| undefined` | No | Current round information from RoundsBlock | Must match RoundState interface |

### Nested Type: InheritedMetrics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reps` | `number \| undefined` | No | Rep count from parent RoundsBlock |
| `duration` | `number \| undefined` | No | Duration in ms from parent TimerBlock |
| `resistance` | `number \| undefined` | No | Resistance value from parent context |

### Nested Type: RoundState

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentRound` | `number` | Yes | Current round number (1-indexed) |
| `totalRounds` | `number` | Yes | Total number of rounds |
| `repScheme` | `number[] \| undefined` | No | Rep scheme array (e.g., [21, 15, 9]) |

### Relationships

- **Created by**: JitCompiler when compiling child blocks
- **Consumed by**: All IRuntimeBlockStrategy implementations
- **Flows through**: Parent compilation → JIT compile → Child constructor

### State Transitions

N/A - Immutable value object created per compilation

### Example

```typescript
// RoundsBlock compiling first child with context
const context: CompilationContext = {
  parentBlock: this,
  inheritedMetrics: {
    reps: 21  // From getRepsForCurrentRound()
  },
  roundState: {
    currentRound: 1,
    totalRounds: 3,
    repScheme: [21, 15, 9]
  }
};

const childBlock = runtime.jit.compile([firstChild], runtime, context);
```

---

## Entity 2: TimerBlockConfig

**Purpose**: Configuration object for TimerBlock constructor

**Location**: `src/runtime/blocks/TimerBlock.ts`

**Type**: Configuration Object (constructor parameter)

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `direction` | `'up' \| 'down'` | Yes | Timer direction (count-up or countdown) | Must be 'up' or 'down' |
| `durationMs` | `number \| undefined` | No | Duration in milliseconds (for countdown) | Must be > 0 if present |
| `children` | `ICodeStatement[] \| undefined` | No | Child statements to execute | Must be valid statements |

### Changes from Current

**ADDED**: `children` field to enable TimerBlock wrapping child blocks

**Backward Compatibility**: Field is optional, existing TimerBlocks work unchanged

### Example

```typescript
// AMRAP workout configuration
const config: TimerBlockConfig = {
  direction: 'down',          // Countdown timer
  durationMs: 1200000,        // 20:00 minutes
  children: [                 // Wrap RoundsBlock
    roundsBlockStatement
  ]
};

const timerBlock = new TimerBlock(runtime, [stmt.id], config);
```

---

## Entity 3: LoopCoordinatorState

**Purpose**: Internal state for LoopCoordinatorBehavior

**Location**: `src/runtime/behaviors/LoopCoordinatorBehavior.ts`

**Type**: Behavior State (private instance fields)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | `'rounds' \| 'timed-rounds' \| 'intervals'` | Yes | Coordination mode |
| `isComplete` | `boolean` | Yes | Whether looping should stop |

### State Transitions

```
Initial → Looping → Complete
  ↓         ↓
  └─────────┘
  (loop cycles)
```

**Transitions**:
1. **Initial → Looping**: First onNext() call, start looping
2. **Looping → Looping**: Child completes, loop to next child
3. **Looping → Complete**: All rounds done OR timer expires

**Guards**:
- Can loop if: currentRound <= totalRounds
- Must complete if: currentRound > totalRounds OR timer expired

---

## Entity 4: BehaviorCoordinationKey

**Purpose**: Duck-typing keys for discovering sibling behaviors

**Location**: Used throughout behaviors for coordination

**Type**: String constant (behavior name pattern)

### Values

| Key | Matches Behavior | Purpose |
|-----|------------------|---------|
| `'ChildAdvancement'` | `ChildAdvancementBehavior` | Find child management behavior |
| `'Rounds'` | `RoundsBehavior` | Find rounds tracking behavior |
| `'Timer'` | `TimerBehavior` | Find timer tracking behavior |
| `'LazyCompilation'` | `LazyCompilationBehavior` | Find compilation behavior |
| `'LoopCoordinator'` | `LoopCoordinatorBehavior` | Find loop coordination behavior |

### Usage Pattern

```typescript
private findBehavior<T>(block: IRuntimeBlock, pattern: string): T | undefined {
  if (!(block as any).behaviors) return undefined;
  return (block as any).behaviors.find((b: any) => 
    b.constructor.name.includes(pattern)
  );
}

// Example usage
const childBehavior = this.findBehavior<ChildAdvancementBehavior>(
  block, 
  'ChildAdvancement'
);
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ JitCompiler.compile()                                       │
│                                                             │
│ 1. Match strategy (TimeBoundRoundsStrategy)                │
│ 2. Extract fragments (Timer, Rounds, Action)               │
│ 3. Create CompilationContext with inheritedMetrics         │
│ 4. Call strategy.compile(statements, runtime, context)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ TimeBoundRoundsStrategy.compile()                          │
│                                                             │
│ 1. Create RoundsBlock with LoopCoordinatorBehavior         │
│ 2. Create TimerBlock with TimerBlockConfig{children}       │
│ 3. Return TimerBlock (wraps RoundsBlock)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime Stack Push (TimerBlock)                            │
│                                                             │
│ 1. TimerBlock.mount() → TimerBehavior.onPush()            │
│ 2. Start timer, emit timer:started                        │
│ 3. ChildAdvancementBehavior.onPush()                      │
│ 4. Auto-push first child (RoundsBlock)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime Stack Push (RoundsBlock)                           │
│                                                             │
│ 1. RoundsBlock.mount() → RoundsBehavior.onPush()          │
│ 2. Initialize currentRound = 1                            │
│ 3. Compile first child with CompilationContext            │
│    - inheritedMetrics.reps = getRepsForCurrentRound()     │
│ 4. Return PushBlockAction(childBlock)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime Stack Push (EffortBlock - "Thrusters")            │
│                                                             │
│ 1. EffortBlock constructor receives reps from context     │
│ 2. EffortBlock.mount() → EffortBehavior.onPush()         │
│ 3. Execute with inherited reps (21)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ User Completes "Thrusters" → PopBlockAction                │
│                                                             │
│ 1. EffortBlock.unmount() → EffortBehavior.onPop()        │
│ 2. EffortBlock.dispose() - cleanup                        │
│ 3. RoundsBlock.next() - child completed                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ RoundsBlock Coordination (next child)                      │
│                                                             │
│ 1. ChildAdvancementBehavior.onNext() - increment index    │
│ 2. LazyCompilationBehavior.onNext() - compile next child  │
│    - Calculate nextIndex = currentIndex + 1               │
│    - Pass CompilationContext with reps=21                 │
│ 3. Return PushBlockAction("Pullups" block)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ "Pullups" Completes → RoundsBlock.next() Again            │
│                                                             │
│ 1. ChildAdvancementBehavior - index now at end of children│
│ 2. LoopCoordinatorBehavior.onNext() - coordinate loop     │
│    - childIndex >= children.length (TRUE)                 │
│    - currentRound < totalRounds (1 < 3, TRUE)             │
│    - Reset childIndex = 0                                 │
│    - Increment currentRound = 2                           │
│    - Compile first child with reps=15 (round 2)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Loop Continues for Rounds 2 and 3...                       │
│                                                             │
│ Round 2: Thrusters (15 reps), Pullups (15 reps)           │
│ Round 3: Thrusters (9 reps), Pullups (9 reps)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Workout Complete                                           │
│                                                             │
│ 1. LoopCoordinatorBehavior - all rounds done              │
│ 2. Emit rounds:complete event                             │
│ 3. PopBlockAction(RoundsBlock)                            │
│ 4. TimerBlock detects no active child                     │
│ 5. PopBlockAction(TimerBlock)                             │
│ 6. Timer stops, workout complete                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory State During Execution

### Round 1, Exercise 1 ("Thrusters")

```typescript
{
  // RoundsBlock memory
  "rounds-state-{roundsBlockKey}": {
    currentRound: 1,
    totalRounds: 3,
    completedRounds: 0
  },
  
  // TimerBlock memory
  "timer-time-spans-{timerBlockKey}": [
    { start: Date("2025-10-16T20:00:00Z"), stop: undefined }
  ],
  "timer-is-running-{timerBlockKey}": true,
  
  // EffortBlock memory
  "effort-state-{effortBlockKey}": {
    exercise: "Thrusters",
    reps: 21,  // ← Inherited from RoundsBlock!
    completed: false
  }
}
```

### Round 2, Exercise 2 ("Pullups")

```typescript
{
  // RoundsBlock memory (updated)
  "rounds-state-{roundsBlockKey}": {
    currentRound: 2,
    totalRounds: 3,
    completedRounds: 1
  },
  
  // EffortBlock memory (new block)
  "effort-state-{effortBlockKey2}": {
    exercise: "Pullups",
    reps: 15,  // ← Inherited from RoundsBlock, round 2!
    completed: false
  }
}
```

---

## Validation Rules

### CompilationContext Validation

1. **inheritedMetrics.reps**: If present, must be > 0
2. **inheritedMetrics.duration**: If present, must be > 0
3. **roundState.currentRound**: If present, must be >= 1
4. **roundState.totalRounds**: If present, must be >= currentRound

### TimerBlockConfig Validation

1. **direction**: Must be exactly 'up' or 'down' (TypeScript enforces)
2. **durationMs**: If direction='down', must be present and > 0
3. **children**: If present, each must have valid id field

### LoopCoordinator State Validation

1. **Child index bounds**: 0 <= currentChildIndex < children.length
2. **Round bounds**: 1 <= currentRound <= totalRounds
3. **Completion consistency**: If isComplete=true, no more loops

---

## Interface Contracts

### No Changes to Public Interfaces

**Critical Constraint**: NO modifications to:
- `IRuntimeBlock`
- `IScriptRuntime`
- `IRuntimeBehavior`
- `RuntimeStack`

All enhancements use:
- **Optional fields** in existing interfaces (e.g., CompilationContext)
- **Duck-typing** for behavior discovery (no interface changes)
- **Composition** for new behaviors (add to behavior array)

---

## Summary

**New Entities**: 4 (CompilationContext enhancement, TimerBlockConfig enhancement, LoopCoordinatorState, BehaviorCoordinationKey patterns)

**Modified Entities**: 0 core interfaces, 2 enhanced configurations

**Data Flow**: Linear compilation → hierarchical execution → coordinated looping

**State Management**: Each behavior owns its state, coordination via duck-typing discovery

**Validation**: Type-safe with TypeScript, runtime checks for numeric ranges

---

**Status**: ✅ **COMPLETE** - All entities defined, relationships mapped, validation rules specified
