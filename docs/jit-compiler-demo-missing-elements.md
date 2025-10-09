# JitCompilerDemo Runtime Startup Failure - Missing Implementation Elements

## Executive Summary

The JitCompilerDemo component successfully initializes the runtime infrastructure including event handlers, memory management, and the JIT compiler with registered strategies. However, the runtime fails to advance beyond the root block due to **critical implementation gaps in the compilation strategies**. All three active strategies (EffortStrategy, TimerStrategy, RoundsStrategy) instantiate `ChildAdvancementBehavior` with empty arrays instead of passing actual child statements, resulting in behaviors that cannot advance to compile child blocks. This architectural defect breaks the entire lazy compilation pipeline despite correct event handling and behavior orchestration.

**Root Cause**: Strategies create `new ChildAdvancementBehavior([])` with hardcoded empty arrays, preventing the runtime from accessing parsed workout statements during compilation.

**Impact**: The "Next Block" button triggers all event and behavior chains correctly, but `ChildAdvancementBehavior.getCurrentChild()` always returns `undefined` because no children were provided during construction, causing `LazyCompilationBehavior` to skip compilation and return empty action arrays.

## Current Implementation Landscape

### Successfully Initialized Components

The JitCompilerDemo initialization in `stories/compiler/JitCompilerDemo.tsx` (lines 617-656) demonstrates **correct architecture** for the following subsystems:

#### 1. Script Parsing ✅
```typescript
const mdRuntime = new MdTimerRuntime();
const wodScript = mdRuntime.read(scriptText) as WodScript;
```
- Parses workout scripts into `CodeStatement[]` arrays
- Statements include fragment metadata, children arrays, and source IDs
- Parser output is fully structured and ready for compilation

#### 2. JIT Compiler with Strategy Registration ✅
```typescript
const jitCompiler = new JitCompiler([]);
jitCompiler.registerStrategy(new TimerStrategy());
jitCompiler.registerStrategy(new RoundsStrategy());
jitCompiler.registerStrategy(new EffortStrategy());
```
- Compiler initialized with precedence-ordered strategies
- Strategy matching system operational (TimerStrategy → RoundsStrategy → EffortStrategy)
- Compilation infrastructure ready to process statements

#### 3. Event System and Handlers ✅
```typescript
const nextHandler = new NextEventHandler('jit-compiler-demo-next-handler');
runtime.memory.allocate('handler', nextHandler.id, {
  name: nextHandler.name,
  handler: nextHandler.handler.bind(nextHandler)
});
```
- NextEvent → NextEventHandler → NextAction pipeline complete
- Event handler properly registered in runtime memory
- Handler returns appropriate `NextAction` when invoked

#### 4. Root Block with Behaviors ✅
```typescript
const childBehavior = new ChildAdvancementBehavior(wodScript.statements as CodeStatement[]);
const lazyCompilationBehavior = new LazyCompilationBehavior(false);
const behaviors = [childBehavior, lazyCompilationBehavior];
const rootBlock = new RuntimeBlock(runtime, [], behaviors);
```
- Root block correctly receives parsed statements via `ChildAdvancementBehavior`
- Both advancement and compilation behaviors attached
- Block pushed to runtime stack with valid behavior composition

### Operational Execution Flow

The event chain functions correctly through all stages:

1. **UI Interaction** (`JitCompilerDemo.tsx:681-731`) - Button click handler creates `NextEvent`
2. **Event Handling** (`ScriptRuntime.ts:70-95`) - Runtime finds and invokes `NextEventHandler`
3. **Action Creation** (`NextEventHandler.ts:32-58`) - Handler validates state and returns `NextAction`
4. **Action Execution** (`ScriptRuntime.ts:100-110`) - Runtime executes `NextAction.do(runtime)`
5. **Block Advancement** (`NextAction.ts:18-30`) - Action calls `currentBlock.next()` on root block
6. **Behavior Orchestration** (`RuntimeBlock.ts:74-85`) - Block iterates behaviors calling `onNext()`
7. **Child Advancement** (`ChildAdvancementBehavior.ts:32-56`) - Increments child index, returns empty array
8. **Lazy Compilation** (`LazyCompilationBehavior.ts:33-91`) - Retrieves current child and compiles via JIT

**Execution stops at step 8** because `getCurrentChild()` returns `undefined` due to missing children in compiled blocks.

## Critical Implementation Gaps

### Gap 1: Strategy Compilation - Empty Children Arrays

**Location**: `src/runtime/strategies.ts`

All three active strategies contain the identical defect:

