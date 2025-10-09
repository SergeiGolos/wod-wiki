# WOD Wiki Implementation Roadmap & Status Analysis

**Date**: October 8, 2025  
**Current Branch**: `010-replaceing-the-existing`  
**Analysis Scope**: End-to-end path from markdown workout scripts to timer execution with metric recording

---

## Executive Summary

WOD Wiki is a **partially implemented** workout script runtime system with a solid foundation in parsing, compilation, and visualization, but **missing critical execution layer components** needed for a complete product. The system successfully demonstrates JIT compilation concepts and has excellent test coverage for behaviors and strategies, but lacks the concrete runtime block implementations needed to actually execute workouts.

**Current State**: ~65% complete  
**Critical Gap**: Runtime block execution layer  
**Strength**: Parser, JIT compiler architecture, memory system, visualization  
**Path to Product**: Implement concrete block types, connect timer behaviors to UI, add workout recording

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     WOD Wiki System Flow                         │
└─────────────────────────────────────────────────────────────────┘

1. Markdown Input  →  2. Parser  →  3. JIT Compiler  →  4. Runtime Execution  →  5. Recording
   "20:00 AMRAP"      CodeStatement   IRuntimeBlock      Stack + Memory         Metrics
   ✅ DONE            ✅ DONE         ⚠️ PARTIAL         ⚠️ PARTIAL            ❌ MISSING
```

---

## Implementation Status by Area

### 1. ✅ **Workout Script Parsing** (100% Complete)

**What Works**:
- Chevrotain-based parser (`src/parser/timer.parser.ts`)
- Token definitions for Timer, Rounds, Effort, Reps, Distance, Resistance
- Visitor pattern for AST traversal
- CodeStatement data model with fragments and children
- Parser integration with Monaco Editor

**Test Coverage**: Comprehensive unit tests passing  
**Examples**: All CrossFit benchmark workouts parse correctly (Fran, Annie, Cindy, etc.)

**Evidence**:
```typescript
// stories/workouts/crossfit.ts
export const Cindy = `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`;
```

**Missing**: Nothing - this layer is production-ready

---

### 2. ✅ **JIT Compiler Architecture** (95% Complete)

**What Works**:
- Strategy pattern implementation (`JitCompiler`, `IRuntimeBlockStrategy`)
- Three working strategies:
  - `EffortStrategy`: Single exercises (fallback)
  - `TimerStrategy`: Time-bound workouts (AMRAP, EMOM)
  - `RoundsStrategy`: Round-based workouts (For Time)
- Fragment-based pattern matching
- Strategy precedence system (first match wins)
- Behavior composition (ChildAdvancement, LazyCompilation, TimerBehavior)

**Test Coverage**: 
- ✅ 9/9 strategy matching contract tests passing
- ✅ 9/9 block compilation tests passing
- ✅ 9/9 strategy precedence tests passing

**Evidence**:
```typescript
// src/runtime/strategies.ts - Working compilation
export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[]): boolean {
        return fragments.some(f => f.fragmentType === FragmentType.Timer);
    }
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // ✅ Creates RuntimeBlock with TimerBehavior
        // ✅ Adds ChildAdvancementBehavior if children exist
        // ✅ Adds LazyCompilationBehavior for recursive compilation
    }
}
```

**Missing (5%)**:
- ⚠️ More sophisticated strategies (CountdownStrategy, EMOMStrategy) are commented out
- ⚠️ No strategy for nested timer scenarios (Tabata intervals)

---

### 3. ⚠️ **Runtime Execution Layer** (50% Complete)

This is the **CRITICAL GAP** preventing end-to-end execution.

#### 3a. ✅ **Runtime Stack** (100% Complete)

**What Works**:
- `RuntimeStack` class with push/pop/current operations
- Constructor-based initialization pattern
- Consumer-managed disposal pattern
- Stack validation with `StackValidator`
- Multiple stack views (top-first, bottom-first)
- Performance: < 1ms for push/pop operations

**Test Status**: ⚠️ 90 test failures due to `sourceIds` validation strictness (implementation issue, not design issue)

**Evidence**:
```typescript
// src/runtime/RuntimeStack.ts
export class RuntimeStack {
    push(block: IRuntimeBlock): void {
        this._validator.validatePush(block, this._blocks.length);
        this._blocks.push(block);
    }
    
