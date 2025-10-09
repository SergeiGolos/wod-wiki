# Debugging Next Block: Strategic Breakpoint Guide

This guide identifies the best locations for setting breakpoints when debugging the "next block" functionality in the WOD Wiki runtime system.

> **Note**: This guide works in conjunction with the [Next Block Logging System](./next-block-logging-summary.md) which provides structured console logs at each stage.

## Flow Overview

When the "Next Block" button is clicked in the JIT Compiler Demo:

```
UI Click → NextEvent → NextAction → RuntimeBlock.next() → Behaviors → PushBlockAction → Stack Operations
```

## Logging Integration

Each breakpoint location corresponds to a specific log entry from `NextBlockLogger`:

| Breakpoint Stage | Log Message | What to Check |
|------------------|-------------|---------------|
| NextAction.ts:31 | `🎯 NEXT-BLOCK \| Action Start` | Block key, stack depth |
| RuntimeBlock.ts:88 | `🔄 NEXT-BLOCK \| Behavior Orchestration` | Behavior count |
| ChildAdvancementBehavior.ts:36 | `📍 NEXT-BLOCK \| Child Advancement` | Index, total, progress |
| LazyCompilationBehavior.ts:57 | `🔨 NEXT-BLOCK \| Compilation Start` | Statement ID |
| LazyCompilationBehavior.ts:70 | `✅ NEXT-BLOCK \| Compilation Success` | New block key |
| PushBlockAction.ts:32 | `⬆️  NEXT-BLOCK \| Push Start` | Depth before |
| RuntimeStack.ts:56 | `📚 NEXT-BLOCK \| Stack Modified` | Depth change |
| PushBlockAction.ts:47 | `✅ NEXT-BLOCK \| Push Complete` | Depth after, init actions |
| NextAction.ts:53 | `✅ NEXT-BLOCK \| Action Complete` | New depth, actions executed |

## 🎯 Critical Breakpoints by Stage

### Stage 1: Event Entry Point

**Location**: `stories/compiler/JitCompilerDemo.tsx:642`  
**Function**: `handleNextBlock()`  
**Why**: This is where the user interaction enters the runtime system.

```typescript
const handleNextBlock = () => {
  // BREAKPOINT HERE - Entry point for next block request
  if (!runtime) {
    console.warn('No runtime available for Next button action');
    return;
  }
```

**What to inspect**:
- `runtime.stack.current` - Current block being executed
- `runtime.stack.blocks.length` - Current stack depth
- `isProcessingNext` - Check for race conditions

---

### Stage 2: NextAction Execution

**Location**: `src/runtime/NextAction.ts:31`  
**Function**: `NextAction.do()`  
**Why**: Critical point where block advancement logic begins.

```typescript
try {
  // Execute block's next logic
  console.log(`NextAction: Advancing from block ${currentBlock.key.toString()}`);
  const nextActions = currentBlock.next(); // BREAKPOINT HERE
```

**What to inspect**:
- `currentBlock` - The block being advanced
- `currentBlock.key` - Block identifier
- Return to see `nextActions` - What actions are returned

---

### Stage 3: RuntimeBlock Behavior Orchestration

**Location**: `src/runtime/RuntimeBlock.ts:88`  
**Function**: `RuntimeBlock.next()`  
**Why**: This is where behaviors are invoked in sequence.

```typescript
next(): IRuntimeAction[] {
  const actions: IRuntimeAction[] = [];
  for (const behavior of this.behaviors) { // BREAKPOINT HERE
    const result = behavior?.onNext?.(this._runtime, this);
    if (result) { actions.push(...result); }
  }
  return actions;
}
```

**What to inspect**:
- `this.behaviors` - List of all behaviors on this block
- `this.behaviors.length` - How many behaviors will execute
- `actions` - Accumulated actions after each behavior

---

### Stage 4A: Child Advancement (Index Tracking)

**Location**: `src/runtime/behaviors/ChildAdvancementBehavior.ts:30`  
**Function**: `ChildAdvancementBehavior.onNext()`  
**Why**: Tracks which child will be processed next.

```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // Check if we're already complete
  if (this.currentChildIndex >= this.children.length) { // BREAKPOINT HERE
    return [];
  }
  
  // Advance to next child
  this.currentChildIndex++; // BREAKPOINT HERE
```

**What to inspect**:
- `this.currentChildIndex` - Current position in children array
- `this.children.length` - Total number of children
- `this.children[this.currentChildIndex]` - Next child to compile

---

### Stage 4B: Lazy Compilation (JIT)

**Location**: `src/runtime/behaviors/LazyCompilationBehavior.ts:33`  
**Function**: `LazyCompilationBehavior.onNext()`  
**Why**: Where child statements are compiled into runtime blocks.