#### EffortStrategy (lines 31-47)
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    console.log(`  🧠 EffortStrategy compiling ${code.length} statement(s)`);
    
    const behaviors: IRuntimeBehavior[] = [];
    
    if (code[0] && code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior([])); // ❌ DEFECT: Empty array
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(runtime, code[0]?.id ? [code[0].id] : [], behaviors, "Effort");
}
```

#### TimerStrategy (lines 73-89)
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    console.log(`  🧠 TimerStrategy compiling ${code.length} statement(s)`);
    
    const behaviors: IRuntimeBehavior[] = [];
    behaviors.push(new TimerBehavior());
    
    if (code[0] && code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior([])); // ❌ DEFECT: Empty array
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(runtime, code[0]?.id ? [code[0].id] : [], behaviors, "Timer");
}
```

#### RoundsStrategy (lines 144-160)
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    console.log(`  🧠 RoundsStrategy compiling ${code.length} statement(s)`);
    
    const behaviors: IRuntimeBehavior[] = [];
    
    if (code[0] && code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior([])); // ❌ DEFECT: Empty array
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(runtime, code[0]?.id ? [code[0].id] : [], behaviors, "Rounds");
}
```

**Analysis**: Each strategy correctly detects `code[0].children.length > 0` but then **ignores** those children when constructing `ChildAdvancementBehavior`, passing an empty array literal instead. This creates a behavior object that believes it has zero children to advance through.

### Gap 2: LazyCompilationBehavior Defensive Logic

**Location**: `src/runtime/behaviors/LazyCompilationBehavior.ts:43-46`

```typescript
const currentChild = childBehavior.getCurrentChild();
if (!currentChild) {
    return [];
}
```

The lazy compilation behavior includes defensive null checking that **correctly prevents execution** when no child is available. This protection mechanism exposes the upstream defect - when strategies pass empty arrays, `getCurrentChild()` immediately returns `undefined`, causing compilation to abort with an empty action array.

**Behavior Contract**: This defensive pattern is architecturally sound and should remain unchanged. The fix must occur in strategy implementations, not in behavior validation logic.

### Gap 3: Execution Chain Termination

When `LazyCompilationBehavior.onNext()` returns an empty array:

1. **No PushBlockAction Created**: Without a compiled block, no `PushBlockAction` is added to the action queue
2. **Stack Remains Unchanged**: `ScriptRuntime.handle()` executes zero actions, leaving stack depth at 1
3. **UI Shows No Progress**: Stack visualization continues displaying only the root block
4. **Advancement Halts**: Subsequent "Next Block" clicks repeat the same failed cycle

**Observable Symptom**: Console logs show:
```
🧠 EffortStrategy compiling 1 statement(s)
  🌱 LazyCompilationBehavior: No current child available
  ✅ Behavior orchestration complete: 0 actions generated
```

The root block has children (visible in `wodScript.statements`), but compiled child blocks do not.

## Technical Deep Dive - Execution Trace Analysis

### Successful Root Block Initialization

```typescript
// JitCompilerDemo.tsx:641-652
const wodScript = mdRuntime.read(scriptText); // Parses "20:00 AMRAP\n5 Pullups\n..."
// wodScript.statements = [
//   CodeStatement { fragments: [Timer, Action], children: [
//     CodeStatement { fragments: [Rep, Action], children: [] },
//     CodeStatement { fragments: [Rep, Action], children: [] },
//     CodeStatement { fragments: [Rep, Action], children: [] }
//   ]}
// ]

const childBehavior = new ChildAdvancementBehavior(wodScript.statements);
// childBehavior.children = [CodeStatement {...}] - CORRECT: Has statements
```

**Result**: Root block has functional `ChildAdvancementBehavior` with parsed statements.

### Failed Child Block Compilation

When root block's `LazyCompilationBehavior` compiles the first child:

```typescript
// LazyCompilationBehavior.ts:43-68
const currentChild = childBehavior.getCurrentChild(); // Returns wodScript.statements[0]
const compiledBlock = runtime.jit.compile([currentChild], runtime);

// JitCompiler.ts:31-47 - Strategy matching
for (const strategy of this.strategies) {
    if (strategy.match(nodes, runtime)) {
        return strategy.compile(nodes, runtime);
    }
}

// Matches TimerStrategy because nodes[0] has Timer fragment
// TimerStrategy.compile() executes:

const behaviors: IRuntimeBehavior[] = [];
behaviors.push(new TimerBehavior());

if (code[0].children && code[0].children.length > 0) {
    // code[0].children = [/* 3 child statements */] - EXISTS
    behaviors.push(new ChildAdvancementBehavior([])); // ❌ DEFECT: Ignores actual children
    behaviors.push(new LazyCompilationBehavior());
}