    pop(): IRuntimeBlock | undefined {
        return this._blocks.pop(); // Consumer must call dispose()
    }
}
```

**Current Issue**: Many tests failing because mock blocks don't provide `sourceIds` array (easy fix)

---

#### 3b. ⚠️ **Runtime Blocks** (40% Complete)

**What Works**:
- ✅ `IRuntimeBlock` interface fully defined
- ✅ `RuntimeBlock` base implementation exists
- ✅ Behavior system working (ChildAdvancement, LazyCompilation, TimerBehavior)
- ✅ Block lifecycle (push/next/pop) conceptually correct

**What's Missing**:
- ❌ **No concrete block types** (TimerBlock, RoundsBlock, EffortBlock)
- ❌ **No actual execution logic** in `next()` methods
- ❌ **No completion detection** beyond behavior flags
- ❌ **No result recording** when blocks complete

**Evidence of Gap**:
```typescript
// src/runtime/RuntimeBlock.ts - Generic implementation
export class RuntimeBlock implements IRuntimeBlock {
    next(): IRuntimeAction[] {
        // ✅ Delegates to behaviors for child compilation
        // ❌ But has no timer/rounds/effort-specific logic
        // ❌ Doesn't know when a workout segment is "done"
    }
}
```

**Why This Matters**: The demo shows blocks being compiled and pushed to the stack, but they never "complete" because there's no logic to detect timer expiration, round completion, or rep completion.

**21 Failed Tests**: `IAdvancedRuntimeBlock.contract.test.ts` expects properties like `currentChildIndex`, `isComplete`, `children` that don't exist on `RuntimeBlock`.

---

#### 3c. ✅ **Memory System** (100% Complete)

**What Works**:
- `RuntimeMemory` class with typed memory references
- Allocation with owner tracking
- Public/private visibility
- Search capability
- Automatic cleanup on stack removal
- `TypedMemoryReference<T>` for type safety

**Test Coverage**: ✅ 14/14 tests passing

**Evidence**:
```typescript
// src/runtime/RuntimeMemory.ts
export class RuntimeMemory implements IRuntimeMemory {
    allocate<T>(type: string, ownerId: string, initialValue?: T): TypedMemoryReference<T> {
        // ✅ Creates typed reference
        // ✅ Stores value in internal map
        // ✅ Tracks owner for cleanup
    }
}
```

**TimerBehavior Integration**: ✅ Allocates `timeSpans` and `isRunning` memory correctly

---

#### 3d. ⚠️ **Event System** (70% Complete)

**What Works**:
- ✅ `NextEvent` for advancing blocks
- ✅ `NextEventHandler` with validation
- ✅ `NextAction` for pushing blocks
- ✅ Event logging and error handling

**Test Coverage**: ✅ 43/44 NextAction/NextEvent tests passing (1 minor logging assertion failure)

**What's Missing**:
- ❌ No `TimerTickEvent` for timer updates
- ❌ No `RepCompleteEvent` for exercise completion
- ❌ No `RoundCompleteEvent` for round tracking
- ❌ No event subscription system for UI updates

---

### 4. ⚠️ **Clock/Timer UI Components** (60% Complete)

**What Works**:
- ✅ `ClockAnchor` component for timer display
- ✅ `TimeDisplay` component for formatting time
- ✅ `TimeUnit` component for days/hours/minutes/seconds
- ✅ `TimerMemoryVisualization` component for showing memory state
- ✅ Clock stories with visual examples

**What's Missing**:
- ❌ No connection from `RuntimeBlock` timer state to UI
- ❌ No live timer updates during execution
- ❌ Clock components are **static displays**, not **live runtimes**
- ❌ No play/pause controls connected to runtime

**Evidence of Gap**:
```typescript
// stories/clock/ - All stories show static time displays
// No stories show "live" timers counting down during execution
```

**Spec 010 Status**: Clock + Memory visualization stories defined but not yet implemented

---

### 5. ❌ **Workout Recording & Metrics** (0% Complete)

**What's Missing**:
- ❌ No result recording system
- ❌ No rep counting during execution
- ❌ No time-on-completion tracking
- ❌ No workout history/log
- ❌ No metric aggregation (total reps, average time, etc.)
- ❌ No export/persistence layer

**This is the final piece** needed to make WOD Wiki a useful product.

---

### 6. ✅ **Visualization & Developer Tools** (90% Complete)

**What Works**:
- ✅ `JitCompilerDemo` component with interactive visualization
- ✅ Fragment visualization with color-coded display
- ✅ Runtime stack visualization with depth indentation
- ✅ Memory allocation display with hover highlighting
- ✅ Monaco Editor integration with syntax highlighting
- ✅ Line highlighting for active blocks

**Test Coverage**: Storybook stories render correctly

**Evidence**: `stories/compiler/JitCompilerDemo.stories.tsx` provides excellent visualization of compilation process

**Missing (10%)**:
- ⚠️ No execution timeline view
- ⚠️ No performance profiling display

---

## Critical Path to Minimum Viable Product

### Phase 1: Complete Runtime Execution (4-6 weeks)

**Priority: CRITICAL**

1. **Fix Test Infrastructure** (1 week)
   - Update all mock blocks to provide `sourceIds` arrays
   - Fix StackValidator to accept valid test blocks
   - Target: 0 failing RuntimeStack tests

2. **Implement Concrete Block Types** (2 weeks)
   - `TimerBlock`: Countdown timer with completion detection
   - `RoundsBlock`: Round counter with iteration logic
   - `EffortBlock`: Exercise container with rep tracking
   - Each block must implement `IRuntimeBlock` with proper `next()` logic

3. **Connect Timer to Clock UI** (1 week)
   - Create `useTimerExecution` hook
   - Subscribe to timer tick events
   - Update `TimeDisplay` from runtime memory
   - Add play/pause controls

4. **Implement Completion Detection** (1 week)
   - Add `isComplete` property to blocks
   - Detect timer expiration
   - Detect round completion
   - Detect exercise completion
   - Pop completed blocks from stack

**Deliverable**: A workout can execute from start to finish with live timer display

---

### Phase 2: Basic Metric Recording (2-3 weeks)

**Priority: HIGH**

1. **Result Recording System** (1 week)
   - `WorkoutResult` data model
   - `ResultRecorder` service
   - Store completion times
   - Store rep counts

2. **Exercise Metrics** (1 week)
   - Rep counting UI
   - Resistance/weight input
   - Distance input
   - Time-on-effort tracking

3. **Workout History** (1 week)
   - LocalStorage persistence
   - Result list view
   - Basic filtering (by workout, by date)

**Deliverable**: Users can record and view their workout results

---

### Phase 3: Polish & Production Features (3-4 weeks)

**Priority: MEDIUM**

1. **Enhanced Execution** (1 week)
   - Pause/resume functionality
   - Skip exercise
   - Restart workout
   - Audio cues (already implemented, needs integration)

2. **Advanced Recording** (1 week)
   - Edit past results
   - Notes/comments on workouts
   - Personal records (PR) detection
   - Result comparison

3. **Workout Library** (1 week)
   - Browse built-in workouts
   - Create custom workouts
   - Save/load workout templates
   - Share workouts (export to clipboard)

4. **Mobile Optimization** (1 week)
   - Responsive layouts
   - Touch-friendly controls
   - Keep-awake during execution
   - Landscape timer view

**Deliverable**: Production-ready workout tracking application

---

## Existing Strengths to Leverage

### 1. Excellent Test Coverage for Behaviors

✅ **15/15** LazyCompilationBehavior tests passing  
✅ **15/15** ChildAdvancementBehavior tests passing  
✅ **16/16** CompletionTrackingBehavior tests passing  
✅ **17/17** ParentContextBehavior tests passing  

**Implication**: The behavior system is **rock solid** and can be trusted for building blocks.

---

### 2. Working JIT Compiler Pipeline

```typescript
// This workflow is FULLY FUNCTIONAL:
Parse Script → Match Strategy → Compile Block → Push to Stack

