# Research: Runtime Block Implementation

**Feature**: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock  
**Date**: 2025-10-08

## Technical Decisions

### 1. Block Architecture Pattern

**Decision**: Behavior-based composition (existing pattern)  
**Rationale**: 
- Existing `RuntimeBlock` already uses behavior composition
- Avoids complex inheritance hierarchies
- Behaviors are reusable across different block types
- Aligns with constitutional principle of component-first architecture
- Existing codebase has `ChildAdvancementBehavior`, `LazyCompilationBehavior`, `CompletionTrackingBehavior`

**Alternatives Considered**:
- Class inheritance hierarchy (TimerBlock extends BaseBlock) - Rejected: Creates tight coupling, harder to test
- Functional composition with hooks - Rejected: Inconsistent with existing codebase architecture
- Strategy pattern with interchangeable strategies - Rejected: Behavior composition already provides this

**Implementation Notes**:
- Each block composes multiple behaviors via constructor injection
- Behaviors implement lifecycle hooks: `onPush`, `onPop`, `onNext`, `onEvent`
- Event-driven communication between behaviors via runtime event bus

---

### 2. Timer Implementation Strategy

**Decision**: JavaScript `setInterval` with sub-second precision tracking  
**Rationale**:
- Requirement FR-003: Sub-second precision for internal tracking
- Requirement FR-003a: 0.1s display resolution
- Requirement FR-003b: Exact timestamps at completion
- `setInterval` provides reliable periodic execution in browsers
- `performance.now()` provides microsecond precision for exact timestamps
- Display rounding separate from internal time tracking

**Alternatives Considered**:
- `requestAnimationFrame` - Rejected: Tied to display refresh rate (60fps), pauses when tab inactive
- Web Workers for timer - Rejected: Overkill for current requirements, adds complexity
- Date-based calculation only - Rejected: Less predictable for UI updates

**Implementation Notes**:
```typescript
interface TimerState {
  startTime: number;        // performance.now() when started
  elapsedMs: number;        // Accumulated time (handles pause/resume)
  direction: 'up' | 'down';
  durationMs?: number;      // For countdown timers
  intervalId?: number;      // For cleanup
}

// Display: Math.floor((elapsedMs / 100)) / 10  // Rounds to 0.1s
// Completion: exact elapsedMs value
```

---

### 3. Rep Tracking UI Pattern

**Decision**: Hybrid approach - incremental tap OR bulk entry (from clarification)  
**Rationale**:
- Requirement FR-012a: Incremental counting (tap button)
- Requirement FR-012b: Bulk entry (input field)
- Requirement FR-012c: Switch modes anytime
- Different workout contexts favor different methods (high-rep vs low-rep)
- Athletes may lose count and need to enter final number

**Alternatives Considered**:
- Tap-only - Rejected: Poor UX for high rep counts (tap 100 times)
- Bulk-only - Rejected: No real-time progress feedback during workout
- Voice commands - Deferred: Future enhancement, requires additional APIs

**Implementation Notes**:
- EffortBlock maintains `{ target: number, current: number }`
- UI can render both controls simultaneously
- Either method triggers same `reps:complete` event when target reached
- State transitions: NotStarted → InProgress → Complete

---

### 4. State Management Approach

**Decision**: In-memory only, no persistence (from clarification)  
**Rationale**:
- Requirement FR-005c: No cross-session persistence
- Simpler implementation - no storage layer required
- Component library context - consumer apps handle persistence if needed
- Reduces complexity and potential bugs from stale persisted state

**Alternatives Considered**:
- localStorage persistence - Rejected: Requirement explicitly excludes this
- Session storage - Rejected: Still persistence, adds complexity
- Optional persistence flag - Rejected: YAGNI, consumer can implement if needed

**Implementation Notes**:
- All state lives in RuntimeBlock instances on the stack
- Pause: Blocks remain on stack, timer intervals cleared
- Close/refresh: Stack lost, user must restart workout
- Consumer apps can capture state at completion for their own storage

---

### 5. Variable Rep Scheme Compilation

**Decision**: RoundsBehavior provides compilation context to child blocks  
**Rationale**:
- Requirement FR-007: Variable rep schemes (21-15-9)
- Requirement FR-008: Correct rep target per round
- JIT compilation pattern already supports context passing
- Lazy compilation allows dynamic rep target resolution at runtime

**Alternatives Considered**:
- Pre-compile all rounds upfront - Rejected: Violates lazy compilation principle, wastes memory
- Template-based cloning - Rejected: More complex than context passing
- Rep calculation in EffortBlock - Rejected: Violates separation of concerns

**Implementation Notes**:
```typescript
interface CompilationContext {
  currentRound?: number;
  repScheme?: number[];
  // Other contextual data for compilation
}

class RoundsBehavior {
  getCompilationContext(): CompilationContext {
    return {
      currentRound: this.state.currentRound,
      repScheme: this.state.repScheme
    };
  }
}

// JitCompiler uses context when compiling EffortBlock
const reps = context.repScheme?.[context.currentRound - 1] ?? defaultReps;
```

---

### 6. Event Bus Architecture

**Decision**: Reuse existing runtime event system  
**Rationale**:
- ScriptRuntime already has event emission capability
- Behaviors already listen to events via `onEvent` hook
- Events: `timer:tick`, `timer:complete`, `timer:pause`, `timer:resume`, `rounds:changed`, `reps:complete`
- Decouples behaviors from direct communication

