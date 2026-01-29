# Worksheet: Fragment Collection & Execution Logging

This worksheet defines the architecture and next steps for enabling a robust, multi-origin fragment collection system within the WOD runtime. Our goal is to ensure that every piece of data—from the original workout text to the final recorded reps—is preserved, categorized, and linked to execution spans.

---

## 1. Problem Statements & Current State

| Issue                 | Description                                                                      | Impact                                                                            |
| :-------------------- | :------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Origin Blindness**  | Fragments do not track if they were parsed, compiled, or recorded at runtime.    | Cannot distinguish "What was planned" from "What actually happened".              |
| **One-Way Flow**      | Data flows down from Parser to Runtime, but nothing flows back up to the Logger. | Statistics (total time, reps completed) are lost upon block unmounting.           |
| **Implicit Grouping** | `ICodeFragment[][]` uses arrays for grouping without semantic labels.            | Hard to query "Round 2 results" vs "Effort 1 results" without fragile index math. |
| **Memory Volatility** | `TimerMemory` and `RoundMemory` are disposed but not archived as fragments.      | Runtime findings are memory-only; they don't persist in the execution log.        |
| **Span Disconnect**   | `RuntimeSpan` tracks timing but has no link to the fragments recorded within it. | Timing data (spans) and activity data (fragments) remain in silos.                |

---

## 2. Proposed Data Models

### 2.1 IOutputStatement — The Runtime's Output Record

The core insight is that the **Runtime produces statements too**, not just executes them. When a block completes, it emits an `IOutputStatement` that mirrors the input `ICodeStatement` but contains:

- **Execution timing** (TimeSpan)
- **Output type** (what kind of result this represents)
- **Runtime-generated fragments** (computed values, recorded metrics)

```typescript
/**
 * Output statement types:
 * - 'segment': A timed portion of execution (e.g., a round, an effort)
 * - 'completion': Block finished executing
 * - 'milestone': A notable event (e.g., halfway point, PR)
 * - 'label': Display-only output (e.g., "Rest" indicator)
 * - 'metric': Recorded statistic (e.g., total reps, avg pace)
 */
type OutputStatementType = 'segment' | 'completion' | 'milestone' | 'label' | 'metric';

/**
 * IOutputStatement extends ICodeStatement to represent runtime-generated output.
 * This is the **return type** of execution — what "came out" of running a statement.
 */
interface IOutputStatement extends ICodeStatement {
    /** The type of output this statement represents */
    readonly outputType: OutputStatementType;
    
    /** Execution timing — when this output occurred */
    readonly timeSpan: TimeSpan;
    
    /** The source statement ID that triggered this output (if any) */
    readonly sourceStatementId?: number;
    
    /** The block key that produced this output */
    readonly sourceBlockKey: string;
    
    /** 
     * Fragments on IOutputStatement are runtime-generated.
     * They inherit `origin: 'runtime'` or `origin: 'user'` automatically.
     */
    readonly fragments: ICodeFragment[];
}
```

### 2.2 Fragment Origin Metadata

All fragments now track their origin for filtering and analysis:

```typescript
type FragmentOrigin = 'parser' | 'compiler' | 'runtime' | 'user';

interface ICodeFragment {
    // Existing fields...
    readonly origin: FragmentOrigin;
    readonly sourceBlockKey?: string; // UID of the block that recorded it
    readonly timestamp?: Date;        // Wall-clock time of recording
}
```

### 2.3 Runtime Output Subscription

The `ScriptRuntime` emits `IOutputStatement[]` to subscribers as blocks complete:

```typescript
interface IScriptRuntime {
    // Existing...
    
    /** Subscribe to output statements generated during execution */
    subscribeToOutput(listener: (output: IOutputStatement) => void): Unsubscribe;
    
    /** Get all output statements generated so far */
    getOutputStatements(): IOutputStatement[];
}
```

