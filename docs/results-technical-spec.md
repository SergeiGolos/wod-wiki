# Results Screen — Technical Specification

> **Issue:** [WOD-618](/WOD/issues/WOD-618) — Technical Track: Results Models, Analytics Pipeline & Data Structures  
> **Parent:** [WOD-617](/WOD/issues/WOD-617) — Results Redesign Discovery  
> **Status:** Documented  
> **Owner:** Developer (codebase inspection)

---

## 1. Panel Inventory & Component Tree

### 1.1 Top-Level Results Components

```
FullscreenReview              ← Primary results overlay (FocusedDialog)
├── CollectionWizard          ← Banner for uncollected metrics (pre/post-run)
├── AnalyticsScorecard        ← Projection cards grid (Session Summary)
├── ReviewGrid                ← Main data grid (Workout Log)
│   ├── GridToolbar           ← Preset switcher, search, filter toggle
│   ├── GridGraphPanel        ← Time-series graph for tagged columns
│   ├── GridHeader            ← Sortable column headers
│   ├── GridRow               ← Per-segment row render
│   └── UserOverrideDialog    ← Inline metric editing
├── DebugTraceViewer          ← Raw row dump (debug mode only)
└── ResultListItem            ← Compact result row (journal + wod-block)

ReceiverReviewPanel           ← Chromecast receiver review view
```

### 1.2 Component Hierarchy (Parent/Child)

| Parent | Child | Responsibility |
|--------|-------|----------------|
| `FullscreenReview` | `AnalyticsScorecard` | Renders `ProjectionResult[]` as score cards |
| `FullscreenReview` | `ReviewGrid` | Displays segment rows with pivoted metric columns |
| `FullscreenReview` | `CollectionWizard` | Collects hinted metrics missing from runtime |
| `ReviewGrid` | `GridToolbar` | Preset selection, search, filter toggle |
| `ReviewGrid` | `GridGraphPanel` | Renders time-series charts for tagged columns |
| `ReviewGrid` | `GridHeader` | Column headers with sort / graph / filter controls |
| `ReviewGrid` | `GridRow` | Individual segment row with cell rendering |
| `ReviewGrid` | `UserOverrideDialog` | Modal to input user-supplied metric values |
| `WorkbenchCastBridge` | `ReceiverReviewPanel` | Chromecast receiver renders review via RPC |

### 1.3 File Locations

| Component | Path |
|-----------|------|
| `FullscreenReview` | `src/components/Editor/overlays/FullscreenReview.tsx` |
| `AnalyticsScorecard` | `src/components/review/AnalyticsScorecard.tsx` |
| `ReviewGrid` | `src/components/review-grid/ReviewGrid.tsx` |
| `CollectionWizard` | `src/components/review/CollectionWizard.tsx` |
| `ResultListItem` | `src/components/results/ResultListItem.tsx` |
| `ReceiverReviewPanel` | `src/panels/review-panel-chromecast.tsx` |
| `GridToolbar` / `GridHeader` / `GridRow` / `GridGraphPanel` | `src/components/review-grid/` |

### 1.4 Results Display Path Decision Matrix

| Path | Component | Primary contract | Decision | Why |
|------|-----------|------------------|----------|-----|
| Workbench Review tab | `ReviewGrid` | `Segment[]` pivoted into rows/cells by `useGridData` | **Unify** | Already consolidated with `FullscreenReview` by [WOD-710](/WOD/issues/WOD-710). |
| FullscreenReview overlay | `ReviewGrid` | Same `Segment[]` contract as the workbench tab | **Unify** | Same grid, same row/column contract, just different shell chrome. |
| Inline editor widget | `wodResultsWidget` | `WorkoutResult[]` rendered as compact inline result rows | **Keep separate** | CM6 widget decorations cannot host the grid's sort/filter/column UI without breaking the inline document flow. |
| Chromecast receiver | `ReceiverReviewPanel` | `reviewData.rows` + `analyticsSummary.projections` summary payload | **Keep separate** | TV receiver needs large-card, D-pad-friendly presentation; this is an explicit exception confirmed by [WOD-709](/WOD/issues/WOD-709). |