**Alternatives Considered**:
- Direct behavior-to-behavior calls - Rejected: Creates tight coupling
- Observer pattern implementation - Rejected: Event system already provides this
- Redux/MobX state management - Rejected: Overkill for runtime execution

**Implementation Notes**:
- Events flow through ScriptRuntime event bus
- Behaviors emit events: `runtime.emit(eventName, data)`
- Behaviors listen: `onEvent(event) { if (event.type === 'timer:pause') ... }`
- UI components subscribe to runtime events for display updates

---

### 7. Completion Detection Strategy

**Decision**: CompletionBehavior with configurable conditions  
**Rationale**:
- Different blocks have different completion criteria
- TimerBlock: Timer complete OR child complete (depends on direction)
- RoundsBlock: All rounds finished
- EffortBlock: Reps completed
- Generic behavior configured per block type

**Alternatives Considered**:
- Hardcoded completion logic per block - Rejected: Code duplication
- Single completion check function - Rejected: Not flexible enough
- Polling-based completion - Rejected: Event-driven is more efficient

**Implementation Notes**:
```typescript
interface CompletionConfig {
  condition: (runtime: ScriptRuntime, block: RuntimeBlock) => boolean;
  events?: string[]; // Events that might trigger completion check
}

class CompletionBehavior {
  onEvent(event: RuntimeEvent) {
    if (this.config.events?.includes(event.type)) {
      if (this.config.condition(this.runtime, this.block)) {
        this.runtime.emit('block:complete', { blockId: this.block.id });
      }
    }
  }
}
```

---

### 8. Performance Optimization Strategy

**Decision**: Lazy compilation + efficient disposal + minimal allocations  
**Rationale**:
- Performance requirement: Push/pop <1ms, dispose() <50ms
- Lazy compilation already implemented - only compile blocks when executed
- Timer cleanup critical: Must clear intervals immediately
- Object pooling deferred until profiling shows need

**Alternatives Considered**:
- Object pooling for blocks - Deferred: Premature optimization, profile first
- Immutable state updates - Rejected: Performance cost not justified for runtime execution
- Web Workers for timers - Rejected: Adds latency, overkill

**Implementation Notes**:
- Measure: Add performance.mark() around critical operations
- Timer disposal: Clear interval in onPop, nullify references
- Memory: No circular references, all behaviors disposable
- Profiling targets: Timer tick <16ms (60fps), JIT compile <100ms

---

## Testing Strategy

### Unit Testing Approach
- Each block class: Isolated tests with mock behaviors
- Each behavior: Isolated tests with mock runtime
- Focus: State transitions, event emission, disposal
- Tools: Vitest with mocking utilities

### Integration Testing Approach
- Complete workout scenarios (Fran, Cindy, etc.)
- Full runtime stack with JitCompiler
- Verify: Correct block sequence, timer accuracy, rep tracking
- Tools: Vitest integration tests

### Storybook Testing Approach
- Visual regression: Each block's UI representation
- Interactive testing: Manual validation of pause/resume, rep entry
- Performance: Monitor timer tick rendering performance
- Tools: Storybook with controls, Playwright for interaction tests

---

## Dependencies Analysis

### Existing Codebase Dependencies
- `src/runtime/ScriptRuntime.ts` - Core runtime engine (EXISTING)
- `src/runtime/RuntimeBlock.ts` - Base block interface (EXISTING)
- `src/runtime/JitCompiler.ts` - Block compilation (MODIFY)
- Behavior pattern infrastructure (EXISTING)

### External Dependencies
- None required - feature uses existing stack
- TypeScript, React, Vitest, Storybook already in package.json
- No new npm packages needed

### Performance Monitoring
- Use browser performance API (`performance.now()`, `performance.mark()`)
- Console timing for development: `console.time('block-push')`
- Vitest benchmarks for critical paths

---

## Risk Assessment

### High Risk
- None identified - follows existing patterns

### Medium Risk
1. **Timer drift over long workouts** - Mitigation: Use performance.now() timestamps, not accumulated intervals
2. **Memory leaks from unclosed timers** - Mitigation: Strict disposal pattern enforcement, unit tests verify cleanup

### Low Risk
1. **Browser tab throttling affecting timers** - Mitigation: Document limitation, acceptable for use case
2. **Storybook performance with multiple timers** - Mitigation: Cleanup between story switches

---

## Open Questions
None - all clarifications resolved via /clarify session.

---

## Success Criteria

### Functional Success
- ✅ All 7 example workouts execute correctly in Storybook
- ✅ Variable rep schemes (21-15-9) advance rounds properly
- ✅ Timers count up/down accurately with 0.1s display precision
- ✅ Hybrid rep tracking works (tap and bulk entry)
- ✅ Pause/resume maintains state within session
- ✅ Abandon discards state without recording

### Performance Success
- ✅ Push/pop operations complete in <1ms (99th percentile)
- ✅ Dispose() operations complete in <50ms
- ✅ Timer tick updates complete in <16ms (60fps)
- ✅ JIT compilation for typical workout <100ms

### Quality Success
- ✅ Unit test coverage >80% for new code
- ✅ All integration tests pass
- ✅ No TypeScript errors in modified files
- ✅ Storybook builds successfully
- ✅ All example workouts have complete stories

---

**Status**: Research complete ✅  
**Next Phase**: Phase 1 - Design & Contracts
