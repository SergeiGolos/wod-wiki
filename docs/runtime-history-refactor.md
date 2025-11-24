# Runtime History & Debug Panel Refactoring

## Overview
Decoupled the execution history views into separate, reusable components with distinct behaviors for Runtime (Track) and Analytics (Analyze) screens. Also extracted the debug panel into a standalone slide-out component.

## New Components

### 1. RuntimeHistoryPanel (`src/components/workout/RuntimeHistoryPanel.tsx`)
**Purpose**: Live execution history for Track screen

**Key Features**:
- **Newest-first ordering** - Events appear with newest at top, oldest at bottom
- **Growing downward** - History builds as workout progresses
- **Auto-scroll** - Automatically scrolls to newest entries when running
- **Active context highlighting** - Shows which blocks are currently on the stack
- **Read-only** - No selection/filtering, just display
- **Lazy rendering** - Cards written AFTER blocks report themselves

**Usage**:
```tsx
<RuntimeHistoryPanel
  runtime={scriptRuntime}
  activeSegmentIds={activeSegmentIds}
  autoScroll={execution.status === 'running'}
/>
```

---

### 2. AnalyticsHistoryPanel (`src/components/workout/AnalyticsHistoryPanel.tsx`)
**Purpose**: Historical execution view for Analyze screen

**Key Features**:
- **Oldest-first ordering** - Chronological display (oldest → newest)
- **No active context** - All segments are historical/completed
- **Clickable segments** - Segments can be selected for filtering analytics
- **Multi-selection support** - Track selected segments with Set<number>
- **Selection info footer** - Shows count of selected segments

**Usage**:
```tsx
<AnalyticsHistoryPanel
  segments={historicalSegments}
  selectedSegmentIds={selectedIds}
  onSelectSegment={(id) => toggleSelection(id)}
/>
```

---

### 3. RuntimeDebugPanel (`src/components/workout/RuntimeDebugPanel.tsx`)
**Purpose**: Slide-out debug panel for runtime inspection

**Key Features**:
- **Slide-out from right** - 480px panel with backdrop overlay
- **Runtime Stack Panel** - Shows current block stack with highlighting
- **Memory Panel** - Displays allocated memory entries
- **Toggle button** - Standalone button component for enabling debug mode
- **Only visible when needed** - Controlled by `isDebugMode` state
- **Animated transitions** - Smooth slide-in/out with backdrop fade

**Components**:
```tsx
// Main panel
<RuntimeDebugPanel
  runtime={scriptRuntime}
  isOpen={isDebugMode}
  onClose={() => setIsDebugMode(false)}
  highlightedBlockKey={blockKey}
/>

// Toggle button
<DebugButton
  isDebugMode={isDebugMode}
  onClick={() => setIsDebugMode(!isDebugMode)}
/>
```

---

## Updated RuntimeLayout

### State Management
```tsx
const [isDebugMode, setIsDebugMode] = useState(false);

// Active segments computed from runtime stack
const activeSegmentIds = React.useMemo(() => {
  return new Set(runtime.stack.blocks.map(block => hashCode(block.key.toString())));
}, [runtime, execution.stepCount]);
```

### Conditional Rendering
```tsx
{viewMode === 'run' ? (
  <RuntimeHistoryPanel
    runtime={runtime}
    activeSegmentIds={activeSegmentIds}
    autoScroll={execution.status === 'running'}
  />
) : (
  <AnalyticsHistoryPanel
    segments={analyticsSegments}
    selectedSegmentIds={selectedAnalyticsIds}
    onSelectSegment={handleSelectAnalyticsSegment}
  />
)}
```

### Debug Integration
```tsx
// Header button
<DebugButton 
  isDebugMode={isDebugMode}
  onClick={() => setIsDebugMode(!isDebugMode)}
/>

// Slide-out panel
<RuntimeDebugPanel
  runtime={runtime}
  isOpen={isDebugMode && viewMode === 'run'}
  onClose={() => setIsDebugMode(false)}
/>
```

---

## Key Differences: Runtime vs Analytics

| Feature | Runtime Screen | Analytics Screen |
|---------|----------------|------------------|
| **Order** | Newest → Oldest | Oldest → Newest |
| **Context** | Active Context section | No active section |
| **Interaction** | Read-only, highlighting | Clickable, filterable |
| **Purpose** | Real-time tracking | Historical analysis |
| **Auto-scroll** | Yes (to newest) | No |
| **Selection** | Active blocks only | Multi-select support |

---

## Component Reusability

All three components are:
- ✅ **Standalone** - No tight coupling to RuntimeLayout
- ✅ **Type-safe** - Full TypeScript interfaces
- ✅ **Composable** - Can be used in other contexts
- ✅ **Documented** - Clear JSDoc comments
- ✅ **Exported** - Available via `src/components/workout/index.ts`

---

## Migration Notes

### Before
```tsx
<ExecutionLogPanel
  runtime={viewMode === 'run' ? runtime : null}
  historicalSegments={viewMode === 'analyze' ? segments : undefined}
  activeSegmentId={activeId}
/>

{showDebug && (
  <div className="absolute inset-0 z-50">
    <RuntimeStackPanel ... />
    <MemoryPanel ... />
  </div>
)}
```

### After
```tsx
{viewMode === 'run' ? (
  <RuntimeHistoryPanel
    runtime={runtime}
    activeSegmentIds={activeIds}
  />
) : (
  <AnalyticsHistoryPanel
    segments={segments}
    selectedSegmentIds={selectedIds}
    onSelectSegment={onSelect}
  />
)}

<RuntimeDebugPanel
  runtime={runtime}
  isOpen={isDebugMode}
  onClose={() => setIsDebugMode(false)}
/>
```

---

## Testing Checklist

### Runtime Screen
- [ ] History displays newest-first
- [ ] Auto-scrolls when running
- [ ] Highlights active blocks on stack
- [ ] Shows "feeding" connector to Active Context
- [ ] Debug button toggles panel
- [ ] Debug panel slides in from right

### Analytics Screen
- [ ] History displays oldest-first
- [ ] Segments are clickable
- [ ] Multi-selection works correctly
- [ ] Selection count displays in footer
- [ ] No debug button visible
- [ ] No Active Context section

### Debug Panel
- [ ] Slides in/out smoothly
- [ ] Backdrop dims background
- [ ] Shows runtime stack correctly
- [ ] Shows memory entries
- [ ] Close button works
- [ ] Only visible in run mode
- [ ] Stack depth and memory count display

---

## Future Enhancements

1. **RuntimeHistoryPanel**
   - Add "Start Timer" card at beginning
   - Timestamp display for each entry
   - Collapse/expand functionality

2. **AnalyticsHistoryPanel**
   - Segment comparison view
   - Metric aggregation display
   - Export selected segments

3. **RuntimeDebugPanel**
   - Resizable panel width
   - Memory search/filter
   - Stack trace visualization
   - Breakpoint support