**Shared summary contract:**

- `totalDurationMs` and `completedSegments` are the common session-level totals.
- `rows: Array<{ label: string; value: string }>` is the fallback textual summary for compact / receiver views.
- `projections: Array<{ name: string; value: number; unit: string; metricType?: string }>` carries the richer analytics cards used by Chromecast.
- The grid path keeps its richer row/column model (`Segment[]` → `GridRow[]`) because it owns sorting, filtering, and user overrides.

---

## 2. TypeScript Interfaces / Models

### 2.1 Core Output Model — `IOutputStatement`

The atomic unit of workout execution output. Created by the runtime when a block unmounts.

**File:** `src/core/models/OutputStatement.ts`

```typescript
interface IOutputStatement extends ICodeStatement, IMetricSource {
  readonly id: number;
  readonly outputType: OutputStatementType;   // 'segment' | 'milestone' | 'completion' | ...
  readonly timeSpan: TimeSpan;                // Wall-clock start/end
  readonly spans: ReadonlyArray<TimeSpan>;    // Raw timer spans (deprecated proxy)
  readonly elapsed: number;                   // Pause-aware active ms (deprecated proxy)
  readonly total: number;                     // Wall-clock bracket ms (deprecated proxy)
  readonly sourceStatementId?: number;         // Parser statement ID (= line number)
  readonly sourceBlockKey: string;            // Block that produced this output
  readonly stackLevel: number;               // Stack depth at emission
  readonly metrics: MetricContainer;         // Canonical metric data
  readonly metricMeta: Map<IMetric, CodeMetadata>;
  readonly completionReason?: string;         // 'user-advance' | 'forced-pop' | 'timer-expired' | ...
  readonly parent?: number;                   // Parent output ID (hierarchy)
  readonly children: number[][];             // Child output groups
  readonly hints?: Set<string>;              // Tag hints for filtering
}
```

**OutputStatementType union:**
```typescript
type OutputStatementType =
  | 'segment'      // Timed execution portion (round, effort interval)
  | 'milestone'    // Notable event (halfway, PR)
  | 'completion'   // Workout completion
  | 'metric'       // Raw metric emission
  | 'system'       // Debug/diagnostic lifecycle output
  | 'event'        // External/internal trigger
  | 'group'        // Identified segment with children
  | 'load'         // Initial script state
  | 'compiler'     // Behavior configuration
  | 'analytics';   // Analytics engine summary output
```

### 2.2 Persistence Model — `StoredOutputStatement`

Plain-data snapshot safe for IndexedDB / JSON round-trips. Excludes class methods, `Set`, `Map`, and `MetricContainer` instances.

**File:** `src/components/Editor/types/index.ts`

```typescript
interface StoredOutputStatement {
  readonly id: number;
  readonly outputType: OutputStatementType;
  readonly timeSpan: { started: number; ended?: number };
  readonly spans: ReadonlyArray<{ started: number; ended?: number }>;
  readonly elapsed: number;        // Pre-computed for serialization
  readonly total: number;          // Pre-computed for serialization
  readonly metrics: IMetric[];     // Flat array (MetricContainer → array)
  readonly hints?: string[];       // Set → string[]
  readonly sourceBlockKey: string;
  readonly stackLevel: number;
  readonly parent?: number;
  readonly sourceStatementId?: number;
  readonly completionReason?: string;
}
```

### 2.3 Workout Result Container — `WorkoutResults`

**File:** `src/components/Editor/types/index.ts`