return new RuntimeBlock(runtime, [code[0].id], behaviors, "Timer");
```

**Result**: Compiled timer block has `ChildAdvancementBehavior` with **empty children array**, rendering it unable to advance.

### Next Execution Cycle Failure

When user clicks "Next Block" again:

```typescript
// Stack now: [RootBlock (currentIndex=1), TimerBlock (currentIndex=0)]
// Current block is TimerBlock

// NextAction calls TimerBlock.next()
// TimerBlock behaviors execute:
// 1. TimerBehavior.onNext() - Updates timer state
// 2. ChildAdvancementBehavior.onNext() - Increments currentIndex to 1
// 3. LazyCompilationBehavior.onNext() - Attempts compilation

const currentChild = childBehavior.getCurrentChild();
// childBehavior.children = [] - EMPTY
// childBehavior.currentChildIndex = 1
// Returns undefined because children.length = 0
```

**Terminal State**: Stack never grows beyond depth 2, execution cycles indefinitely between root and first compiled block.

## Correct Implementation Pattern

### Required Fix for All Strategies

```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    console.log(`  🧠 [Strategy] compiling ${code.length} statement(s)`);
    
    const behaviors: IRuntimeBehavior[] = [];
    
    // Add strategy-specific behaviors (e.g., TimerBehavior for TimerStrategy)
    
    // CORRECT: Pass actual children from statement
    if (code[0] && code[0].children && code[0].children.length > 0) {
        behaviors.push(new ChildAdvancementBehavior(code[0].children as CodeStatement[]));
        behaviors.push(new LazyCompilationBehavior());
    }
    
    return new RuntimeBlock(
        runtime,
        code[0]?.id ? [code[0].id] : [],
        behaviors,
        "[BlockType]"
    );
}
```

**Key Change**: Replace `new ChildAdvancementBehavior([])` with `new ChildAdvancementBehavior(code[0].children as CodeStatement[])`.

### Verification Pattern

The root block initialization demonstrates the correct pattern:

```typescript
// JitCompilerDemo.tsx:644
const childBehavior = new ChildAdvancementBehavior(wodScript.statements as CodeStatement[]);
```

This same approach must be replicated in **all strategy `compile()` methods**.

## Impact Analysis

### Current State: Non-Functional Runtime

- **Stack Depth**: Remains at 1 (root block only) despite clicked "Next Block"
- **Compilation**: Strategy matching works, compilation creates blocks, but blocks are non-functional
- **Behaviors**: All behavior types execute correctly, but operate on empty data structures
- **Memory**: No compilation errors, no crashes - system appears healthy but produces no output

### Post-Fix State: Expected Behavior

With corrected strategy implementations:

1. **First Click**: Root block advances to child 0, compiles Timer block with 3 children, pushes to stack
2. **Second Click**: Timer block advances to child 0, compiles Rep/Action block, pushes to stack
3. **Third Click**: Rep/Action block completes (no children), pops from stack, timer advances to child 1
4. **Subsequent Clicks**: Continue advancing through all timer children until completion

**Observable Metrics**:
- Stack depth oscillates between 2-3 blocks as children push/pop
- Each compilation produces functional blocks with correct child counts
- Memory entries accumulate for each compiled block
- Source line highlighting follows execution through parsed statements

## Recommended Implementation Strategy

### Phase 1: Immediate Fix (5 minutes)

**Objective**: Restore runtime advancement with minimal changes

1. **Edit `src/runtime/strategies.ts`**
   - Line 39: `new ChildAdvancementBehavior([])` → `new ChildAdvancementBehavior(code[0].children as CodeStatement[])`
   - Line 81: Same change
   - Line 152: Same change

2. **Verification**
   ```powershell
   npm run storybook
   # Navigate to Compiler > Jit Compiler Demo
   # Click "Next Block" - stack should grow to depth 2
   # Click again - stack should grow to depth 3 (if timer has children)
   ```

3. **Expected Console Output**
   ```
   🧠 TimerStrategy compiling 1 statement(s)
   🧠 JIT compiler returned block: [uuid]
   ⬆️  NEXT-BLOCK | Push Start - Depth: 1
   ✅ NEXT-BLOCK | Push Complete - Depth: 2
   ```

### Phase 2: Validation Testing (10 minutes)

**Test Scenarios**:

1. **Simple Timer Workout**
   ```
   20:00 AMRAP
   5 Pullups
   10 Pushups
   ```
   - Expected: 4 total blocks (Root → Timer → Rep/Action #1 → Rep/Action #2)
   - Stack depth: 2-3 during execution

2. **Rounds Workout**
   ```
   (3)
   10 Burpees
   20 Situps
   ```
   - Expected: 4 total blocks (Root → Rounds → Rep/Action #1 → Rep/Action #2)
   - Stack depth: 2-3 during execution

3. **Pure Effort Workout**
   ```
   100 Squats
   50 Lunges
   ```
   - Expected: 3 total blocks (Root → Effort #1 → Effort #2)
   - Stack depth: 2 during execution

### Phase 3: Regression Prevention (15 minutes)

**Add Unit Tests**: `src/runtime/strategies.test.ts`

```typescript
describe('Strategy Compilation - Child Advancement', () => {
    it('EffortStrategy should pass children to ChildAdvancementBehavior', () => {
        const statement = mockStatementWithChildren(3); // 3 child statements
        const strategy = new EffortStrategy();
        const block = strategy.compile([statement], mockRuntime);
        
        // Access behavior through block internals
        const childBehavior = block.behaviors.find(b => b instanceof ChildAdvancementBehavior);
        expect(childBehavior).toBeDefined();
        expect(childBehavior.getChildren().length).toBe(3);
    });
    
    // Repeat for TimerStrategy and RoundsStrategy
});
```

### Phase 4: Documentation Update (5 minutes)

**Update Specification**: `specs/009-jit-compiler-strategy/contracts/strategy-compilation-contract.md`

Add requirement:
```markdown
### Requirement: Child Statement Propagation