```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // Get ChildAdvancementBehavior to find current child
  const childBehavior = this.getChildBehavior(block); // BREAKPOINT HERE
  if (!childBehavior) {
    return [];
  }
  
  // Get current child before advancement happens
  const currentChild = childBehavior.getCurrentChild(); // BREAKPOINT HERE
```

**What to inspect**:
- `childBehavior` - The advancement behavior instance
- `currentChild` - The CodeStatement being compiled
- `currentIndex` - Position in children array

**Secondary breakpoint**: Line 57 - JIT compilation result
```typescript
const compiledBlock = runtime.jit.compile([currentChild], runtime); // BREAKPOINT HERE
```

**What to inspect**:
- `currentChild` - Input to compiler
- Return to see `compiledBlock` - Newly created runtime block
- `compiledBlock.key` - New block's identifier

---

### Stage 5: PushBlockAction Execution

**Location**: `src/runtime/PushBlockAction.ts:26`  
**Function**: `PushBlockAction.do()`  
**Why**: Where the new block is actually added to the stack.

```typescript
try {
  console.log(`PushBlockAction: Pushing block ${this.block.key.toString()} onto stack`);
  
  // Push the block onto the stack
  runtime.stack.push(this.block); // BREAKPOINT HERE
  
  // Call the block's push() method to get any initial actions
  const pushActions = this.block.push(); // BREAKPOINT HERE
```

**What to inspect**:
- `this.block` - The block being pushed
- `this.block.key` - New block's identifier
- Before push: `runtime.stack.blocks.length` (old depth)
- After push: `runtime.stack.blocks.length` (new depth)
- `pushActions` - Initialization actions from the new block

---

### Stage 6: Stack Operations

**Location**: `src/runtime/RuntimeStack.ts:46`  
**Function**: `RuntimeStack.push()`  
**Why**: Actual stack modification with validation.

```typescript
public push(block: IRuntimeBlock): void {
  // Validate before push
  this._validator.validatePush(block, this._blocks.length); // BREAKPOINT HERE
  
  const blockKey = block.key.toString();
  console.log(`📚 RuntimeStack.push() - Adding block: ${blockKey}`);
  
  // Simple push - no initialization calls
  this._blocks.push(block); // BREAKPOINT HERE
```

**What to inspect**:
- `block.key` - Block being added
- `this._blocks.length` - Stack depth before push
- After `_blocks.push()`: `this._blocks.length` - New depth
- `this.current` - New current block

---

## 🔍 Debugging Scenarios

### Scenario 1: Next Block Not Advancing

**Check these breakpoints in order**:
1. `JitCompilerDemo.tsx:642` - Is the click handler called?
2. `NextAction.ts:31` - Is NextAction executing?
3. `RuntimeBlock.ts:88` - Are behaviors being called?
4. `ChildAdvancementBehavior.ts:36` - Is the index advancing?
5. `LazyCompilationBehavior.ts:57` - Is compilation successful?

### Scenario 2: Wrong Block Being Compiled

**Focus on these breakpoints**:
1. `ChildAdvancementBehavior.ts:30` - Check `currentChildIndex`
2. `ChildAdvancementBehavior.ts:69` - See `getCurrentChild()` result
3. `LazyCompilationBehavior.ts:43` - Inspect `currentChild` statement

### Scenario 3: Stack Corruption or Unexpected Depth

**Check these points**:
1. `RuntimeStack.ts:46` - Validation before push
2. `RuntimeStack.ts:56` - Stack modification
3. `PushBlockAction.ts:32` - Push action execution
4. `PushBlockAction.ts:35` - Block initialization

### Scenario 4: Missing or Duplicate Behaviors

**Inspect here**:
1. `RuntimeBlock.ts:88` - Check `this.behaviors` array
2. Step through the loop to see each behavior's contribution
3. Check `actions` array after each iteration

---

## 🎬 Step-by-Step Debugging Session

### Recommended Breakpoint Set for Full Flow

Set ALL of these breakpoints for a complete trace:

1. ✅ `JitCompilerDemo.tsx:642` - UI entry point
2. ✅ `NextAction.ts:31` - Action execution
3. ✅ `RuntimeBlock.ts:88` - Behavior orchestration (for loop)
4. ✅ `ChildAdvancementBehavior.ts:30` - Completion check
5. ✅ `ChildAdvancementBehavior.ts:36` - Index increment
6. ✅ `LazyCompilationBehavior.ts:43` - Get child
7. ✅ `LazyCompilationBehavior.ts:57` - JIT compilation
8. ✅ `PushBlockAction.ts:32` - Stack push
9. ✅ `RuntimeStack.ts:56` - Stack modification

### Execution Order When All Set