### 2.4 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INPUT (Parser)                                                          │
│  ICodeStatement[] with fragments (origin: 'parser')                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  EXECUTION (Runtime)                                                     │
│  RuntimeBlock stack, behaviors execute, memory tracks state             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  OUTPUT (Runtime → Subscribers)                                         │
│  IOutputStatement[] with fragments (origin: 'runtime' | 'user')         │
│  - Emitted on block unmount                                              │
│  - Contains TimeSpan for when it happened                                │
│  - Notifies all subscribers                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Workflow

### Step 1: Create IOutputStatement Interface ✅
*   [x] Create `src/core/models/OutputStatement.ts`
*   [x] Define `OutputStatementType` enum
*   [x] Define `IOutputStatement` interface extending `ICodeStatement`
*   [x] Create `OutputStatement` class implementation

### Step 2: Add Fragment Origin Metadata ✅
*   [x] Update `ICodeFragment` interface to include `origin`, `sourceBlockKey`, and `timestamp`
*   [x] Update Parser to mark all fragments as `origin: 'parser'` — All 10 fragment classes now have `origin: 'parser'` as default
*   [N/A] Compiler strategies don't synthesize new fragments — they pass through parser-created fragments

### Step 3: Runtime Output Emission ✅
*   [x] Add `_outputStatements: IOutputStatement[]` array to `ScriptRuntime`
*   [x] Add `subscribeToOutput(listener): Unsubscribe` to `IScriptRuntime`
*   [x] Add `getOutputStatements(): IOutputStatement[]` to `IScriptRuntime`
*   [x] Update `popBlock()` to create `IOutputStatement` from unmounted block
*   [x] Notify output subscribers when new statements are emitted

### Step 4: Block Fragment Collection
*   [ ] Add `collectFragment(fragment: ICodeFragment): void` to `RuntimeBlock`
*   [ ] Add `getCollectedFragments(): ICodeFragment[]` to `RuntimeBlock`
*   [ ] Update `unmount()` to flush collected fragments into the output statement

### Step 5: Behavior Reporting Integration
*   [ ] Update `TimerBehavior.onPop()` to collect timer result fragment
*   [ ] Update `RoundPerLoopBehavior` to collect round completion fragments
*   [ ] Update `CompletionBehavior` to collect completion reason fragment

---

## 4. Open Questions & Decision Points

1.  **IOutputStatement ID Generation:** Should output statements have their own ID sequence, or should they reference the source statement ID?
    *   ✅ *Implemented:* Generate unique IDs starting at 1000000, include `sourceStatementId` for traceability.

2.  **Output Statement Granularity:** Should we emit one output per block, or multiple outputs for phases within a block (e.g., per-round outputs)?
    *   ✅ *Implemented:* One output per block unmount. Behaviors can emit additional outputs later.

3.  **Fragment Storage Location:** Should collected fragments live in the block or be pushed immediately to runtime?
    *   *Recommendation:* Store locally in the block until unmount, then package into the `IOutputStatement`.

4.  **Subscription Timing:** Should output subscribers be notified synchronously during `popBlock()` or async after the action queue settles?
    *   ✅ *Implemented:* Notify synchronously after all unmount actions have executed.

---

## 5. Completed Actions ✅

1.  [x] Create `src/core/models/OutputStatement.ts` with `IOutputStatement` interface
2.  [x] Update `ICodeFragment` to include `origin` field
3.  [x] Add output subscription API to `IScriptRuntime` and `ScriptRuntime`
4.  [x] Update `ScriptRuntime.popBlock()` to emit `IOutputStatement` on unmount
5.  [x] Write tests for output subscription flow (`OutputStatementEmission.test.ts`)
6.  [x] Update Parser fragment classes to default `origin: 'parser'` (10 fragment classes updated)
7.  [x] Write tests for fragment origin marking (`fragment-origin.test.ts`)

## 6. Remaining Work

1.  [x] Update Parser to mark fragments as `origin: 'parser'` ✅
2.  [N/A] Update Compiler strategies to mark fragments as `origin: 'compiler'` — Compiler doesn't create fragments
3.  [ ] Add `collectFragment()` API to `RuntimeBlock` for behaviors to record runtime fragments
4.  [ ] Update `TimerBehavior` to collect elapsed time as a runtime fragment
5.  [ ] Update other behaviors to collect their results as fragments