```typescript
interface WorkoutResults {
  startTime: number;              // Workout start (epoch ms)
  endTime: number;                // Workout end (epoch ms)
  duration: number;               // Total elapsed time (ms)
  roundsCompleted?: number;
  totalRounds?: number;
  repsCompleted?: number;
  logs?: StoredOutputStatement[]; // Canonical output log
  completed: boolean;             // True = finished; false = stopped early
}
```

### 2.4 IndexedDB Storage Model — `WorkoutResult`

**File:** `src/types/storage.ts`

```typescript
interface WorkoutResult {
  id: string;                     // UUID
  segmentId?: string;             // Link to NoteSegment
  segmentVersion?: number;
  noteId: string;                 // Parent Note UUID
  sectionId?: string;             // Legacy section link
  data: WorkoutResults;           // The actual results data
  completedAt: number;            // Finish timestamp
}
```

### 2.5 Analytics Segment Model — `Segment`

UI-ready time-series segment produced by `AnalyticsTransformer`.

**File:** `src/core/models/AnalyticsModels.ts`

```typescript
interface Segment {
  id: number;
  name: string;                   // Label (effort name or block key)
  type: string;                   // Metric type or output type
  startTime: number;              // Session-relative seconds
  endTime: number;                // Session-relative seconds
  absoluteStartTime?: number;     // Wall-clock epoch ms
  duration?: number;              // Parser intent (seconds)
  elapsed: number;                // Pause-aware active time (seconds)
  total: number;                  // Wall-clock bracket (seconds)
  parentId: number | null;
  depth: number;                  // Stack depth
  metric: Record<string, number>; // Dynamic metrics map
  lane: number;                   // Visual lane (equals depth)
  spans?: { started: number; ended?: number }[];
  metrics?: MetricContainer;      // Runtime metric container
}
```

### 2.6 Analytics Projection Result — `ProjectionResult`

Summary metric produced by analytics engines (e.g., Total Reps, Volume, TIS).

**File:** `src/timeline/analytics/analytics/ProjectionResult.ts`

```typescript
interface ProjectionResult {
  name: string;                   // "Total Reps", "Training Intensity Score"
  value: number;
  unit: string;                   // "reps", "kg", "MET-min", "pts"
  metricType?: MetricType | string;
  timeSpan: TimeSpan;
  origin?: MetricOrigin;          // 'analyzed' | 'analyzed-estimated' | ...
  metadata?: Record<string, any>;
}
```

### 2.7 Review Grid Data Model

**File:** `src/components/review-grid/types.ts`

```typescript
interface GridRow {
  id: number;
  index: number;                  // 1-based display order
  sourceBlockKey: string;
  sourceStatementId?: number;
  outputType: OutputStatementType;
  stackLevel: number;
  absoluteStartTime?: number;
  duration?: number;
  elapsed: number;                // Seconds
  total: number;                  // Seconds
  spans: { started: number; ended?: number }[];
  completionReason?: string;
  cells: Map<MetricType, GridCell>;
}

interface GridCell {
  metrics: MetricContainer;
  hasUserOverride: boolean;
}

interface GridColumn {
  id: string;
  type?: MetricType;
  label: string;
  sortable: boolean;
  filterable: boolean;
  graphable: boolean;
  isGraphed: boolean;
  visible: boolean;
}
```

### 2.8 Chromecast RPC Models

**File:** `src/services/cast/rpc/RpcMessages.ts`

```typescript
interface RpcWorkbenchUpdate {
  type: 'rpc-workbench-update';
  mode: 'idle' | 'preview' | 'active' | 'review';
  previewData?: { title: string; blocks: RpcBlockPreview[] };
  reviewData?: { totalDurationMs: number; completedSegments: number; rows: RpcReviewRow[] };
}

interface RpcAnalyticsSummary {
  type: 'rpc-analytics-summary';
  totalDurationMs: number;
  completedSegments: number;
  projections: RpcProjectionResult[];
}

interface RpcProjectionResult {
  name: string;
  value: number;
  unit: string;
  metricType?: string;
  icon?: string;
  color?: string;
}
```

