# Tracker Technical Spec

> **Scope:** Models, data structures, interfaces, and data flow for the Tracker (live workout execution) screen.
> **Parent:** [WOD-614](/WOD/issues/WOD-614)

---

## 1. Component Inventory & Component Tree

### 1.1 Top-Level Entry Points

| Component | File | Role |
|-----------|------|------|
| `TrackPanel` | `panels/track-panel.tsx` | Browser track view controller. Switches between preview (no runtime), wizard (pre-run collection metrics), and live `TrackViewShell`. |
| `ReceiverApp` | `receiver-rpc.tsx` | Chromecast receiver root. Wraps `TrackViewShell` in `ScriptRuntimeProvider` with `ChromecastProxyRuntime`. |

### 1.2 Shared Shell

| Component | File | Role |
|-----------|------|------|
| `TrackViewShell` | `components/workout/TrackViewShell.tsx` | Layout shell: left panel (visual state) + right panel (timer). Responsive (`flex-col` on compact, `flex-row` on desktop). |

### 1.3 Left Panel — Visual State

| Component | File | Role |
|-----------|------|------|
| `VisualStatePanel` | `panels/visual-state-panel.tsx` | Renders `RuntimeStackView` + `LookaheadView` card. Subscribes to outputs. |
| `RuntimeStackView` | `components/track/VisualStateComponents.tsx` | Reverses stack blocks (root→leaf) and renders `StackBlockItem` interleaved with history summaries. |
| `StackBlockItem` | `components/track/VisualStateComponents.tsx` | Individual block card. Shows label, timer elapsed, display/promote/private metrics, debug inspect button. |
| `LookaheadView` | `components/track/VisualStateComponents.tsx` | "Up Next" preview using `useNextPreview()`. |
| `MetricSourceRow` | `components/metrics/MetricSourceRow.tsx` | Renders a row of metric fragments (used inside block cards). |
| `VisibilityBadge` | `components/metrics/VisibilityBadge.tsx` | Tiny badge for metric visibility tier (`display` / `promote` / `private`). |
| `BlockDebugDialog` | `components/track/BlockDebugDialog.tsx` | Dialog with tabs: Statements, Behaviors, Memory. |
| `MetricTrackerCard` | `components/track/MetricTrackerCard.tsx` | Floating analytics bubbles from `metrics['session-totals']`; humanizes unknown keys and safely falls back for custom/calculated metrics. |

### 1.4 Right Panel — Timer / Controls

| Component | File | Role |
|-----------|------|------|
| `TimerDisplay` | `panels/timer-panel.tsx` | Stack-integrated timer. Chooses between `StackIntegratedTimer` (runtime present) and fallback `TimerStackView`. |
| `StackIntegratedTimer` | `panels/timer-panel.tsx` | Subscribes to primary/secondary timers, round display, controls, and drives `TimerStackView`. |
| `TimerStackView` | `components/workout/TimerStackView.tsx` | SVG timer ring, play/pause/stop/next buttons, swipe gestures, skip-flash animation. |
| `ReceiverTimerPanel` | `panels/timer-panel-chromecast.tsx` | Thin adapter that dispatches events to `IRuntimeEventProvider`. |

### 1.5 Supporting Components

| Component | File | Role |
|-----------|------|------|
| `TimerIndexPanel` | `components/layout/TimerIndexPanel.tsx` | Session history / segment list (left side of some layouts). |
| `WorkoutPreviewPanel` | `components/workbench/WorkoutPreviewPanel.tsx` | Shows parsed WOD blocks before workout starts. |
| `CollectionWizard` | `components/review/CollectionWizard.tsx` | Pre-run metric override UI (history-based projections). |
| `ScriptRuntimeProvider` | `runtime/context/RuntimeContext.tsx` | React context providing `IScriptRuntime`. |
| `RuntimeLifecycleProvider` | `components/layout/RuntimeLifecycleProvider.tsx` | Creates/disposes `ScriptRuntime` + `SubscriptionManager` + `WorkoutTracker`. |

### 1.6 Component Tree (Browser Track View)