```
1. JitCompilerDemo (UI)
2. NextAction.do()
3. RuntimeBlock.next() 
4. → ChildAdvancementBehavior.onNext() (checks completion)
5. → ChildAdvancementBehavior.onNext() (increments index)
6. → LazyCompilationBehavior.onNext() (gets child)
7. → LazyCompilationBehavior.onNext() (compiles child)
8. PushBlockAction.do()
9. RuntimeStack.push()
```

---

## 📊 Key Variables to Watch

### In NextAction
- `currentBlock.key` - Which block is advancing
- `nextActions` - Actions generated by behaviors

### In ChildAdvancementBehavior
- `currentChildIndex` - Position in children array
- `children.length` - Total children count
- `children[currentChildIndex]` - Next child statement

### In LazyCompilationBehavior
- `currentChild` - Statement being compiled
- `compiledBlock` - Result of JIT compilation
- `compiledBlock.key` - New block identifier

### In RuntimeStack
- `this._blocks.length` - Stack depth
- `this.current` - Top of stack
- `this.blocks` - Full stack (reversed view)

---

## 🚀 Quick Start: Minimal Breakpoint Set

If you only want to set a few breakpoints, use these **5 critical points**:

1. **`JitCompilerDemo.tsx:642`** - Entry point
2. **`NextAction.ts:31`** - Action execution
3. **`ChildAdvancementBehavior.ts:36`** - Index advancement
4. **`LazyCompilationBehavior.ts:57`** - JIT compilation
5. **`RuntimeStack.ts:56`** - Stack modification

This minimal set covers the entire flow from UI to stack changes.

---

## 🐛 Common Issues and Where to Break

| Issue | First Breakpoint | What to Check |
|-------|------------------|---------------|
| Button click not working | `JitCompilerDemo.tsx:642` | Is handler called? |
| NextAction not executing | `NextAction.ts:31` | Is current block valid? |
| Index not advancing | `ChildAdvancementBehavior.ts:36` | Check currentChildIndex |
| Wrong child compiled | `LazyCompilationBehavior.ts:43` | Inspect currentChild |
| JIT compilation fails | `LazyCompilationBehavior.ts:57` | Check compile() result |
| Stack not growing | `RuntimeStack.ts:56` | Check _blocks.push() |
| Behaviors not running | `RuntimeBlock.ts:88` | Check behaviors array |

---

## 📝 Logging Strategy

Each location has structured logs from `NextBlockLogger`. When debugging:

1. **Keep console open** - Structured logs show the flow
2. **Look for NEXT-BLOCK prefix** - All validation logs use this pattern:
   ```
   🎯 NEXT-BLOCK | Stage Name { key: value, ... }
   ```

3. **Emoji meanings**:
   - 🎯 = Action Start (NextAction begins)
   - 🔄 = Behavior Orchestration (RuntimeBlock.next)
   - � = Child Advancement (index progress)
   - �🔨 = Compilation Start (JIT invoked)
   - ✅ = Success (compilation/push/action complete)
   - ⬆️  = Push Start (block being added)
   - 📚 = Stack Modified (depth changed)
   - ❌ = Error (compilation failed/error in stage)
   - ⚠️  = Validation Failed (check failed)

4. **Match breakpoint to log** - Each breakpoint corresponds to a specific log entry

5. **Filter logs in terminal**:
   ```powershell
   npm run test:unit 2>&1 | Select-String -Pattern "NEXT-BLOCK"
   ```

---

## 🎓 Advanced: Conditional Breakpoints

### Break on Specific Block
```javascript
// In RuntimeBlock.next()
this.key.toString().includes("specific-id")
```

### Break on Specific Child Index
```javascript
// In ChildAdvancementBehavior
this.currentChildIndex === 2
```

### Break When Stack Depth Reaches N
```javascript
// In RuntimeStack.push()
this._blocks.length === 5
```

### Break on Completion
```javascript
// In ChildAdvancementBehavior
this.currentChildIndex >= this.children.length
```

---

## 📚 Related Files for Context

- **Event System**: `src/runtime/NextEvent.ts`
- **Runtime Interface**: `src/runtime/IScriptRuntime.ts`
- **Block Interface**: `src/runtime/IRuntimeBlock.ts`
- **JIT Compiler**: `src/runtime/JitCompiler.ts`
- **Memory System**: `src/runtime/RuntimeMemory.ts`

---

## ✅ Validation After Changes

After making changes to the next block flow, test with breakpoints at:

1. **`NextAction.ts:31`** - Ensure action executes
2. **`LazyCompilationBehavior.ts:57`** - Verify compilation succeeds
3. **`RuntimeStack.ts:56`** - Confirm stack grows correctly

Then run the full test suite:
```bash
npm run test:unit
```