---

## 3. Data Flow: Workout → Analytics → Results

### 3.1 End-to-End Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKOUT COMPLETION                               │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
│  ScriptRuntime  │────▶│  OutputEmitter  │────▶│  IAnalyticsEngine           │
│  (execution)    │     │  (buffer +      │     │  • Realtime processors      │
│                 │     │   notify)       │     │  • Summary processors       │
└─────────────────┘     └─────────────────┘     └─────────────────────────────┘
        │                                               │
        │                                               ▼
        │                                       ┌─────────────┐
        │                                       │ Projection  │
        │                                       │ Results[]   │
        │                                       └─────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYTICS TRANSFORMER                               │
│  getAnalyticsFromRuntime()  OR  getAnalyticsFromLogs()                      │
│                                                                             │
│  Input:  IOutputStatement[]  →  Filter ('segment' | 'analytics' |          │
│                                'milestone')                                 │
│  Output: { segments: SegmentWithMetadata[], groups: AnalyticsGroup[] }      │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZUSTAND WORKBENCH SYNC STORE                        │
│  useWorkbenchSyncStore.setAnalytics(segments, groups)                       │
│                                                                             │
│  • analyticsSegments  →  ReviewGrid, AnalyticsScorecard, FullscreenReview   │
│  • analyticsGroups    →  GridGraphPanel (future)                            │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RESULTS UI RENDERING                             │
│                                                                             │
│  FullscreenReview                                                           │
│    ├── AnalyticsScorecard  ← projections extracted from analytics segments  │
│    ├── ReviewGrid          ← segments pivoted into rows/cells via useGridData│
│    └── CollectionWizard    ← hinted metrics from segments or script         │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE (IndexedDB)                             │
│                                                                             │
│  WorkbenchContext.completeWorkout()                                         │
│    → notePersistence.mutateNote() with workoutResult + analyticsSegments    │
│    → Saves WorkoutResult to `results` store                                 │
│    → Denormalizes AnalyticsDataPoint[] to `analytics` store (future trends) │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Detailed Pipeline Stages

#### Stage 1: Runtime Emission
- **Where:** `OutputEmitter.emitSegmentFromResultMemory()` (called on block pop)
- **What:** Creates `OutputStatement` from block's `metric:result` memory locations
- **Key fields:** `outputType='segment'`, `metrics`, `timeSpan`, `sourceBlockKey`, `stackLevel`

#### Stage 2: Analytics Enrichment
- **Where:** `OutputEmitter.add()` → `AnalyticsEngine.run()`
- **What:** Realtime processors enrich per-segment metrics; summary processors accumulate projections
- **Realtime processors:** `PaceEnrichmentProcess`, `PowerEnrichmentProcess`, `TwoPassEffortResolutionProcess`
- **Summary processors:** `RepProjectionEngine`, `DistanceProjectionEngine`, `VolumeProjectionEngine`, `SessionLoadProjectionEngine`, `MetMinuteProjectionEngine`, `TISProcessor`

#### Stage 3: Analytics Finalization
- **Where:** `OutputEmitter.finalizeAnalytics()` → `AnalyticsEngine.finalize()`
- **What:** Runs all summary processors over accumulated output history; creates `outputType='analytics'` statements
- **Result:** `ProjectionResult[]` converted to `OutputStatement[]` with `MetricType.Label` + value metric

#### Stage 4: Transformation
- **Where:** `AnalyticsTransformer.fromOutputStatements()`
- **What:** Converts `IOutputStatement[]` → `SegmentWithMetadata[]`
- **Conversions:** ms → seconds, session-relative timing, metric extraction, context preservation

#### Stage 5: Grid Data Preparation
- **Where:** `useGridData()` hook
- **What:** Segments → `GridRow[]`; metrics pivoted into `Map<MetricType, GridCell>`
- **Features:** Preset filtering, column visibility, user override merging, volume derivation, sorting