```
TrackPanel (panels/track-panel.tsx)
├── WorkoutPreviewPanel          [idle / no runtime]
└── ScriptRuntimeProvider
    └── TrackViewShell
        ├── leftPanel: VisualStatePanel
        │   ├── RuntimeStackView
        │   │   └── StackBlockItem[]
        │   │       ├── MetricSourceRow (display)
        │   │       ├── MetricSourceRow (promote/private, debug)
        │   │       └── BlockDebugDialog (debug)
        │   └── LookaheadView
        └── rightPanel: TimerDisplay
            ├── MetricTrackerCard
            └── TimerStackView
```

---

## 2. TypeScript Interfaces / Models

### 2.1 Tracker Domain Models

#### `RuntimeStackTracker`
*File: `src/runtime/contracts/IRuntimeOptions.ts`*

```typescript
export interface RuntimeStackTracker {
    getActiveSpanId?: (blockKey: string) => string | null | undefined;
    startSpan?: (block: IRuntimeBlock, parentSpanId: string | null) => void;
    endSpan?: (blockKey: string) => void;
    recordMetric?: (blockId: string, metricKey: string, value: any, unit?: string) => void;
    recordRound?: (blockId: string, currentRound: number, totalRounds?: number) => void;
    onUpdate?: (callback: (update: TrackerUpdate) => void) => () => void;
    getSnapshot?: () => TrackerSnapshot;
}
```

| Method | Purpose |
|--------|---------|
| `recordMetric` | Real-time exercise metric (reps, distance, weight) |
| `recordRound` | Round progression (e.g., "Round 2 of 5") |
| `onUpdate` | Subscribe to live tracker updates |
| `getSnapshot` | Get full tracker state as plain object |
| `startSpan` / `endSpan` | Optional span lifecycle hooks (used by analytics) |

#### `TrackerSnapshot`
```typescript
export interface TrackerSnapshot {
    metrics: Record<string, Record<string, { value: any; unit?: string }>>;
    rounds: Record<string, { current: number; total?: number }>;
}
```
- **metrics:** `blockId → metricKey → { value, unit }`
- **rounds:** `blockId → { current, total }`

#### `TrackerUpdate` (discriminated union)
```typescript
export type TrackerUpdate =
    | { type: 'metric'; blockId: string; key: string; value: any; unit?: string; timestamp: number }
    | { type: 'round'; blockId: string; current: number; total?: number; timestamp: number }
    | { type: 'snapshot'; snapshot: TrackerSnapshot; timestamp: number };
```

### 2.2 Runtime Contracts

#### `IScriptRuntime` (tracker-relevant subset)
*File: `src/runtime/contracts/IScriptRuntime.ts`*

```typescript
export interface IScriptRuntime extends IRuntimeActionable {
    options: RuntimeStackOptions;
    tracker?: RuntimeStackTracker;
    script: WhiteboardScript;
    eventBus: IEventBus;
    stack: IRuntimeStack;
    jit: IJitCompiler;
    clock: IRuntimeClock;
    errors?: RuntimeError[];

    subscribeToTracker(listener: TrackerListener): Unsubscribe;
    subscribeToStack(observer: StackObserver): Unsubscribe;
    subscribeToOutput(listener: OutputListener): Unsubscribe;
    getOutputStatements(): IOutputStatement[];
    addOutput(output: IOutputStatement): void;
    handle(event: IEvent): void;
    dispose(): void;
}
```

#### `IRuntimeStack`
*File: `src/runtime/contracts/IRuntimeStack.ts`*

```typescript
export interface IRuntimeStack {
    readonly blocks: readonly IRuntimeBlock[];
    readonly count: number;
    readonly current: IRuntimeBlock | undefined;
    readonly keys: BlockKey[];

    push(block: IRuntimeBlock): void;
    pop(): IRuntimeBlock | undefined;
    clear(): void;
    subscribe(listener: StackListener): () => void;
}
```

- `blocks` is stored **leaf-first** (index 0 = leaf, index N = root). UI reverses this for display.

#### `StackSnapshot`
```typescript
export interface StackSnapshot {
    type: 'push' | 'pop' | 'clear' | 'initial';
    blocks: readonly IRuntimeBlock[];
    affectedBlock?: IRuntimeBlock;
    depth: number;
    clockTime: Date;
}
```