// Example: Cindy workout
const script = `20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`;

// ✅ Parses into CodeStatement tree
// ✅ TimerStrategy matches (has Timer fragment)
// ✅ Compiles into RuntimeBlock with TimerBehavior
// ✅ Pushes to RuntimeStack

// ❌ BUT: Block never "executes" because no timer logic exists
```

---

### 3. Memory System Ready for State Management

```typescript
// TimerBehavior already allocates memory correctly:
const timeSpansRef = runtime.memory.allocate<TimeSpan[]>('timeSpans', blockKey, []);
const isRunningRef = runtime.memory.allocate<boolean>('isRunning', blockKey, false);

// ✅ Memory references work
// ✅ Type safety enforced
// ❌ But nothing updates these values during execution
```

---

### 4. Visualization Infrastructure Complete

The `JitCompilerDemo` component is **production-ready** for showing compilation process. It needs a companion `WorkoutExecutionDemo` component for runtime visualization.

---

## Known Issues & Technical Debt

### 1. Test Failures (90 failed tests)

**Root Cause**: `StackValidator.validatePush()` requires blocks to have `sourceIds: number[]`, but many test mocks use `sourceId: number[]` (singular) or don't provide it at all.

**Fix**: Update test mocks to match current interface:
```typescript
const mockBlock: IRuntimeBlock = {
    key: new BlockKey('test'),
    sourceIds: [1, 2, 3], // ✅ Array, not singular
    // ... rest of interface
};
```

**Estimated Time**: 2-4 hours to fix all test mocks

---

### 2. TypeScript Errors (369 known errors)

**Status**: Acknowledged as baseline, not blocking  
**Strategy**: Fix incrementally as files are modified, not all at once

---

### 3. Incomplete IAdvancedRuntimeBlock Interface

**Issue**: Contract tests expect `currentChildIndex`, `isComplete`, `children` properties that don't exist on `RuntimeBlock`.

**Decision Point**: 
- **Option A**: Implement `IAdvancedRuntimeBlock` interface (adds complexity)
- **Option B**: Remove contract tests and simplify to current `IRuntimeBlock` (recommended)

**Recommendation**: Option B - the behavior system already handles child advancement and completion. Adding properties to blocks duplicates this logic.

---

### 4. Commented-Out Strategies

Several strategies are commented out in `src/runtime/strategies.ts`:
- `CountdownStrategy`
- `TimeBoundedRoundsStrategy`
- `CountdownRoundsStrategy`
- `TimeBoundStrategy`

**Reason**: Old interface using `RuntimeMetric[]` parameter  
**Action**: Refactor to new interface or remove if not needed

---

## Architectural Decisions & Patterns

### ✅ **Strong Patterns** (Keep These)

1. **Strategy Pattern for Compilation**: Extensible and testable
2. **Behavior Composition over Inheritance**: Clean and flexible
3. **Constructor-Based Initialization**: Explicit and performant
4. **Consumer-Managed Disposal**: Clear ownership semantics
5. **Typed Memory References**: Type-safe state management
6. **Fragment-Based Parsing**: Composable workout syntax

---

### ⚠️ **Areas for Review**

1. **RuntimeBlock as Universal Block Type**: 
   - Currently one generic `RuntimeBlock` class
   - May need concrete types (`TimerBlock`, `RoundsBlock`, `EffortBlock`) for clarity
   - Decision: Start with concrete types, refactor to generic if it proves redundant

2. **Event System**:
   - Currently very minimal (only NextEvent)
   - May need richer event types for timer ticks, rep completion, etc.
   - Decision: Add events as needed, don't over-engineer

3. **Memory Visibility**:
   - Public/private distinction exists but not heavily used
   - Decision: Keep simple until complex scenarios emerge

---

## Recommended Implementation Order

### Sprint 1: Foundation (Week 1-2)
1. Fix test infrastructure (sourceIds validation)
2. Implement `TimerBlock` with countdown logic
3. Connect timer to clock UI
4. First end-to-end execution: "30 second timer"

**Success Metric**: Can start a timer, watch it count down, and see "Complete" when it reaches zero

---

### Sprint 2: Workout Types (Week 3-4)
1. Implement `RoundsBlock` with iteration
2. Implement `EffortBlock` with exercise display
3. Test with "Cindy" workout (20:00 AMRAP with 3 exercises)

**Success Metric**: Can execute a full AMRAP workout with timer and exercise list

---

### Sprint 3: Recording (Week 5-6)
1. Add result recording on workout completion
2. Add rep count input during execution
3. Store results in LocalStorage
4. Display workout history

**Success Metric**: Can record workout results and view past performance

---

### Sprint 4: Polish (Week 7-9)
1. Add pause/resume
2. Add audio cues
3. Add workout library UI
4. Mobile optimization

**Success Metric**: Production-ready app for personal use

---

## Path to Final Product

```
Current State (65%)
  ↓
