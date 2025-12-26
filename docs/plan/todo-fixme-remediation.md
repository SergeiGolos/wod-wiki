# TODO/FIXME Markers Remediation Plan

**Generated**: 2025-12-26  
**Total Markers**: 26  
**Files Affected**: 11

---

## Summary Table

| # | Category | Count | Ease | Impact | Risk | Description |
|---|----------|-------|------|--------|------|-------------|
| 1 | Runtime Test Bench | 18 | 3 | 🟡 Medium | 🟢 Low | Debug tooling incomplete |
| 2 | Strategy Implementation | 2 | 4 | 🟡 Medium | 🟡 Medium | GroupStrategy/EffortStrategy gaps |
| 3 | Test Maintenance | 2 | 2 | 🟢 Low | 🟢 Low | Test mocks need updates |
| 4 | Minor Enhancements | 4 | 1 | 🟢 Low | 🟢 Low | Small feature improvements |

---

## Category 1: Runtime Test Bench (18 TODOs)

### Overview
The `runtime-test-bench/` module contains 18 TODOs across 3 files, all related to debugging and visualization infrastructure. This is internal developer tooling, not production code.

### Files Affected
| File | Count | Focus Area |
|------|-------|------------|
| `adapters/RuntimeAdapter.ts` | 8 | Snapshot extraction |
| `selectors/runtime-selectors.ts` | 5 | State selectors (duplicates adapter logic) |
| `hooks/useRuntimeTestBench.ts` | 5 | Execution controls |

### Explanation
The runtime-test-bench provides debugging visualization for the JIT compiler and runtime stack. Current TODOs represent placeholder implementations that return stub data. These don't affect production behavior but limit debugging capabilities.

### Requirements
- Understanding of `ScriptRuntime` internals
- Knowledge of `IRuntimeBlock` lifecycle
- Familiarity with React hooks patterns

### Implementation Steps

#### Phase 1: RuntimeAdapter.ts (8 TODOs)

1. **Track step count** (line 45)
   ```typescript
   // Current: stepCount: 0
   // Fix: Add step counter to runtime or track in adapter state
   stepCount: runtime.stack.blocks.length > 0 ? this.calculateStepCount(runtime) : 0
   ```

2. **Track elapsed time** (line 46)
   ```typescript
   // Use runtime.clock for elapsed calculation
   elapsedTime: runtime.clock.now.getTime() - this.startTime
   ```

3. **Extract actual metrics** (line 84)
   ```typescript
   // Search runtime.memory for metric entries
   metrics: this.extractMetricsFromMemory(runtime)
   ```

4. **Implement highlighting logic** (line 148)
   ```typescript
   // Highlight entries matching current cursor position
   isHighlighted: this.shouldHighlight(ref, activeBlockKey)
   ```

5. **Track memory references** (line 154)
   ```typescript
   // Parse ownerId to find referencing blocks
   references: this.findReferences(runtime.memory, ref.id)
   ```

6. **Proper status detection** (line 227)
   ```typescript
   // Check block.state or behaviors for completion status
   private determineBlockStatus(block: IRuntimeBlock): BlockStatus {
     if (block.state?.isComplete) return 'complete';
     if (block.executionTiming?.mountedAt) return 'active';
     return 'pending';
   }
   ```

7. **Children detection** (line 237)
   ```typescript
   // Use LoopCoordinatorBehavior config if present
   private findChildrenKeys(block: IRuntimeBlock): string[] {
     const loopBehavior = block.getBehavior(LoopCoordinatorBehavior);
     return loopBehavior?.config.childGroups.flat() ?? [];
   }
   ```

8. **Owner label generation** (line 283)
   ```typescript
   // Resolve ownerId to block label
   private generateOwnerLabel(ownerId: string, runtime: ScriptRuntime): string {
     const block = runtime.stack.blocks.find(b => b.key.toString() === ownerId);
     return block?.label ?? ownerId;
   }
   ```

#### Phase 2: useRuntimeTestBench.ts (5 TODOs)

1. **Handle script name** (line 62) - Store in state for display
2. **Implement execution logic** (line 74) - Call `runtime.handle(new NextEvent())`
3. **Step execution** (line 81) - Single `runtime.handle(new NextEvent())`
4. **Step over logic** (line 89) - Track block depth, step until same depth
5. **Step into logic** (line 94) - Step into child blocks

#### Phase 3: Deduplicate Selectors (5 TODOs)
The `runtime-selectors.ts` duplicates logic from `RuntimeAdapter.ts`. After fixing adapter, update selectors to delegate.

### Testing
```bash
bun run storybook
# Navigate to Runtime > TestBench stories
# Verify stack visualization shows accurate data
```

---

## Category 2: Strategy Implementation (2 TODOs)

### Overview
Two compilation strategies have incomplete implementations that could affect nested workout structures.

### 2.1 GroupStrategy.ts (1 TODO)

**Location**: `src/runtime/strategies/GroupStrategy.ts:30`

**Current State**: Match logic complete, compile() returns minimal block

**TODO Content**:
```typescript
// Full compile() implementation requires:
// 1. Extract child statements from code[0].children
// 2. Create container RuntimeBlock with blockType="Group"
// 3. Set up LoopCoordinatorBehavior with loopType=FIXED, totalRounds=1
// 4. Pass compilation context to children
// 5. Handle nested groups recursively
// 6. Group completes when all children complete
```