#### `IRuntimeBlock` (tracker-relevant subset)
*File: `src/runtime/contracts/IRuntimeBlock.ts`*

```typescript
export interface IRuntimeBlock extends IBlockRef {
    readonly key: BlockKey;
    readonly sourceIds: number[];
    readonly blockType?: string;
    readonly label: string;
    readonly context: IBlockContext;
    readonly isComplete: boolean;
    readonly completionReason?: string;
    readonly behaviors: readonly IRuntimeBehavior[];

    mount(runtime: IRuntimeActionable, options?: BlockLifecycleOptions): IRuntimeAction[];
    next(runtime: IRuntimeActionable, options?: BlockLifecycleOptions): IRuntimeAction[];
    unmount(runtime: IRuntimeActionable, options?: BlockLifecycleOptions): IRuntimeAction[];
    dispose(runtime: IRuntimeActionable): void;

    getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined;
    pushMemory(location: IMemoryLocation): void;
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
    getAllMemory(): IMemoryLocation[];
    getMetricMemoryByVisibility(visibility: MetricVisibility): IMemoryLocation[];
    markComplete(reason?: string): void;
}
```

### 2.3 Memory Types

*File: `src/runtime/memory/MemoryTypes.ts` (inferred from usage)*

```typescript
interface TimerState {
    spans: Array<{ started: number; ended?: number }>;
    direction: 'up' | 'down';
    durationMs?: number;
    label?: string;
    role?: string;
}

interface RoundState {
    current: number;
    total?: number;
}

interface DisplayState {
    roundDisplay?: string;
}
```

### 2.4 Subscription Contracts

#### `IRuntimeSubscription`
*File: `src/runtime/contracts/IRuntimeSubscription.ts`*

```typescript
export interface IRuntimeSubscription {
    readonly id: string;
    onStackSnapshot(snapshot: StackSnapshot): void;
    onOutput(output: IOutputStatement): void;
    onTrackerUpdate(update: TrackerUpdate): void;
    dispose(): void;
}
```

#### `ICastSubscription` (extends above)
*File: `src/runtime/contracts/ICastSubscription.ts`*

```typescript
export interface ICastSubscription extends IRuntimeSubscription {
    sendAnalyticsSummary(
        projections: Array<{ name: string; value: number; unit: string; metricType?: string }>,
        totalDurationMs: number,
        completedSegments: number,
    ): void;
}
```

### 2.5 RPC Wire Types (Chromecast)

*File: `src/services/cast/rpc/RpcMessages.ts`*

```typescript
interface RpcTrackerUpdate {
    type: 'rpc-tracker-update';
    update: {
        type: 'metric' | 'round';
        blockId: string;
        key?: string;
        value?: any;
        unit?: string;
        current?: number;
        total?: number;
        timestamp: number;
    };
}

interface RpcStackUpdate {
    type: 'rpc-stack-update';
    snapshotType: 'push' | 'pop' | 'clear' | 'initial';
    blocks: SerializedBlock[];
    affectedBlockKey?: string;
    depth: number;
    clockTime: number;
}

interface SerializedBlock {
    key: string;
    blockType: string;
    label: string;
    sourceIds: number[];
    isComplete: boolean;
    completionReason?: string;
    displayFragments: IMetric[][];
    promoteFragments?: IMetric[][];
    resultFragments?: IMetric[][];
    privateFragments?: Record<MemoryTag, IMetric[][]>;
    timer: SerializedTimer | null;
    nextFragments?: IMetric[];
    behaviorsMetadata?: SerializedBehavior[];
}
```

### 2.6 Hook Return Types

#### `UseRuntimeExecutionReturn`
*File: `src/runtime/hooks/useRuntimeExecution.ts`*

```typescript
export interface UseRuntimeExecutionReturn {
    status: ExecutionStatus;      // 'idle' | 'running' | 'paused' | 'completed' | 'error'
    elapsedTime: number;
    stepCount: number;
    startTime: number | null;
    start: () => void;
    pause: () => void;
    stop: () => void;
    reset: () => void;
    step: () => void;
}
```

#### `OutputStatementsData`
*File: `src/runtime/hooks/useOutputStatements.ts`*

