# Unified Visualization System Deep Dive

This document provides an in-depth analysis of how different data types (CodeStatements, RuntimeMetrics, ExecutionSpans, RuntimeBlocks) are currently bound to UI components in WOD Wiki, and presents a roadmap for creating a unified visualization component set that allows consistent display across all contexts.

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Data Types Overview](#current-data-types-overview)
3. [Current UI Components](#current-ui-components)
4. [Data Flow Analysis](#data-flow-analysis)
5. [Component Binding Patterns](#component-binding-patterns)
6. [Unified Visualization Architecture](#unified-visualization-architecture)
7. [Implementation Guide](#implementation-guide)

---

## Problem Statement

The WOD Wiki application currently has three main contexts where workout data needs to be visualized:

1. **Parser View (Edit Mode)**: Displays parsed `CodeStatement` objects with their fragments
2. **Active Execution (Track Mode)**: Shows active runtime blocks and their metrics in real-time
3. **History/Analytics (Analyze Mode)**: Displays completed execution records and metrics for comparison

Each context currently uses different components with varying implementations, leading to:
- Inconsistent visual presentation
- Duplicated rendering logic
- Difficulty in comparing data across contexts
- Maintenance overhead when updating visualization styles

**Goal**: Create a unified visualization component set that can represent:
- Code statements (parsed workout definitions)
- Runtime block metrics (active execution state)
- Execution history records (completed blocks with collected metrics)

All displayed in a visually consistent way regardless of the source data type.

---

## Current Data Types Overview

### 1. ICodeStatement (Parser Output)

```typescript
// src/core/models/CodeStatement.ts
interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[][];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
  hints?: Set<string>;
}
```

**Source**: Chevrotain parser output from `src/parser/`
**Usage**: Represents parsed workout script lines
**Key Property**: `fragments: ICodeFragment[]` - contains the visual/semantic data

### 2. ICodeFragment (Visual Unit)

```typescript
// src/core/models/CodeFragment.ts
interface ICodeFragment {
  readonly image?: string;       // Display text
  readonly value?: any;          // Parsed value
  readonly type: string;         // Fragment type string
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
}

enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}
```

**Purpose**: The fundamental visual unit - represents a single piece of workout information
**Usage**: Used by `FragmentVisualizer` to render color-coded tags

### 3. RuntimeMetric (Execution Metrics)

```typescript
// src/runtime/RuntimeMetric.ts
interface RuntimeMetric {
  exerciseId: string;
  values: MetricValue[];
  timeSpans: TimeSpan[];
}

type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" | "time" | "calories" | "action" | "effort" | "heart_rate" | "cadence" | "power";
  value: number | undefined;
  unit: string;
};
```

**Source**: Generated during runtime execution
**Usage**: Tracks performance data for blocks

### 4. ExecutionSpan (Unified Execution Model)

```typescript
// src/runtime/models/ExecutionSpan.ts
interface ExecutionSpan {
  id: string;
  blockId: string;
  parentSpanId: string | null;
  type: SpanType;  // 'timer' | 'rounds' | 'effort' | 'group' | 'interval' | 'emom' | 'amrap' | 'tabata'
  label: string;
  status: SpanStatus;  // 'active' | 'completed' | 'failed' | 'skipped'
  startTime: number;
  endTime?: number;
  metrics: SpanMetrics;
  segments: TimeSegment[];
  sourceIds?: number[];
  debugMetadata?: DebugMetadata;
}

interface SpanMetrics {
  exerciseId?: string;
  reps?: MetricValueWithTimestamp<number>;
  weight?: MetricValueWithTimestamp<number>;
  distance?: MetricValueWithTimestamp<number>;
  duration?: MetricValueWithTimestamp<number>;
  currentRound?: number;
  totalRounds?: number;
  repScheme?: number[];
  // ... more metrics
}
```

**Source**: Created when blocks execute
**Usage**: Unified model for tracking execution history and current state

### 5. IRuntimeBlock (Execution Unit)

```typescript
// src/runtime/IRuntimeBlock.ts
interface IRuntimeBlock {
  readonly key: BlockKey;
  readonly sourceIds: number[];
  readonly blockType?: string;
  readonly label: string;
  readonly compiledMetrics?: RuntimeMetric;
  readonly context: IBlockContext;
  // ... lifecycle methods
}
```

**Source**: JIT compiled from statements
**Usage**: Active execution unit on the runtime stack

---

## Current UI Components

### 1. FragmentVisualizer (Core Visual Unit)

**Location**: `src/views/runtime/FragmentVisualizer.tsx`

**Purpose**: Renders an array of `ICodeFragment` objects as color-coded tags

**Input**: `fragments: ICodeFragment[]`

**Visual Output**: Horizontal row of colored tags with icons

```tsx
<FragmentVisualizer fragments={statement.fragments} />
// Renders: [⏱️ 5:00] [×10] [🏃 Pushups] [💪 95lb]
```

**Color Map**: `src/views/runtime/fragmentColorMap.ts`
- Timer: Blue
- Rep: Green
- Effort: Yellow
- Distance: Teal
- Rounds: Purple
- Action: Pink
- Increment: Indigo
- Lap: Orange
- Text: Gray
- Resistance: Red

### 2. WodScriptVisualizer (Statement List)

**Location**: `src/components/WodScriptVisualizer.tsx`

**Purpose**: Renders a list of `ICodeStatement` objects with hierarchy and grouping

**Input**: 
```typescript
interface WodScriptVisualizerProps {
  statements: ICodeStatement[];
  activeStatementIds?: Set<number>;
  selectedStatementId?: number | null;
  onSelectionChange?: (id: number | null) => void;
  onHover?: (id: number | null) => void;
  onRenderActions?: (statement: ICodeStatement) => React.ReactNode;
}
```

**Features**:
- Groups linked statements (+ prefix)
- Calculates and applies indentation
- Highlights active/selected states
- Uses `FragmentVisualizer` for each statement

### 3. StatementDisplay & BlockDisplay

**Location**: `src/components/fragments/StatementDisplay.tsx`

**Purpose**: Unified wrapper components for statements and blocks

```tsx
// For code statements
<StatementDisplay 
  statement={stmt}
  isActive={isActive}
  isGrouped={isGrouped}
  compact={compact}
  actions={actions}
/>

// For runtime blocks
<BlockDisplay
  label={block.label}
  blockType={block.blockType}
  metrics={metrics}
  status={status}
  depth={depth}
  isActive={isActive}
/>
```

### 4. HistoryRow & HistoryList

**Location**: `src/components/history/`

**Purpose**: Renders execution history items

**Input**:
```typescript
interface HistoryItem {
  id: string;
  label: string;
  startTime: number;
  endTime?: number;
  type: string;
  depth: number;
  fragments: ICodeFragment[];
  isHeader: boolean;
  status: 'active' | 'completed' | 'failed' | 'skipped';
}
```

**Note**: Converts `SpanMetrics` to `ICodeFragment[]` via `spanMetricsToFragments()`

### 5. MetricsTreeView

**Location**: `src/components/metrics/MetricsTreeView.tsx`

**Purpose**: Tree visualization with connecting lines

**Input**:
```typescript
interface MetricItem {
  id: string;
  parentId: string | null;
  lane: number;
  title: string;
  icon?: React.ReactNode;
  tags?: React.ReactNode;
  footer?: React.ReactNode;
  status?: 'active' | 'completed' | 'pending';
  startTime?: number;
  isHeading?: boolean;
}
```

---

## Data Flow Analysis

### Parser View Flow

```
WodScript Text
    ↓ (Lexer + Parser)
ICodeStatement[]
    ↓ (WodScriptVisualizer)
For each statement:
    ↓ (FragmentVisualizer)
[Colored Fragment Tags]
```

### Runtime Execution Flow

```
ICodeStatement[]
    ↓ (JitCompiler)
IRuntimeBlock
    ↓ (Push to Stack)
Block.mount() → Creates ExecutionSpan
    ↓ (Behaviors update SpanMetrics)
SpanMetrics updated in memory
    ↓ (RuntimeHistoryLog subscribes)
spanMetricsToFragments(metrics)
    ↓ (HistoryRow)
[Colored Fragment Tags]
```

### History/Analytics Flow

```
ScriptRuntime.executionLog (ExecutionSpan[])
    ↓ (RuntimeHistoryLog)
Convert to HistoryItem[]
    ↓ (HistoryList → HistoryRow)
    ↓ (FragmentVisualizer)
[Colored Fragment Tags]
```

---

## Component Binding Patterns

### Pattern 1: Direct Fragment Binding

**Used by**: ParsedView, WodScriptVisualizer

```typescript
// Data already has fragments
const statement: ICodeStatement = {
  fragments: [...ICodeFragment[]]
};

<FragmentVisualizer fragments={statement.fragments} />
```

### Pattern 2: Metrics-to-Fragments Conversion

**Used by**: RuntimeHistoryLog, HistoryRow

```typescript
// Convert metrics to fragments
import { spanMetricsToFragments } from '@/runtime/utils/metricsToFragments';

const fragments = spanMetricsToFragments(span.metrics, span.label, span.type);

<FragmentVisualizer fragments={fragments} />
```

### Pattern 3: Custom Item Rendering

**Used by**: MetricsTreeView, AnalyticsHistoryPanel

```typescript
// Custom rendering with renderItem callback
const items: MetricItem[] = segments.map(seg => ({
  id: seg.id.toString(),
  title: seg.name,
  tags: <CustomTagsComponent />,  // Manual fragment rendering
  // ...
}));

<MetricsTreeView items={items} renderItem={customRenderer} />
```

---

## Unified Visualization Architecture

### Core Principle: Fragment-First Design

All data types should ultimately be represented as `ICodeFragment[]` for visualization. This ensures:

1. **Consistent Colors**: Same fragment type = same color everywhere
2. **Consistent Icons**: Same fragment type = same icon everywhere
3. **Single Point of Customization**: Update `fragmentColorMap.ts` to change all views

### Proposed Unified Data Model

```typescript
// src/core/models/UnifiedDisplayItem.ts

/**
 * Unified display item that can represent any workout data
 * regardless of its original source (parsed, active, historical)
 */
export interface IDisplayItem {
  // Identity
  id: string;
  parentId: string | null;
  
  // Visual Content (THE KEY: everything becomes fragments)
  fragments: ICodeFragment[];
  
  // Layout
  depth: number;           // Nesting level for indentation
  isHeader: boolean;       // Header vs content row styling
  
  // State
  status: DisplayStatus;   // 'pending' | 'active' | 'completed' | 'failed'
  
  // Metadata (for tooltips, debugging)
  sourceType: 'statement' | 'block' | 'span' | 'record';
  sourceId: number | string;
  
  // Optional timing
  timestamp?: number;
  duration?: number;
}

export type DisplayStatus = 'pending' | 'active' | 'completed' | 'failed';
```

### Proposed Unified Components

#### 1. `UnifiedItemRow` - Single Item Display

```typescript
interface UnifiedItemRowProps {
  item: IDisplayItem;
  isSelected?: boolean;
  isHighlighted?: boolean;
  compact?: boolean;
  showTimestamp?: boolean;
  showDuration?: boolean;
  actions?: React.ReactNode;
  onClick?: () => void;
}
```

#### 2. `UnifiedItemList` - List of Items

```typescript
interface UnifiedItemListProps {
  items: IDisplayItem[];
  activeItemId?: string;
  selectedIds?: Set<string>;
  groupLinkedItems?: boolean;  // For parser view grouping
  showConnectors?: boolean;    // For tree view lines
  autoScroll?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}
```

#### 3. Adapter Functions

```typescript
// Convert CodeStatement to IDisplayItem
function statementToDisplayItem(
  statement: ICodeStatement,
  allStatements: Map<number, ICodeStatement>,
  status?: DisplayStatus
): IDisplayItem;

// Convert ExecutionSpan to IDisplayItem
function spanToDisplayItem(
  span: ExecutionSpan,
  allSpans: Map<string, ExecutionSpan>
): IDisplayItem;

// Convert IRuntimeBlock to IDisplayItem (for active stack)
function blockToDisplayItem(
  block: IRuntimeBlock,
  stackIndex: number,
  runtime: IScriptRuntime
): IDisplayItem;
```

---

## Implementation Guide

### Phase 1: Create Unified Data Model (Low Risk)

**Files to Create**:
- `src/core/models/DisplayItem.ts` - Interface and type definitions

**Steps**:
1. Define `IDisplayItem` interface
2. Add `DisplayStatus` type
3. Export from core module index

### Phase 2: Create Adapter Functions (Low Risk)

**Files to Create**:
- `src/core/adapters/displayItemAdapters.ts`

**Steps**:
1. Implement `statementToDisplayItem()` - wraps existing statement fragments
2. Implement `spanToDisplayItem()` - uses existing `spanMetricsToFragments()`
3. Implement `blockToDisplayItem()` - extracts fragments from block metrics
4. Add tests for adapters

### Phase 3: Create Unified Components (Medium Risk)

**Files to Create**:
- `src/components/unified/UnifiedItemRow.tsx`
- `src/components/unified/UnifiedItemList.tsx`
- `src/components/unified/index.ts`

**Steps**:
1. Create `UnifiedItemRow` based on existing `HistoryRow` patterns
2. Create `UnifiedItemList` with support for:
   - Grouping (from WodScriptVisualizer)
   - Tree connectors (from MetricsTreeView)
   - Auto-scroll (from HistoryList)
3. Ensure existing `FragmentVisualizer` is reused
4. Create Storybook stories for testing

### Phase 4: Migrate Existing Views (Higher Risk)

**Files to Update** (one at a time):
1. `src/components/history/RuntimeHistoryLog.tsx` → Use UnifiedItemList
2. `src/components/WodScriptVisualizer.tsx` → Use UnifiedItemList
3. `src/components/workout/AnalyticsHistoryPanel.tsx` → Use UnifiedItemList

**Migration Strategy**:
1. Update one component at a time
2. Run Storybook visual regression tests
3. Ensure no breaking changes to existing props/API

### Phase 5: Documentation and Cleanup

**Files to Create/Update**:
- `docs/unified-visualization-guide.md` - Usage guide for new components
- Update component Storybook stories
- Add migration notes for deprecated patterns

---

## Code Changes Summary

### New Files Required

```
src/
├── core/
│   ├── models/
│   │   └── DisplayItem.ts        # IDisplayItem interface
│   └── adapters/
│       └── displayItemAdapters.ts # Conversion functions
└── components/
    └── unified/
        ├── index.ts
        ├── UnifiedItemRow.tsx
        └── UnifiedItemList.tsx
```

### Files to Modify (Eventually)

```
src/components/
├── WodScriptVisualizer.tsx        # Migrate to UnifiedItemList
├── history/
│   └── RuntimeHistoryLog.tsx      # Migrate to UnifiedItemList
└── workout/
    └── AnalyticsHistoryPanel.tsx  # Migrate to UnifiedItemList
```

### Shared Dependencies (No Changes Needed)

```
src/views/runtime/
├── FragmentVisualizer.tsx         # Reused as-is
└── fragmentColorMap.ts            # Reused as-is
```

---

## Testing Strategy

### Unit Tests

1. **Adapter Functions**: Test conversion of each data type to `IDisplayItem`
2. **Fragment Generation**: Ensure fragments are correctly generated for all metric types

### Visual Tests (Storybook)

1. Create stories showing same workout in all three contexts
2. Verify visual consistency between Parser, Track, and Analyze views

### Integration Tests

1. End-to-end test parsing → execution → history display
2. Verify data flows correctly through all adapters

---

## Appendix: Existing Utility Functions

### metricsToFragments.ts Functions

```typescript
// Convert RuntimeMetric[] to ICodeFragment[]
export function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[];

// Convert SpanMetrics to ICodeFragment[]
export function spanMetricsToFragments(
  metrics: SpanMetrics,
  label: string,
  type: string
): ICodeFragment[];

// Create fallback fragment from label
export function createLabelFragment(label: string, type: string): ICodeFragment;
```

These existing functions should be leveraged by the new adapter layer.

### fragmentColorMap.ts

```typescript
// Get Tailwind classes for fragment type
export function getFragmentColorClasses(type: string): string;

// Fragment type definitions
export const fragmentColorMap: FragmentColorMap;
```

This remains the single source of truth for fragment styling.