**Requirements**:
- Understanding of `LoopCoordinatorBehavior` configuration
- Knowledge of child statement resolution via `runtime.script.getIds()`

**Implementation Steps**:
1. Extract child IDs from `code[0].children`
2. Create `LoopCoordinatorBehavior` with:
   - `loopType: LoopType.FIXED`
   - `totalRounds: 1`
   - `childGroups: [[...childIds]]`
3. Add `CompletionBehavior` triggered when all children complete
4. Return `RuntimeBlock` with behaviors

**Testing**:
```bash
bun test src/runtime/strategies --preload ./tests/unit-setup.ts
# Add test: "should compile group with nested exercises"
```

### 2.2 EffortStrategy.ts (1 TODO)

**Location**: `src/runtime/strategies/EffortStrategy.ts:100`

**Current State**: Effort blocks work as leaf nodes, no child support

**TODO Content**:
```typescript
// TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here
```

**Requirements**:
- Determine if effort blocks ever need children (likely no)
- If yes, mirror GroupStrategy pattern

**Recommendation**: Mark as **WONTFIX** - Effort blocks are leaf nodes by design. Add code comment clarifying this is intentional.

**Implementation**:
```typescript
// Effort blocks are intentionally leaf nodes. They represent single exercises
// that complete on user 'next' action. Nested effort blocks should use
// GroupStrategy or RoundsStrategy as the container.
```

---

## Category 3: Test Maintenance (2 TODOs)

### 3.1 CompletionBehavior.test.ts (1 TODO)

**Location**: `src/runtime/behaviors/__tests__/CompletionBehavior.test.ts:167`

**TODO Content**:
```typescript
// TODO: Mock runtime.handle spy not capturing event correctly
```

**Issue**: Test spy setup doesn't capture dispatched events

**Fix**:
```typescript
const handleSpy = vi.spyOn(harness.runtime, 'handle');
// ... test logic ...
expect(handleSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'block:complete' }));
```

### 3.2 RootLifecycle.test.ts (1 TODO)

**Location**: `src/runtime/__tests__/RootLifecycle.test.ts:13`

**TODO Content**:
```typescript
// TODO: This test needs to be updated to match current RootLifecycleBehavior
```

**Issue**: Test marked as `todo` - behavior API changed

**Fix**: Update test to use current `RootLifecycleBehavior` API with `RootState` enum and control button subscription pattern.

---

## Category 4: Minor Enhancements (4 TODOs)

### 4.1 BlockKey.ts (1 TODO)

**Location**: `src/core/models/BlockKey.ts:8`

**TODO Content**: Make value optional, auto-generate UUID

**Current State**: Already implemented! Constructor has default value `= uuidv4()`

**Resolution**: Remove TODO comment - it's already done.

### 4.2 ExerciseSuggestionProvider.ts (1 TODO)

**Location**: `src/editor/ExerciseSuggestionProvider.ts:172`

**TODO Content**: Detect exercise groups with variations

**Current State**: Returns plain name

**Implementation**:
```typescript
private formatDisplayName(entry: ExercisePathEntry): string {
  const group = this.indexManager.getExerciseGroup(entry.name);
  if (group && group.variations.length > 1) {
    return `${entry.name} (+${group.variations.length - 1} variations)`;
  }
  return entry.name;
}
```

### 4.3 UnifiedWorkbench.tsx (1 TODO)

**Location**: `src/components/layout/UnifiedWorkbench.tsx:173`

**TODO Content**: Refactor to use AnalyticsTransformer

**Current State**: Inline transformation function

**Recommendation**: Low priority - works correctly, refactor when adding analytics features.

### 4.4 useRuntimeExecution.ts (1 TODO)

**Location**: `src/runtime-test-bench/hooks/useRuntimeExecution.ts:166`

**TODO Content**: Add runtime.reset() method

**Implementation**: Add to `IScriptRuntime` interface and `ScriptRuntime` class:
```typescript
reset(): void {
  this.stack.clear();
  this.memory.clear();
  this.eventBus.clear();
}
```

---

## Priority Matrix

| Priority | Items | Rationale |
|----------|-------|-----------|
| **P1** | BlockKey.ts TODO removal | Already done, just remove comment |
| **P2** | GroupStrategy compile() | Affects nested workout support |
| **P2** | Test maintenance (2) | Unblocks test coverage |
| **P3** | RuntimeAdapter (8) | Developer tooling, not production |
| **P3** | Minor enhancements (3) | Nice-to-have features |
| **Wontfix** | EffortStrategy children | Intentional design |

---

## Verification Commands

```bash
# Count remaining TODOs
grep -rn "TODO\|FIXME" ./src --include="*.ts" --include="*.tsx" | wc -l

# Verify tests pass after changes
bun run test

# Check specific strategy tests
bun test src/runtime/strategies --preload ./tests/unit-setup.ts
```

---

## Estimated Effort

| Category | Items | Effort |
|----------|-------|--------|
| Runtime Test Bench | 18 | 4-6 hours |
| Strategy Implementation | 2 | 2-3 hours |
| Test Maintenance | 2 | 1 hour |
| Minor Enhancements | 4 | 1-2 hours |
| **Total** | **26** | **8-12 hours** |