```typescript
export interface OutputStatementsData {
    outputs: IOutputStatement[];
    byId: Map<number, IOutputStatement>;
    byBlockKey: Map<string, IOutputStatement[]>;
    segments: IOutputStatement[];
    completions: IOutputStatement[];
    metrics: IOutputStatement[];
}
```

---

## 3. Data Flow

### 3.1 Initialization Flow

```
User clicks "Run" on WOD block
    ↓
Workbench calls initializeRuntime(block)
    ↓
RuntimeLifecycleProvider
    1. Disposes old runtime + SubscriptionManager
    2. Creates new WorkoutTracker()
    3. Factory.createRuntime(block, { tracker })
    4. new SubscriptionManager(runtime)
    5. mgr.add(new LocalRuntimeSubscription({ id: 'local' }))
    ↓
ScriptRuntime compiles block via JIT → pushes blocks to stack
    ↓
Stack mutations → SubscriptionManager fans out to all subscriptions
```

### 3.2 Live Execution Flow (Browser)

```
TickEvent (20ms interval) or NextEvent (user action)
    ↓
ScriptRuntime.handle(event)
    ↓
Behaviors react (timers start/stop, rounds advance)
    ↓
Behaviors push memory to IRuntimeBlock (time, round, metric:display, etc.)
    ↓
MemoryLocation subscribers fire → React hooks re-render
    ↓
useStackSnapshot → useSnapshotBlocks → StackBlockItem re-renders
useTimerDisplay / useTimerElapsed → TimerStackView re-renders
useWorkoutTracker → MetricTrackerCard re-renders
    ↓
UI updates
```

### 3.3 Tracker Update Flow

```
Behavior emits TrackMetricAction or TrackRoundAction
    ↓
ScriptRuntime.do(action)
    ↓
WorkoutTracker.recordMetric() / .recordRound()
    ↓
1. Updates internal Map (metrics / rounds)
2. Calls notify() → iterates listener Set
    ↓
SubscriptionManager (subscribed via tracker.onUpdate)
    ↓
For each IRuntimeSubscription:
    - LocalRuntimeSubscription.onTrackerUpdate (no-op by default)
    - ChromecastRuntimeSubscription.onTrackerUpdate → RpcSerializer → transport.send()
    ↓
Browser UI (via useWorkoutTracker hook) receives update
```

### 3.4 Chromecast Sync Flow

```
Browser (sender)
    ScriptRuntime stack push/pop
        ↓
    SubscriptionManager.onStackSnapshot()
        ↓
    ChromecastRuntimeSubscription
        - serializeStackSnapshot() → RpcStackUpdate
        - computeFingerprint() (skip if unchanged)
        - transport.send() over WebRTC DataChannel
        ↓
Receiver (Chromecast)
    ChromecastProxyRuntime.handleRpcMessage()
        ↓
    ProxyStack._updateFromSnapshot(blocks, event)
        ↓
    Stack listeners (useStackSnapshot) re-render
    Block cache preserves ProxyBlock instances across updates
        ↓
    Receiver UI updates identically to browser
```

### 3.5 Event Flow (User Action → State Update)

```
User presses "Next" in TimerStackView
    ↓
TimerStackView onNext → props.onNext()
    ↓
TrackPanel props.onNext → handleNext() in useWorkbenchRuntime
    ↓
runtime.handle(new NextEvent())
    ↓
RuntimeStack pop → block.unmount() → addOutput()
    ↓
Parent block.next() → push next child
    ↓
StackSnapshot emitted → UI re-renders
```

### 3.6 Clock Sync (Chromecast)

```
Browser sends rpc-clock-sync-request
    ↓
Receiver responds with receiverTimestamp
    ↓
Browser calculates offsetMs = receiverTime - (senderTime + RTT/2)
    ↓
Browser sends rpc-clock-sync-result with offsetMs
    ↓
Receiver stores clockOffsetMs
    ↓
Receiver's getSenderClockTimeMs() = Date.now() - clockOffsetMs
    ↓
Timer hooks use sender clock for accurate elapsed time display
```

---

## 4. External Dependencies

### 4.1 Hooks & Contexts Consumed by Tracker

