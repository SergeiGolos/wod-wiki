# UnifiedWorkbench Coupling Analysis

The `UnifiedWorkbench` is a complex orchestration component that manages the entire workout planning, tracking, and analysis workflow. This document provides a comprehensive analysis of its coupling, dependency chain, and data flow.

---

## 1. Provider Hierarchy (Context Nesting)

The component wraps its content in a strict hierarchy of providers that establish different domains of concern:

```mermaid
flowchart TB
    subgraph Providers["Provider Hierarchy (outer → inner)"]
        TP[ThemeProvider]
        MP[MetricsProvider]
        CP[CommandProvider]
        WP[WorkbenchProvider]
        UWC[UnifiedWorkbenchContent]
    end
    
    TP --> MP --> CP --> WP --> UWC
    
    style TP fill:#e1f5fe
    style MP fill:#fff3e0
    style CP fill:#f3e5f5
    style WP fill:#e8f5e9
```

| Provider | Storage | Purpose |
|----------|---------|---------|
| **ThemeProvider** | `localStorage` (`wod-wiki-theme`) | Dark/light theme state |
| **MetricsProvider** | React state | Segment logging during workout |
| **CommandProvider** | React state | Command palette registry |
| **WorkbenchProvider** | React state | Core document/execution state |

---

## 2. WorkbenchContext - Central State Hub

The `WorkbenchProvider` is the main state container. It holds:

```mermaid
flowchart LR
    subgraph WBC["WorkbenchContext State"]
        direction TB
        DS["Document State"]
        ES["Execution State"]
        RS["Results State"]
    end
    
    DS --> |contains| C[content: string]
    DS --> |contains| B["blocks: WodBlock[]"]
    DS --> |contains| ABI[activeBlockId: string]
    
    ES --> |contains| SBI["selectedBlockId: string"]
    ES --> |contains| VM[viewMode: ViewMode]
    ES --> |contains| RT[runtime: ScriptRuntime]
    
    RS --> |contains| RES["results: WorkoutResults[]"]
```

### Key Actions from WorkbenchContext

| Action | Trigger | Effect |
|--------|---------|--------|
| `setContent` | Editor content change | Updates markdown content |
| `setBlocks` | `useWodBlocks` hook | Updates parsed WOD blocks |
| `selectBlock` | User clicks block | Sets `selectedBlockId` |
| `startWorkout` | "Start Workout" button | Sets `selectedBlockId`, changes to `track` view |
| `completeWorkout` | Stop button | Saves results, switches to `analyze` view |

---

## 3. Component Dependency Tree

```mermaid
flowchart TB
    UW[UnifiedWorkbench]
    
    subgraph Panels["Panel Components"]
        MEB[MarkdownEditorBase]
        TIP[TimerIndexPanel]
        TD[TimerDisplay]
        RDP[RuntimeDebugPanel]
        AIP[AnalyticsIndexPanel]
        TV[TimelineView]
    end
    
    subgraph Layout["Layout Components"]
        SV[SlidingViewport]
    end
    
    subgraph Hooks["Custom Hooks"]
        URE[useRuntimeExecution]
        UBE[useBlockEditor]
    end
    
    subgraph Runtime["Runtime System"]
        SR[ScriptRuntime]
        JIT[JitCompiler]
        RS[RuntimeStack]
        RM[RuntimeMemory]
    end
    
    UW --> SV
    SV --> MEB
    SV --> TIP
    SV --> TD
    SV --> RDP
    SV --> AIP
    SV --> TV
    
    UW --> URE
    UW --> UBE
    URE --> SR
    
    TIP --> SR
    RDP --> SR
    
    SR --> JIT
    SR --> RS
    SR --> RM
```

---

## 4. Event Flow: Editor → Runtime → UI

```mermaid
sequenceDiagram
    participant User
    participant Editor as MarkdownEditorBase
    participant WBC as WorkbenchContext
    participant RT as ScriptRuntime
    participant URE as useRuntimeExecution
    participant UI as TimerDisplay/TimerIndexPanel

    User->>Editor: Edit content
    Editor->>WBC: onContentChange(content)
    Editor->>WBC: onBlocksChange(blocks)
    
    User->>Editor: Click "Start Workout"
    Editor->>WBC: onStartWorkout(block)
    WBC->>WBC: selectBlock(id)
    WBC->>WBC: setViewMode('track')
    
    Note over WBC: useEffect triggers
    WBC->>RT: new ScriptRuntime(script)
    WBC->>RT: stack.push(rootBlock)
    
    User->>UI: Click Play
    UI->>URE: start()
    
    loop Every 20ms (TICK)
        URE->>RT: handle(TickEvent)
        RT->>RT: Process handlers
        RT->>RT: Execute actions
    end
    
    User->>UI: Click Stop
    UI->>URE: stop()
    URE->>WBC: completeWorkout(results)
    WBC->>WBC: setViewMode('analyze')
```

---

## 5. Data Flow: What Gets Saved and Where

```mermaid
flowchart LR
    subgraph Storage["Persistence Layer"]
        LS[(localStorage)]
    end
    
    subgraph ReactState["React State (Ephemeral)"]
        WBC[WorkbenchContext]
        MC[MetricsContext]
        CC[CommandContext]
    end
    
    subgraph Runtime["Runtime Memory"]
        RM[RuntimeMemory]
        ER[ExecutionRecords]
    end
    
    LS -->|theme| TP[ThemeProvider]
    TP -->|setTheme| LS
    
    WBC -->|content,blocks| Editor
    WBC -->|runtime| Track
    WBC -->|results| Analyze
    
    MC -->|segments,metrics| Track
    
    Runtime --> |executionLog| TIP[TimerIndexPanel]
    Runtime --> |activeSpans| TIP
```