---

## 4. External Dependencies

### 4.1 Hooks & Contexts Consumed by Results Screen

| Hook/Context | Purpose | File |
|-------------|---------|------|
| `useWorkbenchSyncStore` | Zustand store: analyticsSegments, analyticsGroups, userOutputOverrides, gridViewPreset | `src/components/layout/workbenchSyncStore.ts` |
| `useWorkbench` | WorkbenchContext: notePersistence, currentEntry, completeWorkout | `src/components/layout/WorkbenchContext.tsx` |
| `useDebugMode` | DebugModeContext: toggles debug preset in ReviewGrid | `src/components/layout/DebugModeContext.tsx` |
| `useUserOverrides` | User override store: get/set metric overrides keyed by blockKey | `src/components/review-grid/useUserOverrides.ts` |
| `useCollectionMetrics` | Identifies hinted metrics needing user input | `src/hooks/useCollectionMetrics.ts` |
| `useGridData` | Transforms Segment[] → GridRow[] / GridColumn[] | `src/components/review-grid/useGridData.ts` |
| `useOutputStatements` | Subscribes to runtime output statements | `src/runtime/hooks/useOutputStatements.ts` |

### 4.2 Analytics Context & Services

| Service | Purpose | File |
|---------|---------|------|
| `AnalyticsContext` | Injected services for processors (effortResolver) | `src/core/analytics/AnalyticsContext.ts` |
| `createAnalyticsEngineForBlock()` | Builds engine with dialect-filtered processors | `src/core/analytics/createAnalyticsEngineForBlock.ts` |
| `StandardAnalyticsProfile` | Registers all default realtime + summary processors | `src/core/analytics/StandardAnalyticsProfile.ts` |
| `AnalyticsTransformer` | Transforms outputs → UI-ready segments/groups | `src/services/AnalyticsTransformer.ts` |

### 4.3 Persistence Layer

| Service | Purpose | File |
|---------|---------|------|
| `INotePersistence` | Seam for note CRUD + result selection | `src/services/persistence/types.ts` |
| `IndexedDBNotePersistence` | V4 IndexedDB implementation | `src/services/persistence/IndexedDBNotePersistence.ts` |
| `normalizeAnalyticsSegments()` | Converts segment inputs → `AnalyticsDataPoint[]` for trends | `src/services/persistence/IndexedDBNotePersistence.ts` |

### 4.4 Visualization Libraries

The Results screen uses **Tailwind CSS** for layout and **Lucide React** for icons. There is no external charting library currently in use; the `GridGraphPanel` is reserved for Phase 3. Metric colors are mapped via `src/views/runtime/metricColorMap.ts`.

### 4.5 Export/Sharing Integrations

| Service | Purpose | File |
|---------|---------|------|
| `exportNote()` / `exportAllNotes()` | ZIP export of notes + results | `src/services/ExportImportService.ts` |
| `importFromZip()` | Import notes with results | `src/services/ExportImportService.ts` |

---

## 5. Chromecast-Specific Technical Notes

### 5.1 Architecture Overview

The Chromecast receiver runs a **proxy runtime** that does not execute workout logic locally. Instead, it consumes RPC messages from the browser over a WebRTC DataChannel and mirrors the workbench display state.

```
Browser (Sender)                          Chromecast (Receiver)
─────────────────                         ─────────────────────
ScriptRuntime  ──RPC──▶  ChromecastProxyRuntime  ←  IScriptRuntime impl
  │                                              │
  ▼                                              ▼
OutputEmitter  ──RPC──▶  ProxyStack + ProxyEventBus
  │                                              │
  ▼                                              ▼
AnalyticsEngine ──RPC──▶  WorkbenchDisplayState
  │                                              │
  ▼                                              ▼
WorkbenchCastBridge  ──rpc-workbench-update──▶  ReceiverReviewPanel
```