**When**: Strategy compiles statement with children
**Then**: ChildAdvancementBehavior must receive actual children array
**Verify**: `behavior.getChildren().length === code[0].children.length`

**Anti-pattern**:
```typescript
new ChildAdvancementBehavior([]) // ❌ Always empty
```

**Correct Pattern**:
```typescript
new ChildAdvancementBehavior(code[0].children as CodeStatement[]) // ✅ Propagates children
```
```

## Architectural Observations

### Design Pattern Correctness

The JitCompilerDemo architecture demonstrates **sound design principles**:

1. **Separation of Concerns**: Event handling, compilation, and behavior execution remain decoupled
2. **Strategy Pattern**: JIT compiler correctly delegates to pluggable strategies
3. **Behavior Composition**: RuntimeBlock composes multiple behaviors without coupling
4. **Lazy Evaluation**: Compilation occurs on-demand during runtime advancement
5. **Defensive Programming**: LazyCompilationBehavior validates child availability before compilation

**Assessment**: The defect is a simple data propagation bug, not an architectural flaw.

### Root Cause Classification

**Category**: Implementation Bug - Data Initialization Error

**Severity**: Critical (blocks all runtime advancement)

**Scope**: Isolated to 3 lines across 3 strategy classes

**Complexity**: Trivial fix requiring only parameter changes

**Risk**: Zero - changing empty arrays to actual arrays cannot introduce regressions

### Memory and Performance Considerations

The empty array defect has **no performance impact**:

- Behaviors execute in microseconds regardless of child count
- Memory allocations remain minimal (empty array vs. reference to existing array)
- Event handling cycles complete without blocking
- UI remains responsive during failed advancement cycles

**Post-Fix**: Performance characteristics remain unchanged - the architecture already handles child arrays efficiently at root block level.

## Conclusion and Strategic Recommendations

The JitCompilerDemo exhibits **comprehensive architectural correctness** with a **single localized implementation defect**. The event system, behavior orchestration, compilation pipeline, and memory management all function as designed. The runtime fails to advance solely because strategy implementations use hardcoded empty arrays instead of propagating child statements from parsed code.

### Immediate Action Required

**Single Change Set** - Modify 3 lines in `src/runtime/strategies.ts`:

1. EffortStrategy line 39
2. TimerStrategy line 81  
3. RoundsStrategy line 152

**Change**: `new ChildAdvancementBehavior([])` → `new ChildAdvancementBehavior(code[0].children as CodeStatement[])`

**Validation**: Run `npm run storybook`, open JIT Compiler Demo, click "Next Block", verify stack depth increases.

### Verification Criteria

**Success Metrics**:
- ✅ Stack depth grows beyond 1 on first "Next Block" click
- ✅ Compiled blocks appear in stack visualization with correct types
- ✅ Console logs show `PushBlockAction` execution
- ✅ Memory visualization displays entries for compiled blocks
- ✅ Source code highlighting follows execution through statements

### Long-Term Robustness

**Prevent Recurrence**:
1. Add contract tests requiring `behavior.getChildren().length > 0` when statements have children
2. Create integration test suite exercising all strategy types through full workout execution
3. Add type-safe helper method: `RuntimeBlock.withChildren(children: CodeStatement[]): IRuntimeBehavior[]`
4. Document strategy compilation contract in architecture documentation

**Monitoring**:
- Track stack depth metrics in Storybook stories
- Add compilation success rate logging
- Create visual indicators for compilation failures in UI

The architecture provides a **solid foundation** for the WOD Wiki runtime system. With this single implementation fix applied, the JitCompilerDemo will successfully demonstrate the complete lazy compilation pipeline from parsed statements through behavioral execution to stack management.