### What's Persisted
- **Theme**: `localStorage` key `wod-wiki-theme`

### What's Ephemeral (React State)
- Document content and parsed blocks
- Runtime instance and execution state
- Workout results
- Metrics/segments
- Command registry

---

## 6. Event Types Passed Between Components

```mermaid
flowchart TB
    subgraph Events["Runtime Events"]
        TE[TickEvent]
        NE[NextEvent]
    end
    
    subgraph Callbacks["React Callbacks"]
        OCC[onContentChange]
        OBC[onBlocksChange]
        OABC[onActiveBlockChange]
        OSW[onStartWorkout]
        OCPC[onCursorPositionChange]
    end
    
    subgraph Actions["Execution Actions"]
        Start[start]
        Pause[pause]
        Stop[stop]
        Step[step]
    end
    
    URE[useRuntimeExecution] -->|emits| TE
    URE -->|emits| NE
    
    MEB[MarkdownEditorBase] -->|fires| OCC
    MEB -->|fires| OBC
    MEB -->|fires| OABC
    MEB -->|fires| OSW
    MEB -->|fires| OCPC
    
    TD[TimerDisplay] -->|calls| Start
    TD -->|calls| Pause
    TD -->|calls| Stop
    TD -->|calls| Step
```

---

## 7. View Mode State Machine

```mermaid
stateDiagram-v2
    [*] --> plan: Initial
    
    plan --> track: startWorkout(block)
    track --> analyze: completeWorkout(results)
    
    plan --> plan: Edit content
    track --> track: Play/Pause/Step
    analyze --> analyze: Select segments
    
    plan --> track: Click Track nav
    track --> plan: Click Plan nav
    track --> analyze: Click Analyze nav
    analyze --> plan: Click Plan nav
    analyze --> track: Click Track nav
```

---

## 8. Summary: Key Dependencies

| Component | Depends On | Provides To |
|-----------|------------|-------------|
| **UnifiedWorkbench** | All Providers | Entry point |
| **WorkbenchContext** | None | content, blocks, runtime, viewMode |
| **MarkdownEditorBase** | CommandContext | blocks, content changes, onStartWorkout |
| **TimerIndexPanel** | runtime (from context) | Execution history visualization |
| **TimerDisplay** | useRuntimeExecution | Timer UI, control buttons |
| **useRuntimeExecution** | ScriptRuntime | status, elapsedTime, controls |
| **SlidingViewport** | viewMode | Panel layout |
| **ScriptRuntime** | JitCompiler, RuntimeMemory | Event handling, execution state |

---

## 9. Identified Coupling Issues

### Issue 1: WorkbenchContext Knows Too Much
`WorkbenchContext` directly imports and instantiates `ScriptRuntime`, `WodScript`, and references `globalCompiler`. This mixes UI state management with runtime execution concerns.

**Location**: [WorkbenchContext.tsx](../src/components/layout/WorkbenchContext.tsx#L63-L76)

```typescript
// Current problematic code
const script = new WodScript(selectedBlock.content, selectedBlock.statements);
const newRuntime = new ScriptRuntime(script, globalCompiler);
const rootBlock = globalCompiler.compile(selectedBlock.statements as any, newRuntime);
```

### Issue 2: Deep Callback Chain for Start Workout
The `onStartWorkout` callback flows through multiple layers:
1. `MarkdownEditor` receives prop
2. Passes to `RichMarkdownManager` constructor
3. Card action triggers callback
4. Callback finds block in `blocksRef`
5. Finally calls `startWorkout` in context

**Location**: [MarkdownEditor.tsx](../src/markdown-editor/MarkdownEditor.tsx#L84-L110)

### Issue 3: Implicit Runtime Initialization
Runtime creation happens in a `useEffect` that watches `selectedBlockId` and `viewMode`. This implicit behavior makes it hard to understand when/why runtime is created.

**Location**: [WorkbenchContext.tsx](../src/components/layout/WorkbenchContext.tsx#L56-L78)

### Issue 4: Mock Analytics Data Hardcoded
`generateSessionData()` is defined inline in `UnifiedWorkbench.tsx` and generates fake data. This should be injected or fetched from a data source.

**Location**: [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L47-L100)

### Issue 5: MetricsContext Appears Unused
`MetricsProvider` is included in the provider hierarchy but `useMetrics()` is never called in `UnifiedWorkbenchContent`. The runtime has its own `MetricCollector`.

**Location**: Provider hierarchy in [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L421-L428)

### Issue 6: Duplicate Theme Synchronization
Theme is managed by `ThemeProvider` but also synchronized from Monaco editor's `propTheme`. There's bidirectional sync logic that can cause confusion.

**Location**: [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L217-L223)

### Issue 7: TimerDisplay is Inline Component
`TimerDisplay` is defined inside `UnifiedWorkbench.tsx` rather than as a separate component, making it harder to test and reuse.

**Location**: [UnifiedWorkbench.tsx](../src/components/layout/UnifiedWorkbench.tsx#L103-L160)