| Hook / Context | Source | Purpose |
|----------------|--------|---------|
| `useScriptRuntime` | `runtime/context/RuntimeContext` | Access runtime memory, stack, clock |
| `useRuntimeExecution` | `runtime/hooks/useRuntimeExecution` | Start/pause/stop/step execution |
| `useStackSnapshot` | `runtime/hooks/useStackSnapshot` | Subscribe to stack mutations |
| `useSnapshotBlocks` | `runtime/hooks/useStackSnapshot` | Convenience: current blocks array |
| `useSnapshotCurrentBlock` | `runtime/hooks/useStackSnapshot` | Top block on stack |
| `useOutputStatements` | `runtime/hooks/useOutputStatements` | Subscribe to completed outputs |
| `useWorkoutTracker` | `runtime/hooks/useWorkoutTracker` | Subscribe to tracker metric/round updates |
| `useTimerElapsed` | `runtime/hooks/useTimerElapsed` | Elapsed time by block key (60fps rAF) |
| `useTimerDisplay` | `runtime/hooks/useBlockMemory` | Derived timer values (formatted, remaining) |
| `useRoundDisplay` | `runtime/hooks/useBlockMemory` | Derived round values (label, progress) |
| `useNextPreview` | `runtime/hooks/useNextPreview` | "Up Next" preview from metrics:next memory |
| `usePrimaryTimer` | `runtime/hooks/useStackDisplay` | Find primary pinned timer on stack |
| `useSecondaryTimers` | `runtime/hooks/useStackDisplay` | Find secondary timers |
| `useStackTimers` | `runtime/hooks/useStackDisplay` | All timer memory locations on stack |
| `useActiveControls` | `runtime/hooks/useStackDisplay` | Control buttons from block memory |
| `useStackDisplayRows` | `runtime/hooks/useStackDisplay` | Display rows for all stack blocks |
| `useDebugMode` | `components/layout/DebugModeContext` | Toggle debug UI (memory tiers, dialogs) |
| `usePanelSize` | `panels/panel-system/PanelSizeContext` | Responsive compact mode detection |
| `useWorkbenchSyncStore` | `components/layout/workbenchSyncStore` | Execution status, viewMode |
| `useSpatialNavigation` | `hooks/useSpatialNavigation` | TV remote / D-Pad focus management |
| `useUserOverrides` | `components/review-grid/useUserOverrides` | Pre-run metric override values |
| `useCollectionMetrics` | `hooks/useCollectionMetrics` | Historical metrics for wizard |

### 4.2 Services & Utilities

| Service | Role |
|---------|------|
| `audioService` | Sound effects (click, cues) via `useBrowserServices` |
| `metricPresentation` | Formats metric groups for display labels |
| `calculateDuration` | Computes elapsed from TimeSpan array + current time |
| `formatDurationSmart` | Human-friendly duration formatting |

### 4.3 Analytics Integration

- `ScriptRuntime.setAnalyticsEngine(engine)` attaches an `IAnalyticsEngine`
- `finalizeAnalytics()` called on workout stop/complete
- Projections sent to Chromecast via `ICastSubscription.sendAnalyticsSummary()`
- Session totals available in `WorkoutTracker` as `metrics['session-totals']`

---

## 5. Chromecast-Specific Technical Notes

### 5.1 Architecture

The Chromecast receiver does **not** run the real ScriptRuntime. Instead it runs `ChromecastProxyRuntime`, which:
- Receives RPC messages from the browser over a WebRTC DataChannel
- Maintains a read-only `ProxyStack` (blocks are `ProxyBlock` instances)
- Exposes the **same** `IScriptRuntime` interface so all hooks work identically

### 5.2 Rendering Differences

| Aspect | Browser | Chromecast Receiver |
|--------|---------|---------------------|
| Runtime | `ScriptRuntime` (full JIT + execution) | `ChromecastProxyRuntime` (read-only proxy) |
| Stack | Mutable `RuntimeStack` | `ProxyStack` (frozen, updated via RPC) |
| Clock | `RuntimeClock` with real spans | `ProxyClock` (wall clock only) |
| Event Bus | Full handler dispatch | `ProxyEventBus` (callback-only, events sent back to browser) |
| Block Lifecycle | Constructed by JIT compiler | `ProxyBlock` hydrated from `SerializedBlock` snapshots |
| Timer Updates | Memory subscriptions + rAF | Memory subscriptions + rAF using **sender clock** |