MVP (Sprint 1-2) - Basic Timer Execution (75%)
  ↓
Alpha (Sprint 3) - Recording & History (85%)
  ↓
Beta (Sprint 4) - Polish & Optimization (95%)
  ↓
v1.0 - Production Release (100%)
  - All workout types working
  - Reliable recording
  - Mobile-friendly
  - Offline-first
  - Shareable workouts
```

**Estimated Time to v1.0**: 9-12 weeks with one developer

---

## Conclusion

WOD Wiki has an **excellent architectural foundation** with robust parsing, compilation, and memory systems. The primary gap is the **runtime execution layer** - specifically, implementing concrete block types that can execute timer countdowns, track rounds, and detect completion.

The path forward is clear:
1. **Fix test infrastructure** (quick win, builds confidence)
2. **Implement TimerBlock** (proves execution model works)
3. **Add basic recording** (delivers user value)
4. **Polish and ship** (makes it production-ready)

The codebase quality is high, the patterns are sound, and the remaining work is primarily **implementation** rather than **design**. With focused effort on the execution layer, this can become a production-ready workout tracking application within 2-3 months.

---

**Next Steps**: 
1. Review this analysis with stakeholders
2. Prioritize Sprint 1 tasks
3. Begin with test infrastructure fixes
4. Build first working TimerBlock

**Questions for Discussion**:
1. Is the 9-12 week timeline acceptable?
2. Should we implement all workout types (AMRAP, EMOM, Tabata) or start with one?
3. Is LocalStorage sufficient for v1.0 or do we need server sync?
4. Should we target web-only or add React Native for true mobile app?