### 5.2 Results Rendering Differences

| Aspect | Standard React Render | Chromecast Render |
|--------|----------------------|-------------------|
| **Runtime** | Real `ScriptRuntime` | `ChromecastProxyRuntime` (stub) |
| **Stack** | Live `RuntimeStack` | `ProxyStack` — read-only, updated via RPC |
| **Clock** | `IRuntimeClock` with pause support | `ProxyClock` — returns `new Date()` |
| **Analytics** | Computed locally in browser | Received as pre-computed `RpcAnalyticsSummary` |
| **Grid** | Full `ReviewGrid` with interactivity | Simplified `ReceiverReviewPanel` with cards |
| **User Overrides** | Editable via `UserOverrideDialog` | Not supported on receiver |

### 5.3 RPC Message Types for Results

| Message | Direction | Purpose |
|---------|-----------|---------|
| `rpc-workbench-update` | Browser → Receiver | Switches receiver mode: `idle` / `preview` / `active` / `review` |
| `rpc-analytics-summary` | Browser → Receiver | Sends projection results + totals for review panel |
| `rpc-output` | Browser → Receiver | Individual output statements (for proxy output log) |
| `rpc-stack-update` | Browser → Receiver | Stack push/pop/clear events |
| `rpc-event` | Receiver → Browser | D-Pad "next" or "select-block" events |

### 5.4 Summary vs. Detail Data Payload

**Browser → Receiver (review mode):**
- `RpcWorkbenchUpdate.reviewData`: Simple key-value rows (`{ label, value }[]`) — fallback
- `RpcAnalyticsSummary`: Rich projection data with `name`, `value`, `unit`, `metricType`, `icon`, `color`

**Receiver rendering priority:**
1. If `analyticsSummary.projections.length > 0` → render projection grid
2. Else → render `reviewData.rows` as simple list

### 5.5 Clock Synchronization

The receiver interpolates elapsed time locally using timer spans from serialized block state. A clock-sync handshake on connection calculates offset (`receiverTimestamp - requestTimestamp - RTT/2`) so receiver timers match the sender.

---

## 6. Analytics Pipeline: Processor Reference

### 6.1 Realtime Processors (per-segment)

| Processor | ID | Required Metrics | Output |
|-----------|----|-----------------|--------|
| `TwoPassEffortResolutionProcess` | `two-pass-effort` | — | Attaches `ResolvedEffortData` to effort metrics |
| `PaceEnrichmentProcess` | `pace-enrichment` | Distance + Elapsed | Adds pace metric (distance / time) |
| `PowerEnrichmentProcess` | `power-enrichment` | — | Adds power metric where applicable |

### 6.2 Summary Processors (multi-segment)

| Processor | ID | Required Metrics | Output Projection |
|-----------|----|-----------------|-------------------|
| `RepProjectionEngine` | `rep-projection` | `Rep` | Total Reps (sum) |
| `DistanceProjectionEngine` | `distance-projection` | `Distance` | Total Distance (sum) |
| `VolumeProjectionEngine` | `volume-projection` | `Rep` + `Resistance` | Total Volume (reps × weight) |
| `SessionLoadProjectionEngine` | `session-load-projection` | `Elapsed` | Training Load AU (sRPE × duration) |
| `MetMinuteProjectionEngine` | `met-minute-projection` | `Action` | Energy MET-min (Σ METs × time) |
| `TISProcessor` | `tis-projection` | `Action` | Training Intensity Score (composite) |

### 6.3 Processor Applicability Filtering

`StandardAnalyticsProfile.build()` filters processors by:
1. **Dialect** — processor `dialects` must include block dialect (`wod`, `log`, `plan`)
2. **Required Metrics** — ALL `requiredMetrics` must exist in the parsed script's metric types

---

## 7. State Management Summary

### 7.1 Zustand Store (`workbenchSyncStore`)