### 5.3 Message Passing

**Browser → Receiver:**
- `rpc-stack-update` — Full stack state (structural fingerprinting skips redundant sends)
- `rpc-output` — Completed segment outputs
- `rpc-tracker-update` — Metric / round updates
- `rpc-workbench-update` — Mode changes (idle → preview → active → review)
- `rpc-analytics-summary` — Final workout projections
- `rpc-clock-sync-result` — Calculated clock offset
- `rpc-audio` — Sound playback requests
- `rpc-dispose` — Session teardown

**Receiver → Browser:**
- `rpc-clock-sync-request` — Initial handshake
- `rpc-clock-sync-response` — Echo + receiver timestamp
- `rpc-event` — User events (next, stop, select-block) dispatched back for processing

### 5.4 Block Cache

`ChromecastProxyRuntime` maintains a `blockCache: Map<string, ProxyBlock>`.
- When a new stack snapshot arrives, existing `ProxyBlock`s are updated in-place via `.update(sb)`
- This preserves subscriber connections held by timer and metrics hooks
- Evicted blocks (no longer in snapshot) are removed from cache

### 5.5 Clock Synchronization

Receiver stores `clockOffsetMs` (positive = receiver ahead of sender).
Timer hooks on the receiver check `window.__chromecast_senderClockTimeMs()` to calculate elapsed time that matches the browser, preventing drift between sender and receiver displays.

### 5.6 Fingerprinting

`ChromecastRuntimeSubscription.computeFingerprint()` creates a structural hash of the stack snapshot that **excludes** accumulated timer elapsed values. This means:
- Timer ticks (every 20ms) do **not** trigger RPC sends
- Only structural changes (push/pop, label changes, completion, new metrics rows) trigger sends
- The receiver interpolates elapsed time locally from `SerializedTimeSpan` arrays

---

## 6. File Map

### Core Tracker

```
src/runtime/contracts/IRuntimeOptions.ts       — Tracker interface definitions
src/runtime/tracking/WorkoutTracker.ts         — Tracker implementation
src/runtime/hooks/useWorkoutTracker.ts         — React hook for tracker state
src/runtime/actions/tracking/TrackMetricAction.ts
src/runtime/actions/tracking/TrackRoundAction.ts
```

### UI Components

```
src/components/track/
  MetricTrackerCard.tsx
  VisualStateComponents.tsx
  BlockDebugDialog.tsx

src/components/workout/
  TrackViewShell.tsx
  TimerStackView.tsx
  WorkoutContextPanel.tsx
```

### Panels

```
src/panels/track-panel.tsx                     — Browser track view controller
src/panels/visual-state-panel.tsx              — Left panel (stack + lookahead)
src/panels/timer-panel.tsx                     — Right panel (timer + controls)
src/panels/timer-panel-chromecast.tsx          — Receiver timer adapter
src/panels/track-panel-chromecast.tsx          — Receiver stack adapter
```

### Runtime & Subscriptions

```
src/runtime/subscriptions/SubscriptionManager.ts
src/runtime/subscriptions/LocalRuntimeSubscription.ts
src/services/cast/rpc/ChromecastRuntimeSubscription.ts
src/services/cast/rpc/ChromecastProxyRuntime.ts
src/services/cast/rpc/RpcSerializer.ts
src/services/cast/rpc/RpcMessages.ts
```

### Context & Lifecycle

```
src/runtime/context/RuntimeContext.tsx
src/components/layout/RuntimeLifecycleProvider.tsx
src/components/workbench/useWorkbenchRuntime.ts
```

---

## 7. Acceptance Criteria Checklist

- [x] Every Tracker component identified and mapped (§1)
- [x] All TypeScript interfaces documented with field descriptions (§2)
- [x] Data flow described end-to-end (§3)
- [x] Chromecast technical constraints noted (§5)
- [x] Document linked in parent issue [WOD-614](/WOD/issues/WOD-614)
