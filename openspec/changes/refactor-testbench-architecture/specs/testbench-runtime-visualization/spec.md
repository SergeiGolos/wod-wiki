# Spec Delta: TestBench Runtime Visualization

## MODIFIED Requirements

### Requirement: Runtime State Visualization
The RuntimeTestBench SHALL visualize ScriptRuntime state using direct selector functions instead of intermediate snapshot objects, eliminating unnecessary object allocations.

**Changes:**
- Remove RuntimeAdapter class (301 lines)
- Remove ExecutionSnapshot interface
- Use lightweight selector functions for data transformation
- Maintain identical visual output to current implementation

#### Scenario: Display Runtime Stack Blocks
- **GIVEN** a ScriptRuntime with 3 active blocks in the stack
- **WHEN** the component renders
- **THEN** the RuntimeStackPanel displays all 3 blocks with correct labels, depths, and metrics
- **AND** no RuntimeAdapter instance is created
- **AND** no ExecutionSnapshot object is allocated
- **AND** selector functions transform data directly from runtime.stack.blocks

#### Scenario: Display Memory Entries
- **GIVEN** a ScriptRuntime with 10 memory entries
- **WHEN** the component renders
- **THEN** the MemoryPanel displays all 10 entries with correct keys, values, and owners
- **AND** memory entries are selected via `selectMemory(runtime)` function
- **AND** no intermediate snapshot object is created

#### Scenario: Update Visualization During Execution
- **GIVEN** a running workout with execution interval active
- **WHEN** runtime state changes every 100ms
- **THEN** panels re-render with updated data
- **AND** only panels with changed data re-render (via React.memo or Context optimization)
- **AND** total re-renders reduced by ≥50% compared to current implementation

### Requirement: Parser and Compiler Services
The RuntimeTestBench SHALL use module-level parser and compiler instances instead of component-scoped singletons, eliminating initialization overhead.

#### Scenario: Parse Code with Module-Level Parser
- **GIVEN** the RuntimeTestBench component mounts
- **WHEN** user types code in the editor
- **THEN** code is parsed using `globalParser.read(code)`
- **AND** no new MdTimerRuntime instance is created on mount
- **AND** parser instance is shared across all RuntimeTestBench component instances

#### Scenario: Compile Blocks with Module-Level Compiler
- **GIVEN** parsed workout statements
- **WHEN** user clicks "Compile"
- **THEN** statements are compiled using `globalCompiler.compile(script)`
- **AND** no new JitCompiler instance is created on mount
- **AND** compiler strategies are registered once at module load

## REMOVED Requirements

### Requirement: RuntimeAdapter Instantiation
**Removed**: The RuntimeTestBench SHALL create a RuntimeAdapter instance to transform ScriptRuntime state into ExecutionSnapshot objects.

**Reason**: RuntimeAdapter provides no business logic and creates unnecessary object allocation overhead (recreated every render).

**Migration**: Replace with selector class method calls:
```typescript
// Before
const adapter = new RuntimeAdapter();
const snapshot = adapter.createSnapshot(runtime);
const blocks = snapshot?.stack.blocks || [];

// After
import { runtimeSelectors } from './selectors/runtime-selectors';
const blocks = runtime ? runtimeSelectors.selectBlocks(runtime) : [];
```

### Requirement: ExecutionSnapshot State Management
**Removed**: The RuntimeTestBench SHALL maintain an ExecutionSnapshot object in component state representing the current runtime visualization state.

**Reason**: ExecutionSnapshot aggregates unrelated concerns (stack + memory + status + metadata) and is immediately destructured after creation.

**Migration**: Use granular state slices:
```typescript
// Before
const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);
const blocks = snapshot?.stack.blocks || [];
const memory = snapshot?.memory.entries || [];

// After
const blocks = runtime ? selectBlocks(runtime) : [];
const memory = runtime ? selectMemory(runtime) : [];
```

## ADDED Requirements

### Requirement: Selector Class for Data Transformation
The RuntimeTestBench SHALL provide a RuntimeSelectors class with methods that transform ScriptRuntime state into panel-ready data structures without object allocation overhead.

#### Scenario: Select Stack Blocks for Visualization
- **GIVEN** a ScriptRuntime with blocks in the stack
- **WHEN** `runtimeSelectors.selectBlocks(runtime)` is called
- **THEN** returns an array of RuntimeStackBlock objects with mapped properties
- **AND** method execution time is <0.1ms
- **AND** no intermediate objects are created beyond return array
- **AND** singleton instance used (created once at module load)

#### Scenario: Select Memory Entries for Visualization
- **GIVEN** a ScriptRuntime with memory entries
- **WHEN** `runtimeSelectors.selectMemory(runtime)` is called
- **THEN** returns an array of MemoryEntry objects
- **AND** method queries `runtime.memory.search({})` directly
- **AND** maps entries to panel display format
- **AND** method execution time is <1ms for 100 entries

### Requirement: Module-Level Service Initialization
The RuntimeTestBench SHALL use parser and compiler instances initialized at module scope, shared across all component instances.

#### Scenario: Share Parser Across Components
- **GIVEN** multiple RuntimeTestBench components rendered simultaneously
- **WHEN** each component parses code
- **THEN** all components use the same `globalParser` instance
- **AND** parser is created once when module first loads
- **AND** no useMemo hook is needed in component

#### Scenario: Share Compiler Across Components
- **GIVEN** multiple RuntimeTestBench components rendered simultaneously
- **WHEN** each component compiles statements
- **THEN** all components use the same `globalCompiler` instance
- **AND** strategies are registered once at module load (not per component)
- **AND** no useMemo hook is needed in component

## Performance Impact

**Current Performance (Baseline):**
- RuntimeAdapter instances created: 60/second during execution
- ExecutionSnapshot objects created: 60/second during execution
- Total object allocations: ~8 objects per render × 60 renders/second = 480 objects/second

**Target Performance (Post-Change):**
- RuntimeAdapter instances created: 0
- ExecutionSnapshot objects created: 0
- Selector function calls: 2 per render (zero allocation)
- Total object allocations: ~6 objects per render × 30 renders/second = 180 objects/second

**Expected Improvement: 62.5% reduction in object allocations**

## Backward Compatibility

**Breaking Changes:**
- `ExecutionSnapshot` interface removed from public API
- `RuntimeAdapter` class removed from exports
- Panel components receive direct state slices instead of snapshot properties

**Migration Path:**
- Update panel prop types to receive direct arrays instead of snapshot properties
- Replace `snapshot?.stack.blocks` with `blocks` prop
- Replace `snapshot?.memory.entries` with `memory` prop
- Update Storybook stories to pass direct state

**No Impact:**
- External consumers (none - RuntimeTestBench is internal development tool)
- Runtime execution behavior (unchanged)
- Visual output (identical appearance)