| State Slice | Set By | Consumed By |
|------------|--------|-------------|
| `analyticsSegments` | `setAnalytics()` after workout | `FullscreenReview`, `ReviewGrid`, `AnalyticsScorecard`, `WorkbenchCastBridge` |
| `analyticsGroups` | `setAnalytics()` after workout | `GridGraphPanel` (future) |
| `userOutputOverrides` | `setUserOverride()` via dialog | `useGridData` → merged into cell metrics |
| `gridViewPreset` | `setGridViewPreset()` | `useGridData` → column visibility |
| `selectedAnalyticsIds` | `toggleAnalyticsSegment()` | `ReviewGrid` row selection |
| `castTransport` | `setCastTransport()` | `WorkbenchCastBridge`, `EditorCastBridge` |

### 7.2 React Context (`WorkbenchContext`)

| State | Set By | Consumed By |
|-------|--------|-------------|
| `currentEntry` | Loaded from `notePersistence.getNote()` | `useWodBlockResults`, inline results |
| `results` | `completeWorkout()` | Local result history |

---

## 8. Key Files Index

### Models & Types
- `src/core/models/OutputStatement.ts` — `IOutputStatement`, `OutputStatement`
- `src/core/models/AnalyticsModels.ts` — `Segment`, `AnalyticsGroup`, `AnalyticsGraphConfig`
- `src/timeline/analytics/analytics/ProjectionResult.ts` — `ProjectionResult`
- `src/components/Editor/types/index.ts` — `StoredOutputStatement`, `WorkoutResults`, `WodBlock`
- `src/types/storage.ts` — `WorkoutResult`, `AnalyticsDataPoint`, `WodWikiSchema`
- `src/components/review-grid/types.ts` — `GridRow`, `GridCell`, `GridColumn`

### Analytics Pipeline
- `src/runtime/OutputEmitter.ts` — Output buffering, analytics enrichment, emission helpers
- `src/core/analytics/AnalyticsEngine.ts` — Processor orchestration
- `src/core/analytics/StandardAnalyticsProfile.ts` — Processor registration & filtering
- `src/core/analytics/createAnalyticsEngineForBlock.ts` — Engine factory
- `src/services/AnalyticsTransformer.ts` — `IOutputStatement[]` → `Segment[]`

### Results UI
- `src/components/Editor/overlays/FullscreenReview.tsx` — Main results overlay
- `src/components/review/AnalyticsScorecard.tsx` — Projection cards
- `src/components/review-grid/ReviewGrid.tsx` — Data grid
- `src/components/review/CollectionWizard.tsx` — Metric collection banner
- `src/components/results/ResultListItem.tsx` — Compact result row

### Data Hooks
- `src/components/Editor/hooks/useWodBlockResults.ts` — Load results for a WOD section
- `src/components/Editor/hooks/useWodLineResults.ts` — Per-line execution history
- `src/runtime/hooks/useOutputStatements.ts` — Subscribe to runtime outputs
- `src/hooks/useCollectionMetrics.ts` — Find hinted metrics
- `src/components/review-grid/useGridData.ts` — Grid row/column transformation

### Chromecast
- `src/services/cast/rpc/ChromecastProxyRuntime.ts` — Receiver proxy runtime
- `src/services/cast/rpc/RpcMessages.ts` — All RPC message types
- `src/panels/review-panel-chromecast.tsx` — Receiver review panel
- `src/components/cast/WorkbenchCastBridge.tsx` — Browser → receiver bridge
- `src/app/cast/workbenchProjection.ts` — Build review/preview projections
- `src/app/cast/workbenchModeResolver.ts` — Mode resolution logic

### Persistence
- `src/services/persistence/IndexedDBNotePersistence.ts` — Note + result CRUD
- `src/services/persistence/types.ts` — `INotePersistence`, `ResultSelection`

---

*Document generated by codebase inspection. Linked to parent discovery issue [WOD-617](/WOD/issues/WOD-617).*
